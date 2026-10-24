"use client";
// A visit's story on its visit page: the text (or "No story yet."), and a
// button that opens a text box right there to write or change it.

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { saveStory } from "@/app/(app)/visits/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCount, STORY_MAX, storyLength } from "@/lib/visit-story";

export function StoryEditor({ visitId, story }: { visitId: number; story: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(story);
  const [error, setError] = useState<string | null>(null);

  /** Open the text box with the saved story in it. */
  function startEditing() {
    setDraft(story);
    setError(null);
    setEditing(true);
  }

  /** The form's action: save on the server, then close the box (or show why not). */
  async function submit(form: FormData) {
    const result = await saveStory(visitId, form);
    if (result.ok) setEditing(false);
    else setError(result.error);
  }

  if (!editing) {
    return (
      <div className="flex flex-col items-start gap-3">
        {story ? (
          // pre-wrap keeps the story's line breaks; break-words wraps very long words.
          <p data-testid="story-text" className="whitespace-pre-wrap break-words">{story}</p>
        ) : (
          <p className="text-muted-foreground">No story yet.</p>
        )}
        <Button variant="outline" onClick={startEditing}>
          {story ? "Edit the story" : "Write the story"}
        </Button>
      </div>
    );
  }

  const length = storyLength(draft);
  return (
    <form action={submit} className="flex flex-col gap-2">
      {/* The section's heading already says "Story"; the label is for screen readers. */}
      <Label htmlFor="story" className="sr-only">
        Story
      </Label>
      <Textarea
        id="story"
        name="story"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={8}
        aria-invalid={error ? true : undefined}
        aria-describedby="story-count"
        autoFocus
      />
      <p id="story-count" className={`text-sm tabular-nums ${length > STORY_MAX ? "text-destructive" : "text-muted-foreground"}`}>
        {formatCount(length)} / {formatCount(STORY_MAX)}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => setEditing(false)}>
          Cancel
        </Button>
        <SaveButton />
      </div>
    </form>
  );
}

/** "Save story", greyed out while it's saving (useFormStatus knows when the form is busy). */
function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      Save story
    </Button>
  );
}
