#!/usr/bin/env bash
# Frames for the deck and the video.
#
# Headless Chrome against the standalone production build, so the pages are
# styled, fast and identical to what is deployed — and at a real 1920x1080
# rather than whatever a preview pane happens to be wide.
#
# Every capture goes through /_seed.html first, which writes the account and
# the example factory into localStorage and then redirects. A separate seeding
# run would not work: headless does not reliably flush localStorage to the
# profile before it exits.
#
#   bash scripts/shoot.sh <out-dir> [port]
set -u

OUT="${1:?usage: shoot.sh <out-dir> [port]}"
PORT="${2:-3100}"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
PROFILE="${TMPDIR:-/tmp}/lastbuy-shots-profile"

mkdir -p "$OUT"
rm -rf "$PROFILE"; mkdir -p "$PROFILE"

# The seed page has to be served from the app's own origin to write its
# localStorage, but it is not part of the app — so it is borrowed for the run
# and taken away again.
SEED_SRC="$(dirname "$0")/seed.html"
cleanup() { rm -f public/_seed.html .next/standalone/public/_seed.html; }
trap cleanup EXIT
mkdir -p public .next/standalone/public
cp "$SEED_SRC" public/_seed.html
cp "$SEED_SRC" .next/standalone/public/_seed.html 2>/dev/null || true

# $1 output name, $2 path to land on, $3 theme, $4 settle time ms
shot() {
  local name="$1" path="$2" theme="${3:-light}" budget="${4:-9000}"
  local url="http://localhost:${PORT}/_seed.html?theme=${theme}&to=$(printf '%s' "$path" | sed 's|/|%2F|g;s|?|%3F|g;s|&|%26|g;s|#|%23|g')"
  "$CHROME" --headless=new --disable-gpu --no-first-run --no-default-browser-check \
    --hide-scrollbars --force-device-scale-factor=1 \
    --user-data-dir="$PROFILE" --window-size=1920,1080 \
    --virtual-time-budget="$budget" \
    --screenshot="${OUT}/${name}.png" "$url" >/dev/null 2>&1
  if [ -f "${OUT}/${name}.png" ]; then
    printf '  %-34s %s\n' "$name" "$(du -k "${OUT}/${name}.png" | cut -f1)KB"
  else
    printf '  %-34s FAILED\n' "$name"
  fi
}

echo "capturing to $OUT"
shot 01-landing-hero            "/"                       light 16000
shot 02-notices-empty           "/notices"                light
shot 03-parts                   "/parts"                  light
shot 04-products                "/products"               light
shot 05-suppliers               "/suppliers"              light
shot 06-certifications          "/certifications"         light
shot 07-approvals               "/approvals"              light
shot 08-bill-of-materials       "/import"                 light
shot 09-ask                     "/ask"                    light
shot 10-sign-in                 "/sign-in"                light

# the two that belong in the dark, for the opening and closing slides
shot 11-landing-hero-dark       "/"                       dark  10000
shot 12-parts-dark              "/parts"                  dark

# Full-page captures. Headless only photographs the viewport, so the window is
# made tall instead — one image of the whole page, which is better source
# material for a video than a stack of guessed scroll positions.
tall() {
  local name="$1" path="$2" theme="${3:-light}" h="${4:-4200}" budget="${5:-11000}"
  local url="http://localhost:${PORT}/_seed.html?theme=${theme}&to=$(printf '%s' "$path" | sed 's|/|%2F|g')"
  "$CHROME" --headless=new --disable-gpu --no-first-run --no-default-browser-check     --hide-scrollbars --force-device-scale-factor=1     --user-data-dir="$PROFILE" --window-size="1920,${h}"     --virtual-time-budget="$budget"     --screenshot="${OUT}/${name}.png" "$url" >/dev/null 2>&1
  if [ -f "${OUT}/${name}.png" ]; then
    printf '  %-34s %s
' "$name" "$(du -k "${OUT}/${name}.png" | cut -f1)KB"
  else
    printf '  %-34s FAILED
' "$name"
  fi
}

echo "the screens that need something to have happened"
shot 13-notice-impact           "/notices/PCN-ADI-2026-4471"  light 12000
shot 14-ask-in-use              "/ask"                        light 11000
shot 15-notice-impact-dark      "/notices/PCN-ADI-2026-4471"  dark  12000

echo "full pages"
tall 20-landing-full            "/"                       light 7600 26000
tall 21-landing-full-dark       "/"                       dark  7600 26000
tall 22-parts-full              "/parts"                  light 3400
tall 23-products-full           "/products"               light 2800
tall 24-certifications-full     "/certifications"         light 2800
tall 25-ask-full                "/ask"                    light 2400 13000
tall 26-bill-of-materials-full  "/import"                 light 2200

echo "done"
