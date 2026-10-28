# Papers, Please: booth rules, days 7 to 31

Source: papersplease.fandom.com, read 2026-10-27. Where the wiki is silent or contradicts itself, this file says so.

Date format: day N is 1982.11.22 plus N. Day 7 is 1982.11.29, day 9 is 1982.12.01, day 31 is 1982.12.23. The audit is 1982.12.24.

## 1. Documents

### Labels and titles
The wiki gives field names and title names, not the exact printed wording. Confirm printed labels from the screen before matching. Known from play (not on the wiki): "Ministry of Labor" (OCR "Minirtry ef Laber"), "HOLDER", "FIELD", "Purpose", "Duration", "Enter by".

Title text on the wiki: "Access Permit", "Identity supplement", "Diplomatic Authorization", "Grant of Asylum", "Certificate of Vaccination", "Work Pass", "Identity card", "Entry permit", "Passport", "Temporary visa slip".

### Checks that need the picture, not text
- Seals: MOA (two valid versions; forgeries differ in shape or wording), MOL hammer (four valid; facing matters), diplomatic (one per country), asylum grant seal. A missing seal is a forgery.
- Photo against the face. Height: lines behind the entrant. Weight: booth scale.
- Physical description against the head. Sex: body scanner (from day 7).
- Fingerprints and thumbprints. Wanted faces (bulletin photos, from day 14). Escalli cipher overlay (day 17).

Text checks: names, numbers, dates, purpose, duration, district, issuing city, vaccines, nationality.

### Document table

| Document | Days | Fields | Deny (or detain) when |
|---|---|---|---|
| Passport | all | name, sex, date of birth, nationality, passport number, issuing city, expiration, photo | name, date of birth or number differs from other papers; photo or sex mismatch; issuing city not in rulebook; expired; country banned that day |
| Access Permit | 27 on | name, passport number, purpose (visit, transit, work, immigrate), duration of stay, expiration, height, weight, description, nationality, MOA seal | name, number, purpose or duration mismatch; expired; forged or missing seal; nationality, height, weight or description mismatch |
| Entry permit | 4 to 26 | name, number, purpose, duration, expiration, MOA seal | same, minus physical fields. From day 27 "no longer accepted": deny |
| Identity supplement | 13 to 26 | height, weight, description, expiration, thumbprint | height, weight or description mismatch; expired. Merged into Access Permit on day 27 |
| Identity card (Arstotzkan) | 4 on, no expiry | name, date of birth, height, weight, photo, district | district not in the rulebook list (Altan, Vescillo, Burnton, Octovalis, Gennistora, Lendiforma, Wozenfield, Fardesto); date of birth, photo, name or height/weight mismatch |
| Work Pass | 6 on | name, field of work, work end date, MOL seal | name differs; forged or missing seal; work end date passed or earlier than the permit's duration |
| Diplomatic Authorization | 8 on | name, number, issuing country, access to Arstotzka, country seal | name or number differs; forged or missing seal; country differs from passport; Arstotzka not in access list |
| Grant of Asylum | 21 on | name, nationality, number, date of birth, height, weight, photo, fingerprints, expiration, MOA seal | forged or missing seal; name (only if prints show no alias); nationality, number, date of birth, photo or prints mismatch; expired |
| Certificate of Vaccination | 26 on | name, number, up to three of eleven vaccines, date | name or number differs; polio not listed; vaccine older than 3 years on the in-game date |
| Temporary visa slip | no passport shown | denial only | approving it costs a citation |

Vaccines: Cholera, Cowpox, Hep-b, HPV, Measles, Polio, Rubella, Tetanus, Tuberc., Typhus, Yel.fev.

Asylum seekers and diplomats carry no entry permit, ID supplement or access permit.

### Stamps and discrepancy rules
- Denial needs DENIED on the passport. From day 18 it also needs REASON FOR DENIAL, or the citation "Denial reason not given" follows. The reason stamp unlocks on first interrogation.
- Protocol is checked when the entrant leaves the booth. A discrepancy present then counts.
- Minor issues (missing paper, wrong duration said aloud) clear by interrogation. Conflicting papers do not.
- Typos: the game can swap one letter inside these groups in district and city names: a e i o u; i u y; p g q; l j; c k; b h. Treat a one-letter swap inside a group as a planted discrepancy. Do not fuzzy match district or city names. If OCR gives a near match, re-read the field.

