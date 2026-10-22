# Surf loop handoff (2026-10-22, early morning)

## What the loop is
A `/loop` on the Surf landing page (surf.jaybulb.com) and the Surf menu bar app. Each tick: a Jony Ive design pass on both (the apple skill's rules: 8 point grid, one radius set, 48 point capsule controls, SF type scale), a QA walk, screenshots sent to Joshua, then the next tick. It stops when both reach A+ and Joshua says so.

Rules for every tick:
- Never kill the runner or the menu bar app. The runner must stay up, and a kill test already passed today.
- After any edit under `app/App/`, rebuild and relaunch the way `CLAUDE.md` says. Verify exactly one Surf process runs.
- Landing edits go through `web/` and `brand/`. Run `./deploy.sh` to ship; a push deploys nothing.
- No emojis in the UI. No demo accounts in screenshots.
- Stage only the files a tick changed. Another session may be mid-edit.

## Where things stand
- Renamed Cruise to Surf everywhere: folder, repo (nulljosh/surf), app, docs. Kept on the old names on purpose: bundle ids, the Pages project `pwnlingo`, the `X-Pwnlingo-Token` header, storage keys, the Kotlin package and the launchd label.
- The menu bar app installs to `~/Applications/Surf.app`, outside build folders. The launchd agent `com.nulljosh.cruise-status` points there. The runner died on 2026-10-21 because a disk cleanup wiped `app/build`; that is fixed.
- Streak saved at 197. XP is still climbing.
- Licensed Apache 2.0 (LICENSE and NOTICE, crediting Inter under the OFL and Walter Crane). PRIVACY.md and a privacy page at surf.jaybulb.com/privacy.html say plainly that the tunnel makes live runner state public.
- Surf Sans commas are fixed (Inter builds commas from the quote glyph, which turned them into waves). `tools/gen_font.py` has a check now.
- Tagline: "Games and software on autopilot. Duolingo first, more to come." The landing header is icon-only, and the live card reads "Solving Romanian".
- The landing is rebuilt: Hermes-style layout, clrs.cc blue, FEZ-night dark mode, Walter Crane's Neptune's Horses as a halftone, and an engraved footer band of surf things. The live demo works again through the tunnel at surf-status.jaybulb.com.
- New brand: Surf Sans (curly quotes as wave crests, built by `tools/gen_font.py`), a blue surfboard icon (`Surf.icon`), `brand/tokens.css` and `brand/BRAND.md`. README, WHITEPAPER, docs and `architecture.svg` are rewritten and pushed.
- `docs/demo.gif` still shows the old green look.
- `roadmap.md` has 13 open items, all mirrored as GitHub issues in nulljosh/surf. Two are new: the Conveyer merge and the Hermes Sans comma bug.

## Next, in order
1. Planned for 2026-10-23: merge Conveyer (Claude plays Factorio, `~/Documents/Code/conveyer`) into Surf, so Factorio becomes Surf's second autopilot. Not started; the loop does not touch it until Joshua says go.
2. QA the landing and the menu bar app with the Jony Ive pass. Send Joshua screenshots after each pass, and repeat until A+.
3. Real reboot test of the login agent. This restarts the Mac, so get Joshua's yes first. The runner has to come back on its own.
4. Re-record `docs/demo.gif` so it shows the new look. Then rebuild the landing's demo to match.
5. Gift sender and chest opener are still unverified live. Watch `scripts/log.jsonl` for `gift-sent` and `chest-open`. If a chest or a friends quest shows up under another name, fix the selector in `run.mjs`.
6. Open items in `roadmap.md`. The one that matters most is `POST /quit` on port 8737, which does not stop the runner yet.

## Restart prompt

```
/loop QA the Surf landing page (surf.jaybulb.com) and the Surf menu bar app. Do a Jony Ive design pass on both (apple skill: 8 point grid, one radius set, 48 point capsule controls, SF type scale, no emojis). Send Joshua screenshots after each pass. Repeat until both are A+. Never kill the runner or the menu bar app. After any app/App/*.swift edit, rebuild and relaunch per CLAUDE.md and confirm exactly one Surf process. Deploy the landing with ./deploy.sh. Next items after the QA: real reboot test of the login agent (ask Joshua first), re-record docs/demo.gif in the new look, verify gift-sent and chest-open in scripts/log.jsonl.
```
