# Intro skip measurement

Measures where talk starts on each episode for the Airtable fields `Intro Skip Seconds` (free video clock) and `Plus Intro Skip Seconds` (members' clock: Vimeo and Plus audio). The site's players start there on first play (`src/js/episode.js`, block `iv-intro-skip`). Used for the 2026-11-18 fill of the 2020 onward catalogue; a new episode is set by hand.

1. `pip install --break-system-packages yt-dlp` (and `faster-whisper` for step 3).
2. `python3 yt_first_speech.py <innerverse-data> yt_results.json` and `python3 vimeo_first_speech.py <innerverse-data> vimeo_results.json` (both resumable).
3. Rows with no caption track: `python3 whisper_first_speech.py targets.json whisper.json` on the first 6 minutes of the free audio.
4. Pick the start with `evaluate.start_v2(ev)`. Value = round(start - 3), written only when start > 20.

Rules: music, the "you are now entering the InnerVerse" bumper and the old narrated opener are intro; real talk in the first 20 s means no skip. Hand override: vibe-rant-22 = 138.