## 2. Day by day

Scripted entrants are named. Others are random. E = entrant number.

**Day 7 (1982.11.29).** Bulletin: "Search all Kolechians before approving their entry." Scanner installed.
- E1: Kolechian tourist, valid. Scan, approve.
- E4: Arstotzkan with feminine features. Scan clears it. Approve if papers valid.
- E7: Shaddy Safadi. Scan shows contraband. Detain. Bribe of 10 for a green stamp costs a citation.

**Day 8 (1982.11.30).** Bulletin: Kolechian searches stop. Diplomats need passport plus Diplomatic Authorization.
- E1: Kolechian diplomat, valid. Approve.
- E3: Jorji Costava, entry ticket but no permit. Deny (no cost). Approve costs a citation.
- E5: EZIC messenger with the "Corman Drex" card. Let them go.
- E9: Corman Drex. Give him the card. Approve valid papers.

**Day 9 (1982.12.01).** Bulletin: MOI agent compromised.
- E1: Calensk (see money). E4: MOI agent gives two identical document sets. Keep both.
- E7: imposter claiming MOI. Give the FAKE set, take 10 credits. Changes the day 10 headline.
- E9: Corman Drex if ignored on day 8. Give him the EZIC note. He stays until he gets it.

**Day 10 (1982.12.02).** Bulletin: East Grestin authority visits.
- E1: Dimitri, supervisor. Gives plaque and citation count.
- E4: missing passport or permit. Deny, then detain. He refuses to leave. Citation either way.
- E7: EZIC messenger brings the decoder. Accept it.

**Day 11 (1982.12.03).** Bulletin: documents may be forged; check seals. Forgeries start.
- E1: forged entry permit. Deny or detain.
- E2: Jorji Costava, valid. Approve for the Obristan token, no citation.
- E4: Calensk.
- E6: Mikhail Saratov (EZIC), missing permit. Deny for ending 20. Approve is EZIC task 1 plus a citation.
- E9: EZIC messenger, only if Saratov was denied.
- End of day: EZIC gift of 1,000. Burn it (uncheck).

**Day 12 (1982.12.04).** Headlines only.
- M. Vonel (E1, counts as entrant): give him nothing. Giving him the cipher or Drex's coded paper ends the game (ending 3).
- E4: Messof Anegovych, valid. Take his four business cards.
- E8: foreign engineer. Give one card. A third offer to the same engineer costs the Arstotzka token.
- Scripted bomber: the next approved entrant after the engineer. Cannot be avoided. Ends the day.
- End of day: EZIC gift of 2,000 if day 11's was burned.

**Day 13 (1982.12.05).** Bulletin: foreigners must show an ID supplement (until day 26).
- E1: foreigner with ID supplement, valid.
- E6: Filipe Hasse, no ID card. Gives his pennant.
- E7: engineer (card rule as day 12).
- E9: complains about the ID supplement. Papers may be invalid; detain possible.
- If you took an EZIC gift, savings are confiscated at end of day.

**Day 14 (1982.12.06).** Bulletin: top 3 wanted criminals listed. "Check faces against entrants and detain suspects immediately."
- E1: wanted criminal. Detain. E6: second wanted criminal. Detain.
- E3: EZIC messenger if you took a gift. Says Graire is coming.
- E4: engineer.
- E7: Nathan Cykelek, two passports. Detain. Approving costs a citation.
- E9: Stepheni Graire (EZIC), missing document or photo mismatch. Deny for ending 20. Approve for EZIC task 2. If you took a gift, you must approve her or get ending 4.

**Day 15 (1982.12.07).** Bomb.
- E2: terrorist drops a bomb. Calensk (E3) gives steps: remove four screws, cut wires in numeric order, within one minute. Out of order or timeout: death.
- E5: engineer.
- E7: EZIC messenger asks for both coded papers. Hand both over.
- Took a gift and did not admit Graire: Vonel arrests you at the start of day 15 (ending 4).

