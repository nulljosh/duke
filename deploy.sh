#!/bin/sh
# Copy the design system and Duke Sans into the landing, then deploy the Pages project (functions/ rides along).
set -e
cd "$(dirname "$0")"
mkdir -p web/fonts
cp brand/tokens.css brand/mark.svg icon.svg web/
cp fonts/*.woff2 fonts/OFL.txt web/fonts/
[ "$1" = "--copy-only" ] && exit 0
npx wrangler pages deploy --project-name=pwnlingo --commit-dirty=true
