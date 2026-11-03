# Pikmin 2 (PAL GameCube): all-treasures route research

Research only, 2026-11-02. Read-only web research. Pages were fetched with WebFetch and summarised by a small model, so figures are "as the page states them". Anything not seen on a fetched page is marked UNCONFIRMED. PLAYBOOK.md and RESEARCH-awakening.md were read first; this file adds what they lacked.

Blocked sources: strategywiki.org (HTTP 403), gamefaqs.gamespot.com (HTTP 403), pikmin.fandom.com Dream_Den (HTTP 402), speedrun.com/pikmin2 (403 in the earlier pass). No GameFAQs or Strategy Wiki full walkthrough was read, so there is no verified day-by-day route for days 6 to 20.

## 1. Blue Onion unlock (Awakening Wood)

- The Blue Onion sits behind an electric gate. Fetched text: it "lies behind an electric gate, meaning that Yellow Pikmin from the Perplexing Pool are required to access it." A small pool also blocks the direct route, so Pikmin are thrown onto a nearby ledge to reach the gate. The page adds that "the player can use glitches to bypass that requirement." Source: https://www.pikminwiki.com/Blue_Onion (fetched 2026-11-02)
- Practical chain: Yellow Pikmin come from Perplexing Pool, which is unlocked by the Geographic Projection in Awakening Wood. Then return to Awakening Wood with Yellow to break the electric gate. Source for the Perplexing Pool unlock: https://pikminwiki.com/Perplexing_Pool
- A search snippet (not a fetched page) says a Yellow Pikmin "swarm" of 15 or more is used in Perplexing Pool. Source: https://www.pikminwiki.com/Template:Treasure_collection_guide (fetched; the Yellow-count wording came from the guide text).
- Whether one trip to Perplexing Pool is enough, or whether it needs two visits: UNCONFIRMED.
- The Blue Onion's pool is also recorded as a Blue-carrying water area. Whether the gate needs Blue as well as Yellow: UNCONFIRMED.
- Conflict: the playbook calls the Blue Onion "Yellow is the color for electric hazards". That is consistent with the fetched text. No conflict.

## 2. Route skeleton (partial, most of it UNCONFIRMED)

Hard dependencies seen on fetched pages:
- Spherical Atlas (Emergence Cave, day 1) opens Awakening Wood. Source: https://www.pikminwiki.com/5_day_run (from RESEARCH-awakening.md)
- Geographic Projection (Awakening Wood) opens Perplexing Pool. Earliest glitch-free day for Perplexing Pool is day 4. Source: https://pikminwiki.com/Perplexing_Pool
- Hocotate Freight debt (10,000 Poko) must be fully repaid to open Wistful Wild. Wistful Wild also needs Perplexing Pool unlocked. Source: https://www.pikminwiki.com/Wistful_Wild
- Treasure collection colour hints (Treasure collection guide, not a route): Awakening Wood overground Yellow needed for one treasure; Perplexing Pool overground treasure needs Yellow thrown over a wall to break an electric gate, then Blue carries it. Source: https://www.pikminwiki.com/Template:Treasure_collection_guide

Route the bot can follow now, with each step's colour need (UNCONFIRMED counts unless stated):
1. Awakening Wood, non-Yellow caves first. Hole of Beasts has no gate on the page's entrance data (see RESEARCH-awakening.md). Needs Red for fire geysers (page-level colour advice only). Purple for most enemies. Count: UNCONFIRMED.
2. White Flower Garden: bag must be lowered (200 Pikmin combined weight). Needs White for the poison emitters and at least 12 to 20 Purples at the entrance bag (page conflict). Ivory buds on S3 give White.
3. Bulblax Kingdom: needs an electric gate cleared (Yellow), Red for geysers, Purple for Bulborbs. Page recommends "a considerable amount of Red and Yellow". Count: UNCONFIRMED.
4. Snagret Hole: white bramble gate (48,000 HP). Needs Blue for water on S2 and S6, Yellow for wires on S4, White for poison emitters on S6. Source: https://pikminwiki.com/SH (via RESEARCH-awakening.md).
5. Perplexing Pool (after Geographic Projection, day 4 earliest): Citadel of Spiders first (Purple, Red for geysers, Yellow on S3). Then Glutton's Kitchen (Yellow required at the electric gate, Purple recommended, see section 3).
6. Return to Awakening Wood with Yellow for the Blue Onion electric gate (see section 1).
7. Valley of Repose late caves: Subterranean Complex (Purple preferred, White for buried treasure, see section 3). Frontier Cavern (White heavy, bridge build needed).
8. Pay the Hocotate Freight debt (10,000 Poko) by returning treasure value. Exact trigger UNCONFIRMED.
9. Wistful Wild: Cavern of Chaos, Hole of Heroes, Dream Den (see section 3).

