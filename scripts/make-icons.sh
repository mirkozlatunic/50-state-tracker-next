#!/bin/sh
# Makes the site's logo and icons from the supplied badge (docs/brand/logo-source.png),
# with macOS's built-in "sips" image tool. The badge is only cropped and scaled,
# never redrawn. Run from the project folder:  sh scripts/make-icons.sh
set -e

SOURCE=docs/brand/logo-source.png   # the supplied image, 1128 x 1120, kept unchanged
TMP=$(mktemp -d)

# public/logo.png: the square around the round badge (its rope ring is centered
# at about x 555, y 550, about 857 px across), so it can be shown cut to a circle.
sips --cropToHeightWidth 864 864 --cropOffset 118 123 "$SOURCE" --out public/logo.png >/dev/null

# The iPhone and app icons: the whole image, made square with the logo's own
# cream paper color, so they're opaque (iPhones show see-through parts as black).
sips --padToHeightWidth 1128 1128 --padColor FAF2E3 "$SOURCE" --out "$TMP/square.png" >/dev/null 2>&1
for SIZE in 512 192 180; do
  sips --resampleHeightWidth $SIZE $SIZE "$TMP/square.png" --out "public/icons/icon-$SIZE.png" >/dev/null
done

# The browser tab icon: the cropped badge, so it's as big as it can be at 32 px.
sips --resampleHeightWidth 32 32 public/logo.png --out public/icons/favicon-32.png >/dev/null

rm -rf "$TMP"
echo "Made public/logo.png and public/icons/*.png from $SOURCE"
