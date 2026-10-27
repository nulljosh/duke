# Papers, Please

Duke's next game after FEZ. The goal is to finish the 31 days with the family alive, then go after the other endings.

## What we have

- Steam install on the LaCie: `/Volumes/LaCie/Steam/steamapps/common/PapersPlease/PapersPlease.app`, version 1.4.11.
- A Unity IL2CPP build (`GameAssembly.dylib`), universal (arm64 and x86_64). No Mono assemblies, so no quick Harmony mod for state the way FEZ and Game Dev Tycoon have one.
- `~/Library/Application Support/co.3909.PapersPlease/` holds only `settings.sav`. No story save yet, so we start a fresh game in our own slot.

## How Duke will play it

The game is a desk: documents slide in, you compare them against the rule book and the bulletin, and you stamp. Every rule is printed on screen, so it can be read.

1. **Read.** Take a screenshot of the game window, OCR the documents with the Vision tool Duke already uses (`games/fez/ocr`), and parse each one into fields: name, date of birth, sex, issuing city, expiry, ID number, purpose, duration.
2. **Check.** Compare fields across the documents and against the day's rules: the date, the list of issuing cities, entry permits, work passes, the wanted list. A mismatch means an interrogation then a denial; otherwise approve.
3. **Act.** Real mouse drags: open the stamp tray, drag each document onto the counter, stamp, hand it back. Unity reads input only while its window has focus, so the game has to be in front while Duke plays.
4. **Night.** Read the money screen and pay rent, heat and food in order, so the family survives.

## Before the first run

- It needs the game window in front on the Mac. Ask Joshua before launching, then keep exactly one instance and quit it when done.
- Back up `co.3909.PapersPlease/` first, and never touch a save that isn't ours.