Days 6 to 20 timing, which caves go on which day, and per-day Pikmin counts: UNCONFIRMED. No source read.

Non-glitch order from the earlier search snippet (not fetched): Awakening Wood (White), Perplexing Pool (Yellow), Awakening Wood (Blue). Source: https://www.pikminwiki.com/5_day_run (search snippet only). UNCONFIRMED.

## 3. Caves by area

### Valley of Repose late caves
Source for the table: https://www.pikminwiki.com/Valley_of_Repose

| Cave | Sublevels | Treasures | Gate | Boss | Boss tactic (page) |
|---|---|---|---|---|---|
| Emergence Cave | 2 | 3 | White bramble 48,000 HP | not stated on this page | n/a |
| Subterranean Complex | 9 | 16 | Poison white bramble 42,000 HP, guarded by a Watery Blowhog | Man-at-Legs (S9) | "Rapidly throwing Pikmin at it before it gets up, preferably Purple Pikmin." Invincible while getting up in NPC/Pikmin 2 New Play Control. Source: https://www.pikminwiki.com/Subterranean_Complex |
| Frontier Cavern | 8 | 15 | Bridge must be built over a plateau, guarded by a Withering Blowhog | Empress Bulblax (S8) | "Have one leader clear out all or most of the larvae," then "have the leader you sent out call all the Pikmin and fight the huge Grub-dog." Blue: at least 10 for the Bulbmin. White: "a must" for buried treasure. Source: https://www.pikminwiki.com/Frontier_Cavern |

Conflict: the playbook says the Rush Boots come from a Repugnant Appendage on Frontier Cavern's last floor, guarded by an Empress Bulblax. The fetched Valley of Repose and Frontier Cavern pages do not mention a Repugnant Appendage or Rush Boots. Treat the Rush Boots claim as UNCONFIRMED.

### Perplexing Pool caves
Source for the table: https://pikminwiki.com/Perplexing_Pool and each cave page below.

| Cave | Sublevels | Treasures | Boss | One tactic |
|---|---|---|---|---|
| Citadel of Spiders | 5 | 11 | Beady Long Legs (S5, from playbook, not fetched) | Dismiss squad, run in to trigger it, whistle back. From playbook, not verified here. |
| Glutton's Kitchen | 6 | 14 | Giant Breadbug (S6). Source: https://www.pikminwiki.com/Glutton's_Kitchen | Page gives no boss tactic, only "See also: Giant Breadbug strategy". Purple recommended to fight the Breadbugs. Yellow strictly necessary. |
| Shower Room | 7 | 14 | Ranging Bloyster (S7). Source: https://www.pikminwiki.com/Shower_Room | Page: keep both leaders alive; the boss swaps leaders. Gates on S7 have 300 HP each, some must be torn down. Full tactic on a linked page not fetched. |
| Submerged Castle | 5 | 13 | Waterwraith (S5). Source: https://www.pikminwiki.com/Submerged_Castle | Purple is its only weakness, from Violet Candypop Buds. Smash the gates, use Bulbmin to make Purples, then fight. Page says "Only Blue Pikmin are permitted entry" to the cave. Gate HP given as 100 in one section and 300 in another. |

### Wistful Wild
Source for the overground treasures and caves: https://www.pikminwiki.com/Wistful_Wild

| Cave | Sublevels | Treasures | Boss | One tactic |
|---|---|---|---|---|
| Cavern of Chaos | 10 | 17 | Segmented Crawbster (S10). Silencer treasure inside it. | "It is best to take only Red Pikmin." Ultra-Spicy spray makes it "much, much easier". Source: https://www.pikminwiki.com/Cavern_of_Chaos |
| Hole of Heroes | 15 | 13 | Raging Long Legs (S15). Source: https://www.pikminwiki.com/Hole_of_Heroes | About 40 Pikmin under Ultra-Spicy spray kill it "in one cycle". Attack the head on its second roar. Avoid the feet, use a smaller group. 20 Purples still survive a round. |
| Dream Den | 14 | 21 | Titan Dweevil on the final floor. Source: https://www.pikminwiki.com/Dream_Den | Page does not give a step-by-step tactic (fetch cut off). Louie is on top of it, see section 4. Purple recommended for clearing Bulborbs on S13. |

