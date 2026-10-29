#!/bin/sh
# Copy the design system and Duke Sans into the landing, then deploy the Pages project (functions/ rides along).
set -e
cd "$(dirname "$0")"
mkdir -p web/fonts
cp brand/tokens.css brand/mark.svg icon.svg web/
cp fonts/*.woff2 fonts/OFL.txt web/fonts/
cp games/pokemon/progress.png web/pokemon.png   # the live Pokemon graph, our own drawing
cp games/pikmin/progress.png web/pikmin.png     # and the Pikmin 2 one
[ "$1" = "--copy-only" ] && exit 0
npx wrangler pages deploy --project-name=pwnlingo --commit-dirty=true
