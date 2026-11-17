# Sita Haran

A 70-second isometric infographic film about the abduction of Sita (Ramayana, Aranya Kanda),
made entirely in code in the **Isometric Infographic** style of [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar).

- `sita-haran.mp4`: the film (1920×1080, 24 fps, −14 LUFS), subtitles burned in
- `subtitles_en.srt`: the same subtitles as a file · `poster.jpg`
- `TREATMENT.md`: structure, shot list, cue map · `FACTS.md`: sources and choices · `CREDITS`

## Rebuild

The library is expected at `../lemo-opuscar` (clone it there, or set `LIB`):

```sh
git clone https://github.com/lemomo-ai/lemo-opuscar ../lemo-opuscar
(cd ../lemo-opuscar && sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice)
sh build.sh
```

`mux.sh` needs ffmpeg 7+. If your system ffmpeg is older, put a newer one at `bin/ffmpeg`
(for example the static build that ships with `pip install imageio-ffmpeg`); `build.sh` picks it up.

Files: `film.js` (world, characters, camera, overlays, sound events), `engine.js` (the style's engine),
`mix.py` (synthesized score, ambience, foley, voice and ducking), `lines.json` (narration).