Overground Wistful Wild: 5 treasures, 3,175 Poko total (Doomsday Apparatus, Seed of Greed, Anti-hiccup Fungus, Armored Nut, Conifer Spire). Source: https://www.pikminwiki.com/Wistful_Wild

Source conflict: the Wistful Wild search snippet said "one source says the Wistful Wild is the only area with no above-ground boss". That conflicts with the Dream Den page. Treat as UNCONFIRMED.

## 4. Rules that matter for a bot

- Field cap: 100 Pikmin. Source: https://www.pikminwiki.com/Limit ("In most situations, this is 100"). Only Pikmin out of the Onion count, and wild Pikmin in discovered areas count too. A Pikmin withdrawal that would go past the cap is refused, and new seeds stay in the Onion once the cap is reached.
- Onions in caves: no Onion access underground. Pikmin cannot be grown inside caves. Source: https://www.pikminwiki.com/Pikmin_2 (fetched)
- Pikmin left on the surface at day end: "any Pikmin left behind are killed" by the night enemies. Source: https://www.pikminwiki.com/Pikmin_2 (fetched). The earlier playbook said the same.
- Buried Pikmin when delving deeper in a cave: "any buried Pikmin will be left behind." Source: https://www.pikminwiki.com/Cave_confirmation_menu (Pikmin 2 text on this page). This is a sublevel-to-sublevel rule, not an entrance rule.
- Time in caves: a search snippet (community wiki, not a fetched page) says time does not pass while you are underground, and that caves cannot be entered during the sunset countdown. The fetched Cave confirmation menu page does not say either. UNCONFIRMED.
- Pikmin left in a cave when you leave: UNCONFIRMED. The fetched text says nothing about it.
- Debt payment (10,000 Poko): the Wistful Wild page says it "is unlocked when Hocotate Freight's debt of Poko x 10000 is fully repaid". Exact trigger (instant on reaching 10,000, or at day end): UNCONFIRMED. If the debt is repaid before the Geographic Projection is collected, Wistful Wild stays closed until the Projection is collected. Source: https://www.pikminwiki.com/Wistful_Wild
- Louie rescue: Louie is left behind after the return trip. The President replaces him as the second captain. He is found "atop the Titan Dweevil" on the final floor of the Dream Den. Once the Titan Dweevil is beaten, Louie "is afterwards collected as a treasure and added to the Treasure Hoard". He does not replace the President after being rescued. Source: https://www.pikminwiki.com/Dream_Den and https://www.pikminwiki.com/Pikmin_2 (story)
- Day limit: none in Pikmin 2. Source: https://www.pikminwiki.com/Pikmin_2 ("unlimited number of days"). A search snippet mentions a "collect all treasures within 9 days" achievement. That is a challenge, not a limit. UNCONFIRMED for PAL.

## 5. Open items for the bot (checked against the game, not the web)
- Confirm Blue Onion gate colours (Yellow alone, or Yellow plus Blue).
- Confirm debt trigger timing.
- Confirm whether caves freeze the clock.
- Confirm the Pikmin left in a cave on exit rule.
- Confirm the Rush Boots source (Repugnant Appendage) against the game.

## Sources
- https://www.pikminwiki.com/Blue_Onion
- https://pikminwiki.com/Perplexing_Pool
- https://www.pikminwiki.com/Valley_of_Repose
- https://www.pikminwiki.com/Subterranean_Complex
- https://www.pikminwiki.com/Frontier_Cavern
- https://www.pikminwiki.com/Glutton's_Kitchen
- https://www.pikminwiki.com/Shower_Room
- https://www.pikminwiki.com/Submerged_Castle
- https://www.pikminwiki.com/Wistful_Wild
- https://www.pikminwiki.com/Cavern_of_Chaos
- https://www.pikminwiki.com/Hole_of_Heroes
- https://www.pikminwiki.com/Dream_Den
- https://www.pikminwiki.com/Limit
- https://www.pikminwiki.com/Pikmin_2
- https://www.pikminwiki.com/Cave_confirmation_menu
- https://www.pikminwiki.com/Template:Treasure_collection_guide
- Not reached: strategywiki Pikmin_2 (403), gamefaqs Pikmin 2 FAQs (403), pikmin.fandom.com Dream_Den (402), speedrun.com/pikmin2 (403)