**Day 16 (1982.12.08).** Bulletin: you control trespassers. Tranquilizer gun unlocked. Guards down to three.
- E1: Calensk, 10 or 15 for bomb parts.
- E4: Kolechian seeking surgery, no papers, offers 10. Approve costs a citation.
- E6: Anegovych. All four cards given: Arstotzka token and 20. Otherwise 5 per card.
- E8: foreign worker. A climber attacks. Tranquilize the attacker.

**Day 17 (1982.12.09).** Sergiu Volda joins as guard.
- E3: EZIC messenger. Cipher to identify an operative.
- E7: journalist, press ID only. Deny with reason, or approve (citation).
- E9: Marie Escalli (EZIC), missing ID card. Overlay the cipher on her passport. Approve for task 3 (citation). Deny for ending 20.

**Day 18 (1982.12.10).** Bulletin: "All denials must be accompanied by a REASON FOR DENIAL stamp."
- E1, E2, E4, E5 and E7 have bad papers until E1 is denied with the reason stamp. E3 and E6 are not affected.
- E3: if the Arskickers pennant hangs on the wall, an Arstotzkan fan. Approve.
- E6: United Federation ex-inspector. Papers valid, may miss the permit.
- E8: climber attack. Tranquilize.
- End of day: buy son's crayon set for 25 (checkbox).

**Day 19 (1982.12.11).** Bulletin: "Deny all travelers from Impor."
- E1: Sergiu (if alive) thanks you. E2: Imporian. Deny.
- E4: Arstotzkan woman who knew your father. Either choice.
- E8: Jorji Costava. Weight mismatch: search, then detain. He offers 10 for a green stamp.

**Day 20 (1982.12.12).** Bulletin: Imporians permitted again.
- Start of day: Dimitri checks decor. Pennant, son's drawing or family photo on the wall gives a 20 fine and a warning. A repeat on day 30 means arrest (ending 11). Remove them before he enters.
- E3: EZIC messenger with a poison packet for Khaled Istom. Do not touch the poison (instant death). Ending 20 path: poison nobody.
- E6: journalist. Deny with reason, or approve (citation).
- E9: Khaled Istom, valid papers. Ending 20: approve. Ending 19: poison (task 4).

**Day 21 (1982.12.13).** Bulletin: "Those seeking asylum must carry a valid GRANT OF ASYLUM." Grant holders need no permit or ID supplement.
- E2: Antegrian whistleblower with a grant. Approve.
- E4: United Federation worker, valid papers, offers 10 for a red stamp. Denial costs a citation and gives him the money.
- E6: Danic Lorun (Republia token). Passport only. Leaves his watch as collateral. Approve and keep the watch.
- E8: motorcycle attack. Tranquilize before the grenade. If missed, Sergiu may die, and the grenade kills you.
- End of day: sister arrested. Adopt the niece for 40 (unchecked by default).

**Day 22 (1982.12.14).** Headlines and wanted list only.
- E4: Filipe Hasse wants his pennant back for 10. E7: Jorji Costava, smuggling. Search, detain.
- E9: Kaevink Caullinski offers 10 for Lorun's watch. Selling it blocks the Republia token.
- Niece adopted: 100 at end of day.

