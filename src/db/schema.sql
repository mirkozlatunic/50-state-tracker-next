-- Tables for the tracker.
-- "IF NOT EXISTS" means running this file again keeps your existing data.

CREATE TABLE IF NOT EXISTS states (
    id   INTEGER PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,  -- e.g. "CA"
    name TEXT UNIQUE NOT NULL   -- e.g. "California"
);

-- One row per visit. A state can have several; progress counts each state once.
CREATE TABLE IF NOT EXISTS visits (
    id         INTEGER PRIMARY KEY,
    state_id   INTEGER NOT NULL REFERENCES states(id),
    visit_date TEXT NOT NULL,   -- "YYYY-MM-DD"
    note       TEXT NOT NULL DEFAULT '',
    city       TEXT,            -- optional; official spelling from src/lib/data/us_cities.csv
    user_id    TEXT NOT NULL DEFAULT '', -- whose visit it is (their Clerk id)
    story      TEXT NOT NULL DEFAULT ''  -- the longer, optional text on the visit page
);

CREATE TABLE IF NOT EXISTS trips (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    start_date TEXT NOT NULL,   -- "YYYY-MM-DD"
    end_date   TEXT NOT NULL,   -- "YYYY-MM-DD"
    user_id    TEXT NOT NULL DEFAULT '',  -- whose trip it is (their Clerk id)
    -- A backstop for the rule; the app checks it first with a friendly message.
    CHECK (end_date >= start_date)
);

-- A "join table": one row per (trip, state) pair, so one trip can have many
-- states. The PRIMARY KEY on both columns stops the same state being added twice.
CREATE TABLE IF NOT EXISTS trip_states (
    trip_id  INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    state_id INTEGER NOT NULL REFERENCES states(id),
    PRIMARY KEY (trip_id, state_id)
);

-- The cities on a trip. Like trip_states, one row per (trip, city). A city is
-- stored as its name plus its state, e.g. ("Denver", Colorado's id).
CREATE TABLE IF NOT EXISTS trip_cities (
    trip_id  INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    state_id INTEGER NOT NULL REFERENCES states(id),
    city     TEXT NOT NULL,
    PRIMARY KEY (trip_id, state_id, city)
);

-- A visit's photos (slice 18): where the photo and its small preview are in the
-- photo store, whose they are, and their size. Deleting a visit deletes its rows.
CREATE TABLE IF NOT EXISTS visit_photos (
    id         INTEGER PRIMARY KEY,
    visit_id   INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL,
    full_path  TEXT NOT NULL,
    thumb_path TEXT NOT NULL,
    width      INTEGER NOT NULL,
    height     INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS visit_photos_visit ON visit_photos (visit_id);

-- Each person's settings, one row each (slice 19): the highest milestone
-- (10, 25 or 50 states) already celebrated, so it's celebrated only once.
CREATE TABLE IF NOT EXISTS user_settings (
    user_id    TEXT PRIMARY KEY,
    celebrated INTEGER NOT NULL DEFAULT 0
);

-- Signing in is Clerk's job now, so the old wrong-password table goes.
DROP TABLE IF EXISTS login_failures;
