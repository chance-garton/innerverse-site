#!/usr/bin/env python3
"""Members' clock: where speech starts on each /plus Vimeo upload, from
Vimeo's own auto-caption track (read through the embed page with the site as
referer, exactly as a member's browser would).

The members' Vimeo links are not in the public episode files (2026-11-25), so
they are read from Airtable by record id: set AIRTABLE_TOKEN. The episode files
still give the slug and year.

Output: vimeo_results.json {slug: {"first": sec|None, "src":..., "text":..., "err":...}}
"""
import glob, json, os, re, subprocess, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

DATA, OUT = sys.argv[1], sys.argv[2]
res = json.load(open(OUT)) if os.path.exists(OUT) else {}
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36'

def year_of(f):
    y = str(f.get('Year') or '').strip()
    return y or str(f.get('Publish Date') or '')[:4]

def plus_video_links():
    tok = os.environ.get('AIRTABLE_TOKEN', '').strip()
    if not tok:
        sys.exit('Set AIRTABLE_TOKEN: the members\' video links are read from Airtable.')
    out, offset = {}, None
    while True:
        q = {'pageSize': '100', 'returnFieldsByFieldId': 'true', 'fields[]': 'fldc2niCZSekUFcmF'}
        if offset:
            q['offset'] = offset
        req = urllib.request.Request('https://api.airtable.com/v0/appg1ujebSIw7TyFW/tbl8lZF3m1yZZ1hcQ?'
                                     + urllib.parse.urlencode(q), headers={'Authorization': 'Bearer ' + tok})
        d = json.load(urllib.request.urlopen(req, timeout=60))
        for r in d.get('records', []):
            u = (r.get('fields') or {}).get('fldc2niCZSekUFcmF')
            if u:
                out[r['id']] = u
        offset = d.get('offset')
        if not offset:
            return out

links = plus_video_links()
rows = []
for p in sorted(glob.glob(os.path.join(DATA, 'episodes', '*.json'))):
    if os.path.basename(p).startswith('_'):
        continue
    d = json.load(open(p))
    f = d.get('fields', {})
    u = links.get(d.get('recordId'), '')
    m = re.search(r'vimeo\.com/(?:video/)?(\d+)(?:/([0-9a-f]{6,}))?', u)
    if not m or year_of(f) < '2020':
        continue
    if f['Slug'] in res and 'ev' in res[f['Slug']]:
        continue
    h = m.group(2) or (re.search(r'[?&]h=([0-9a-f]+)', u) or [None, None])[1]
    rows.append((f['Slug'], m.group(1), h))

def ts(s):
    p = s.split(':')
    return sum(float(x) * 60 ** i for i, x in enumerate(reversed(p)))

def first_speech(vtt):
    cues = []
    for m in re.finditer(r'(\d[\d:.]+)\s+-->\s+[\d:.]+[^\n]*\n(.+?)(?:\n\n|\Z)', vtt, re.S):
        t = m.group(2).strip()
        if re.fullmatch(r'[\[\(].*[\]\)]', t) or not re.search(r"[A-Za-z]", t):
            continue
        cues.append((ts(m.group(1)), t))
    for i, (t0, txt) in enumerate(cues):
        if sum(1 for (t, _) in cues[i + 1:i + 10] if t - t0 <= 30) >= 3:
            return t0, txt
    return (cues[0] if cues else (None, ''))

def one(item):
    slug, vid, h = item
    url = 'https://player.vimeo.com/video/' + vid + ('?h=' + h if h else '')
    r = subprocess.run(['curl', '-sS', '-A', UA, '-H', 'Referer: https://innerversepodcast.com/', url],
                       capture_output=True, text=True, timeout=60)
    m = re.search(r'"text_tracks":(\[[^\]]*\])', r.stdout)
    dur = re.search(r'"duration":(\d+)', r.stdout)
    dur = int(dur.group(1)) if dur else None
    if not m:
        return slug, {'first': None, 'dur': dur, 'err': 'no text_tracks (page ' + str(len(r.stdout)) + ' bytes)'}
    tracks = json.loads(m.group(1))
    if not tracks:
        return slug, {'first': None, 'dur': dur, 'err': 'no captions'}
    tracks.sort(key=lambda t: 0 if t.get('lang', '').startswith('en') else 1)
    v = subprocess.run(['curl', '-sS', tracks[0]['url']], capture_output=True, text=True, timeout=60).stdout
    t0, txt = first_speech(v)
    evs = [[round(ts(m.group(1)), 2), m.group(2).strip().replace('\n', ' ')] for m in re.finditer(r'(\d[\d:.]+)\s+-->\s+[\d:.]+[^\n]*\n(.+?)(?:\n\n|\Z)', v, re.S)][:60]
    return slug, {'first': t0, 'dur': dur, 'src': tracks[0].get('lang'), 'text': txt[:60], 'ev': evs}

print('to do:', len(rows), flush=True)
with ThreadPoolExecutor(max_workers=4) as ex:
    for i, (slug, r) in enumerate(ex.map(one, rows), 1):
        res[slug] = r
        if i % 25 == 0:
            json.dump(res, open(OUT, 'w'), indent=0); print(i, flush=True)
json.dump(res, open(OUT, 'w'), indent=0)
print('done')