**Day 23 (1982.12.15).** Man in red in line. Sniper rifle unlocked with the silver key.
- E2: EZIC messenger with a note on the man in red and the silver key. "Shoot to kill" ends the game at once.
- E5: watch buyer (if you have Lorun's watch) offers 20. Do not sell if you want the token.
- E6: Lorun wants the watch back and his 10 credits. Return the 10, approve. Republia token.
- E8: EZIC jumper with a grenade. Tranquilize the jumper. The jumper always dies.
- Never shoot the man in red. He must live to pass this point.

**Day 24 (1982.12.16).** Bulletin: confiscate Arstotzkan passports from Altan. Drawer installed.
- E1 and E6: Altan Arstotzkans. Take the passport, give a seizure slip, approve or deny. Refusal leads to detain.
- E4: EZIC messenger: the man in red survives.
- E8: Jorji Costava, on the wanted list. Deny with reason (no citation).

**Day 25 (1982.12.17).** Bulletin: deny all United Federation entrants.
- E1: Sergiu (if alive) asks you to admit Elisa Katsenja tomorrow. Gives her locket.
- E2: United Federation citizen. Deny.
- E5: love note giver. Approve, and keep the note.
- E7: depressed Kolechian, 25 percent bad papers. Give him the note for the Kolechia token.
- E8: Altan Arstotzkan. Confiscate.
- E9: Shae Piersovska, Diplomatic Authorization missing Arstotzka. Deny without detain. Detain gives ending 12.

**Day 26 (1982.12.18).** Bulletin: all entrants need a Certificate of Vaccination with polio.
- E3: Elisa Katsenja, Kolechian passport only. Admit for Sergiu (citation; 100 on day 27 if he lives).
- E4: no vaccine certificate. Deny.
- E7: Altan Arstotzkan. Confiscate.
- E8: motorcycles and a climber. Shoot the lower attacker first, which usually takes both. Tranquilizer has three darts; sniper has two bullets.

**Day 27 (1982.12.19).** Bulletin: Access Permit replaces entry permit and ID supplement.
- E3: EZIC messenger: confiscate the Kolechian diplomat's passport.
- E5: Altan Arstotzkan. Confiscate.
- E7: Kordon Kallo, Kolechian diplomat. Ending 19: approve, confiscate, hand to the agent. Ending 20: deny (citation); the agent never appears.
- E9: EZIC agent with no papers asks for Kallo's passport (only if you did not deny Kallo). Give it; he returns it for a green stamp.

**Day 28 (1982.12.20).** Bulletin: confiscate all Arstotzkan passports, no exceptions. Do not confiscate foreign passports.
- E1: Lendiforma Arstotzkan. Confiscate. E5: Arstotzkan with a Get Big Town flyer. Confiscate.
- E3: obsolete entry permit and ID supplement. Deny with reason.
- E7: motorcycle attack kills a guard. Stop the attacker before the booth. Do not shoot guards (endings 7 and 8).

**Day 29 (1982.12.21).** Bulletin: audit notice. Do not leave your region.
- M. Vonel (E1): give him nothing.
- E2 and E6: Obri. Confiscate only for escape (citation).
- E3: Jorji Costava, valid. Gives the Obristan ad: one Obri passport and 25 per family member. Costs a citation whatever you do.
- E8: vengeful father with a photo of daughter Julia. Asks you to confiscate Simon Wens's passport (he arrives day 30).

**Day 30 (1982.12.22).** Dimitri inspects decor again.
- E2: Obri. Confiscate only for escape.
- E3: Simon Wens, wanted, valid papers. Deny with reason or detain blocks the UF token. For the token: confiscate his passport, approve (citation).
- E5: family photo comment. Approve.
- E7: vengeful father. Give him Wens's passport and approve for the UF token. Return his daughter's photo.
- E9: Obri immigrant without access permit. Deny (approve costs a citation).

**Day 31 (1982.12.23).** End event.
- E1 and E7: Obri. Confiscate only for escape.
- E2: EZIC messenger "Hold your fire" if 4 or 5 tasks are done. Otherwise a normal entrant.
- E5: Jorji Costava pays 40 and leaves.
- E8: EZIC van and agents attack.

### EZIC: the two good endings

Ending 19 needs 4 of 5 tasks. Ending 20 needs 0. They cannot both happen.

| Task | Day | Ending 20 (0 tasks) | Ending 19 (4 or 5 tasks) |
|---|---|---|---|
| Saratov | 11 | deny | approve |
| Graire | 14 | deny | approve |
| Escalli | 17 | deny | approve |
| Istom poisoned | 20 | approve, no poison | poison |
| Kallo passport to agent | 27 | deny Kallo | approve, confiscate, hand to agent |

Shared rules:
- Burn both gifts (days 11 and 12) for ending 20. Accepting a gift forces Graire's approval.
- Never give Vonel anything (days 12 and 29). Never shoot or tranquilize the man in red.
- Ending 20, day 31: keep the wall intact. Shoot the lower agent first, then the upper one before it places the charge. Do not escape. Result: audit passed.
- Ending 19, day 31: hold fire and let the wall fall. Do not escape. Result: EZIC hires you.
- Escape to Obristan (days 29 to 31) gives ending 16 (some family left) or 18 (all escape). It needs one Obri passport and 25 per living family member.

### Other endings

| Ending | Trigger |
|---|---|
| 1 Debt | cannot pay end-of-day bills |
| 2 Family dies | all family dead |
| 3 Arrested | cipher or coded paper given to Vonel, day 12 |
| 4 Bribery | accepted gift on day 11 or 12, did not admit Graire on day 14 |
| 5, 6 | shot or tranquilized an innocent in line (day 23 or later) |
| 7, 8 | shot or tranquilized a guard |
| 9, 10 | shot or tranquilized the man in red |
| 11 | decor found again on day 30 after the day 20 warning |
| 12 | detained Shae Piersovska, day 25 |

Instant death: touching the poison, bomb wires cut out of order or timed out, an attacker reaching the booth.

## 3. Money

### Income and costs
| Item | Amount | Notes |
|---|---|---|
| Salary | 5 per entrant processed with no citation | flat all game; after 6pm unpaid |
| Citation penalty | first 2 each day free, then 5, 5, 10, 15, 20... | |
| Rent | 20 (class 8), 25 after the step-up | wiki gives day 5 in one place, day 4 in the end-of-day log; check the screen |
| Heat | 10 (class 8, 7), 5 (class 6), 0 (class 5) | optional |
| Food | 5 per living family member, not counting you | optional; adopted niece adds 5 |
| Medicine | 5 per sick member | optional; needed to avoid death |
| Apartment upgrade | 100 each (class 7, 6, 5); rent 30, 40, 50 | downgrade refunds 75, 150 or 225 |
| Booth upgrade | 5 | day 5, then 3 days apart |
| Son's gift | 25 | day 18 |
| Niece adoption | 40 | day 21 |
| Obristan escape | 25 per living member, plus Obri passports | days 29 to 31 |

Family: wife, son, mother-in-law, uncle, and niece if adopted.

### Credit events
| Day | Source | Credits |
|---|---|---|
| 9 | Calensk deal: 5 per 2 detained, paid from day 11 | variable |
| 9 | MOI imposter, for the fake set | +10 |
| 11 | EZIC gift (burn to refuse) | +1,000 |
| 11 | Calensk | 5, or 10 on day 13 if 4+ detained |
| 12 | EZIC gift, if day 11's burned | +2,000 |
| 12 | Anegovych cards | 5 each, or 20 plus token on day 16 |
| 13 | Calensk | 5 or up to 10 |
| 16 | Calensk | 10 for 1 to 3 detained, 15 for 4+ |
| 16 | Kolechian surgery bribe | +10 (citation) |
| 17 | EZIC gift if Escalli admitted | +20 |
| 19 | Jorji bribe | +10 (citation) |
| 20 | EZIC gift if Istom poisoned | +20 |
| 20 | Hanging fine | -20 |
| 21 | UF worker bribe (denied) | +10 (citation) |
| 22 | Sister's savings, if niece adopted | +100 |
| 22 | Hasse pennant | +10 |
| 22 | Caullinski, for the watch | +10 |
| 23 | Watch buyer | +20 |
| 27 | Elisa's gift (admitted day 26, Sergiu lives) | +100 |
| 27 | EZIC gift if Kallo task done | +20 |
| 31 | Jorji | +40 |

Calensk pays 5 per 2 detained, capped at 30 per delivery, every other day from day 18 and on days 30 and 31. Wiki sources differ on exact days; check the screen.

Combat bonus: 10 for firing during a terror attack, 20 for killing every attacker in it.

### Conflicts to check
- Rent step: day 4 or day 5.
- Lorun's watch: the day 21 page says detaining him that day auto-sells it for 10. The end-of-day log says the sale happens on day 22.
