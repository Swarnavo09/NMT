# Sita Haran: Treatment

Style: **Isometric Infographic** (`iso-infographic`), Lemo-Opuscar library.
Topic: *Sita Haran*, the abduction of Sita from the Aranya Kanda of the Ramayana.
Brief (defaults, the request named only the style and the topic): English narration
and burned-in subtitles, about 60–70 s, 1920×1080 at 24 fps, offline Kokoro narrator,
original synthesized score, no storyboard stop.

## 1. Three candidate structures

1. **A journey along one route (tracked subject).** Follow Sita, ringed "you are here",
   from the hut at Panchavati through the sky to Lanka, on one long board. Clear, but it
   starts *after* the interesting part (the deception) and only shows a trip.
2. **Two boards compared.** Panchavati before and after, alternating, then side by side.
   Strong ending (the empty hut), but it hides the cause, which is the whole story.
3. **A process explainer of a deception: "three tricks, one line".** The abduction is
   treated as a system diagram: Ravana's plan is a chain of three steps (a decoy, a false
   alarm, a disguise), each one removing one protector from the hut, until only a drawn
   line is left. Then the line is crossed and the route opens south. Isotype counts the
   protectors (3 → 2 → 1 → 0), and the exile calendar (13 of 14 years).

**Chosen: 3.** It is what the medium does best (cause → effect, a system emptying out,
counted with icons), and it gives a real turn: the line on the ground, the infographic's
own furniture, becomes the story's key object. The journey from structure 1 survives as
the second half, and the empty hut of structure 2 is the ending.

- **Opening image**: a question set as isometric type on an empty pale board:
  *HOW WAS SITA TAKEN?* The board grows a forest under it.
- **Ending**: an unanswered station. The camera returns to the hut, empty, a dashed plate
  and a question mark where Sita stood, then pulls out to the whole route with the legend.
- **Score shape**: a kalimba motif for Sita over a soft drone and hand drum, thinning out
  trick by trick; silence at the line; a pulse (woodblock + low drum) for the flight;
  the motif returns alone, unresolved, at the empty hut.

## 2. Logline and arc

A king who cannot defeat two brothers removes them one trick at a time, until a single
drawn line is all that stands between him and Sita, and she steps over it.

- **Setup**: three exiles, one hut, year 13 of 14. Ravana across the sea wants Sita.
- **Turn**: three tricks pull Rama, then Lakshmana away; Sita crosses the line.
- **Ending**: the flight south (Jatayu falls, jewels dropped as a trail), Lanka;
  back at Panchavati the hut is empty. The search begins.

## 3. Benchmark

- *Monument Valley* — learn: true-isometric architecture, three tones per face, a camera
  that never breaks the projection. Don't take: its buildings, characters, palette.
- Kurzgesagt explainers — learn: one question, one visual metaphor per step, a steady
  push forward, numbers made physical. Don't take: characters, music, layouts.
- Isotype (Neurath / Arntz) — learn: identical icons that add up. Don't take: their icons.

## 4. Shot list (one continuous world, one camera; times are targets, locked to voice)

