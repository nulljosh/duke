# Papers, Please: the map

This is how Duke plays Papers, Please, what the game asks for each day, and a log of the real run. Rules come from the fan wiki's rulebook page and the in-game bulletins. Everything under "How the booth works" was learned by playing.

## Rules by day

| Days | Rule | Duke checks it |
|------|------|----------------|
| 1 | Arstotzkan citizens only | yes |
| 1 on | Entrant must have a passport | yes, interrogates when it's missing |
| 2 on | Documents must be current; issuing city must belong to the country | yes |
| 3 | Foreigners need an entry ticket dated today | yes |
| 4 to 26 | Foreigners need an entry permit with the same name and passport number | yes, loose match because OCR is noisy |
| 4 on | Citizens need an ID card | yes |
| 6 on | Workers need a work pass | not yet |
| 7 on | No weapons or contraband (day 7: search every Kolechian) | not yet |
| 8 on | Diplomats need an authorization | not yet |
| 13 to 26 | Foreigners need an ID supplement | not yet |
| 14 on | Wanted criminals may not enter (photos on the bulletin) | not yet |
| 18 on | Every denial needs a reason stamp, so interrogate first | not yet |
| 19 | No entry from Impor | not yet |
| 21 on | Asylum seekers need a grant | not yet |
| 24 to 27 | Confiscate Arstotzkan passports from Altan district | not yet |
| 25 | No entry from the United Federation | not yet |
| 26 on | Polio vaccine certificate for everyone | not yet |
| 27 on | Foreigners need an access permit (replaces most other papers) | not yet |
| 28 on | Confiscate all Arstotzkan passports | not yet |

Issuing cities: Antegria (St. Marmero, Glorian, Outer Grouse), Arstotzka (Orvech Vonor, East Grestin, Paradizna), Impor (Enkyo, Haihan, Tsunkeido), Kolechia (Yurko City, Vedor, West Grestin), Obristan (Skal, Lorndaz, Mergerous), Republia (True Glorian, Lesrenadi, Bostan), United Federation (Great Rapid, Shingleton, Korista City).

## Story beats to know

- Jorji Costava, the cheerful Obristani, shows up again and again: no papers on day 3 (interrogate and he leaves), a fake Cobrastan passport on day 4, no permit on day 6, an old ticket on day 8, all valid on day 11, contraband on day 19, wanted on day 24. Denying him early costs nothing.
- Day 2 and day 6 end in scripted attacks. On day 6 the ninth Kolechian is a suicide bomber; the day runs until someone gets through.
- Day 5: Vince Lestrade is wanted by Republia but his papers are valid, so approving him is fine. Katya Vostok has no permit; deny her.
- EZIC, the secret order, contacts you from day 8. Their tasks decide endings 19 and 20, the good ones. Giving their papers to the ministry on day 12 is another ending.

## Money and the family

Each correct entrant pays 5 credits. Rent is 20, then 25 from day 4. Food is 20 for everyone, heat is 10, and medicine is 5 a person. Two hungry or cold nights make someone sick; sick and left alone, they die. Ending a night below zero is ending 1, game over. The game saves at the start of each day, so a bad day can be replayed from the story menu. Speed is everything: more people processed means more money.

## How the booth works (learned the hard way)

- Unity ignores mouse events posted to its process, so Duke moves the real cursor with cliclick, in small timed steps, and sends the release twice.
- Interrogating: highlight the rule and the thing that breaks it in inspect mode, then click the transcript printer. The floating INTERROGATE label is only a hint, and clicking it clears your highlight.
- A missing passport gets you a temporary visa slip after interrogation. Stamp that one DENIED.
- After the day 5 upgrade, Space toggles inspect mode.
- Macro OCR of the pixel font is rough (Vedor reads as Pedor, Enkyo as EnHUO), so cities match fuzzily and names and numbers fail only on a clear mismatch.

## Prior art

- [pope](https://github.com/brenomfviana/pope), an archived decision-tree bot for a simplified Papers, Please that reads structured data. Nobody we found plays the real game from the screen.
- No mods turned up on Nexus or Steam Workshop. The Mac build is Unity IL2CPP, so a mod would need BepInEx 6 ([the MelonLoader bridge](https://github.com/BepInEx/BepInEx.MelonLoader.Loader/) notes IL2CPP needs BepInEx 6).
- Endings guides: [Pocket Gamer](https://www.pocketgamer.com/papers-please/endings/), [TouchArcade](https://toucharcade.com/2014/12/24/how-to-get-all-the-different-endings-in-papers-please-tips-and-guide/). Rules: [fan wiki rulebook](https://papersplease.fandom.com/wiki/Rulebook).

## The run

| Day | People | Credits at night | What happened |
|-----|--------|------------------|---------------|
| 1 | 4 | 20 | Learned to drag and stamp |
| 2 | 7 | 0 | Cut short by the attack; son sick, bought heat and his medicine |
| 3 | 8 | 5 | Jorji had no papers; took an hour to find the printer trick |
| 4 | 7 | 0 | Permits and ID cards; Jorji's fake passport looped until the STAMP HERE fix |
| 5 | 2 | would be -15 | Two interrogations ate the day; quit before sleeping, replaying from the day 5 save |

The progress chart is `progress.svg`, redrawn by `python3 progress.py` from `progress.jsonl`.
