#!/usr/bin/env python3
"""For every in-scope (2020+) episode with a YouTube Video URL, find where
speech starts on the VIDEO clock from YouTube's own caption track.

Output: yt_results.json  {slug: {"first": sec|None, "dur": sec, "src": track, "err": str}}
Rerunnable: rows already in the output are skipped.
"""
import glob, json, os, re, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

DATA = sys.argv[1]
OUT = sys.argv[2]
res = json.load(open(OUT)) if os.path.exists(OUT) else {}

def year_of(f):
    y = str(f.get('Year') or '').strip()
    if not y:
        y = str(f.get('Publish Date') or '')[:4]
    return y

rows = []
for p in sorted(glob.glob(os.path.join(DATA, 'episodes', '*.json'))):
    if os.path.basename(p).startswith('_'):
        continue
    f = json.load(open(p)).get('fields', {})
    v = f.get('Video URL') or ''
    if 'youtu' not in v or year_of(f) < '2020':
        continue
    if f.get('Slug') in res and 'ev' in res[f['Slug']]:
        continue
    rows.append((f['Slug'], v))

BRACKET = re.compile(r'^\s*[\[\(].*[\]\)]\s*$')

def words(t):
    return re.findall(r"[A-Za-z']+", t)

def first_speech(events):
    ev = []
    for e in events:
        t = ''.join(s.get('utf8', '') for s in (e.get('segs') or [])).strip()
        if not t or BRACKET.match(t) or len(words(t)) < 1:
            continue
        ev.append((e['tStartMs'] / 1000.0, t))
    # First event that is followed by steady talk: at least 4 more worded
    # events within the next 30 s (filters stray words hallucinated on music).
    for i, (t0, _) in enumerate(ev):
        n = sum(1 for (t, _) in ev[i + 1:i + 12] if t - t0 <= 30)
        if n >= 4:
            return t0, ev[i][1]
    return (ev[0][0], ev[0][1]) if ev else (None, '')

def one(item):
    slug, url = item
    try:
        r = subprocess.run(['yt-dlp', '--extractor-args', 'youtube:player_client=web_embedded',
                            '-J', '--skip-download', '--ignore-no-formats-error', url],
                           capture_output=True, text=True, timeout=90)
        d = json.loads(r.stdout)
    except Exception as e:
        return slug, {'first': None, 'err': 'ytdlp: ' + str(e)[:120]}
    dur = d.get('duration')
    tracks = []
    subs = d.get('subtitles') or {}
    auto = d.get('automatic_captions') or {}
    for src, pool, keys in (('manual', subs, ['en', 'en-US', 'en-GB']), ('auto', auto, ['en-orig', 'en'])):
        for k in keys:
            for t in pool.get(k, []):
                if t.get('ext') == 'json3':
                    tracks.append((src + ':' + k, t['url']))
    if not tracks:
        return slug, {'first': None, 'dur': dur, 'err': 'no captions'}
    # Prefer auto (word-timed to the audio) over manual uploads, which can be offset.
    tracks.sort(key=lambda x: 0 if x[0].startswith('auto') else 1)
    name, u = tracks[0]
    for attempt in range(3):
        c = subprocess.run(['curl', '-sS', u], capture_output=True, text=True, timeout=60)
        try:
            j = json.loads(c.stdout)
            break
        except Exception:
            time.sleep(3 * (attempt + 1))
    else:
        return slug, {'first': None, 'dur': dur, 'err': 'caption fetch failed'}
    evs = []
    for e in (j.get('events') or []):
        t = ''.join(s.get('utf8', '') for s in (e.get('segs') or [])).strip()
        if t and not BRACKET.match(t):
            evs.append([round(e['tStartMs'] / 1000.0, 2), t.replace('\n', ' ')])
        if len(evs) >= 60: break
    t0, txt = first_speech(j.get('events') or [])
    return slug, {'first': t0, 'dur': dur, 'src': name, 'text': txt[:60], 'ev': evs}

print('to do:', len(rows), flush=True)
done = 0
with ThreadPoolExecutor(max_workers=3) as ex:
    for slug, r in ex.map(one, rows):
        res[slug] = r
        done += 1
        if done % 20 == 0:
            json.dump(res, open(OUT, 'w'), indent=0)
            print(done, flush=True)
json.dump(res, open(OUT, 'w'), indent=0)
print('done', done)
