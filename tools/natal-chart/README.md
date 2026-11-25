# Natal chart: data builders

Scripts that make the two data files the InnerVerse Natal Chart page loads beside itself. The page itself and the current `chiron.json` and `cities.json` live in its artifact (the copy of record); job notes are in the project doc `claude/RUN-natal-chart.md`.

- `chiron_out.py`: Chiron longitudes every 10 days from 675-06-01 (Julian) to 2999-12-01, from Swiss Ephemeris (`pip install pyswisseph numpy`; put `seas_06`, `seas_12`, `seas_18`, `seas_24` from github.com/aloistr/swisseph `ephe/` in `./ephe`). Writes `site/chiron.json` and prints the worst interpolation error (about 1.5 arcseconds). Only numbers ship, so the Swiss Ephemeris license does not touch the page.
- `build.js`: birthplaces with a time zone each. `npm i all-the-cities geo-tz`, then `node build.js 1000` (places of 1,000+ people, about 112,000). Writes `cities.json`.

Moved here from the project docs on 2026-11-25.