| # | Time | Framing | Camera | What | Why |
|---|---|---|---|---|---|
| 1 | 0–4 | wide, empty board | locked, slight push | Title "HOW WAS SITA TAKEN?" extrudes on the board, forest pops up | hook: the question first |
| 2 | 4–11 | full: hut, river, three exiles | push in | Panchavati: hut, Godavari, Rama (indigo), Lakshmana (violet), Sita (saffron). Pins name them. Isotype calendar: 14 blocks, 13 fill | establish system + time |
| 3 | 11–17 | wide → circular inset | hold + inset | Leader to the south edge, inset opens on Lanka: Ravana, ten heads as ten icons | the antagonist, at a distance, in a frame within the frame |
| 4 | 17–24 | medium | follow | Trick 1, the decoy: a gold deer runs a route line out of the clearing; Rama follows it off-board. Protector count 3 → 2 | cause → effect along a route |
| 5 | 24–30 | medium, cutaway | hold | Trick 2, the false alarm: a sound ring pulses from the woods ("Help!" in Rama's voice). Lakshmana draws the line around the hut, then leaves. Count 2 → 1 | the line is infographic furniture made real |
| 6 | 30–35 | close on the hut | push in | Trick 3, the disguise: a grey mendicant walks up the path to the line. Focus + context: all greys except Sita and the line. Count 1 → 0 | isolate the subject before the turn |
| 7 | 35–38 | close | locked | Silence. Sita steps across the line; the line breaks | the turn, the native move |
| 8 | 38–44 | wide | fast pull-out + follow | The disguise drops (crimson, ten heads); an aerial chariot lifts off with Sita ringed "you are here"; route line draws south | release, the journey begins |
| 9 | 44–48 | medium | follow | Jatayu, the old vulture, meets the chariot, falls with a hatched cut on his wing | a station on the route |
| 10 | 48–53 | medium, inset | follow + inset | Over a hill with monkeys, Sita drops her jewels: five icons fall as a dashed trail | Isotype as a trail |
| 11 | 53–58 | lateral | lateral follow over the sea | Ocean, then Lanka: gold city, ashoka grove; Sita set down under a tree | breath, distance |
| 12 | 58–66 | wide → widest | return + log pull-out | Back at Panchavati: Rama returns to an empty hut, dashed plate, "?" ; pull out over the whole route; legend + title | ending echoes the opening question |

Camera moves used: push, hold + inset, follow along a route, fast log pull-out, lateral
follow, return, scale-reveal pull-out (seven).

## 5. Beat sheet

Locked to the narration once voice lengths are known (lines in `lines.json`); the scene
table in `film.js` is the single source of truth. Each line starts on a beat of the grid.

## 6. Cue map

- Tempo 96 bpm (0.625 s per beat), 4/4. Sections start on bar lines where possible.
- 0–11 *Forest*: drone (low D), kalimba motif (Sita), soft shaker.
- 11–17 *Lanka inset*: low drum, a darker interval (minor second against the drone).
- 17–35 *Three tricks*: marimba ostinato in eighths; one instrument drops out per trick.
- 35–38 *The line*: digital silence; the first sound after is the line breaking.
- 38–53 *Flight*: woodblock + low drum pulse, faster; a falling glide at Jatayu;
  one glockenspiel ping per jewel.
- 53–58 *Sea*: pulse stops, drone + sea bed, marimba sparse.
- 58–66 *Empty hut*: kalimba motif alone, ends on an unresolved note; a single low note
  under the final legend.

## 7. Sound design

| Section | Ambience bed | Foley | Music |
|---|---|---|---|
| Opening / forest | birds, light wind, river | block pops, title thunks | drone + kalimba motif |
| Lanka inset | low wind | ten soft pops (heads) | low drum |
| Trick 1 | forest | deer hooves, rustle | marimba ostinato |
| Trick 2 | forest | distant cry ("ring" pulse), line drawing (scratch) | thinner |
| Trick 3 | forest, quieter | footsteps on path | thinnest |
| The line | silence | the line snapping | none |
| Flight | wind | whoosh, wing flaps, a thud for Jatayu, jewel pings | pulse |
| Sea / Lanka | sea | gentle chime | drone, sparse marimba |
| Empty hut | forest | a single block pop for "?" | kalimba alone |

## 8. Subtitles and titles

- Type: **Jost** (OFL), titles 600 all caps with 0.12 em tracking, numbers 400.
- Subtitle as a map label: pale card, ink border, tiny iso-cube legend chip in the
  speaker's hue, bottom centre, border first then text wipe. Bottom 170 px kept clear.
- English only (one language: the line sits alone, in the upper line's place).
- End frame is the legend: title, the key (hues: Sita, Rama, Lakshmana, Ravana, water,
  forest), "NOT TO SCALE".

## 9. Facts and sources

The film follows the popular telling. The **Lakshmana Rekha** (the protective line) is not
in Valmiki's text; it comes from later retellings and is the version most viewers know.
Notes in `FACTS.md`.
