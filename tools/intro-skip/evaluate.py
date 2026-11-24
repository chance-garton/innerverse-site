"""Pick where talk starts from a list of [seconds, text] caption events.

Use start_v2(ev) (since 2026-11-19): drops the old narrated intro, then a cold
open with real talk in the first 20 s means no skip, otherwise the first line
after which talk carries on 45 s with no gap over 12 s.
Value written = round(start - 3), only when start > 20.
"""
import json, re, sys

JUNK = {'foreign', 'thank', 'thanks', 'you', 'yeah', 'yes', 'oh', 'uh', 'um', 'hmm', 'mm', 'la', 'na',
        'ah', 'hey', 'ooh', 'whoa', 'wow', 'huh'}

def words(t): return re.findall(r"[A-Za-z']+", t)

def is_junk(t):
    if re.fullmatch(r'\s*[\[\(].*[\]\)]\s*', t): return True
    w = [x.lower() for x in words(t)]
    real = [x for x in w if x not in JUNK and len(x) > 1]
    return len(real) == 0

def sustained(ev, span=45, gap=8):
    """First line after which talk carries on for `span` s with no silence
    longer than `gap` s (a sung or narrated bumper line does not)."""
    ev = [(t, x) for t, x in ev if not is_junk(x)]
    for i, (t0, x) in enumerate(ev):
        prev = t0; ok = False
        for t, _ in ev[i + 1:]:
            if t - prev > gap: break
            prev = t
            if t - t0 >= span: ok = True; break
        if ok: return t0, x
    return None, ''

BUMPER = re.compile(r"welcome you|now entering|welcome to the (inner|inter|uni|in|inn)\s?(verse|averse)|illusion", re.I)

def cold_open(ev, before=20, need=15, gap=6):
    """Real talk in the first `before` s (a cold open or an episode that just
    starts): at least `need` words in a run with no gap over `gap` s."""
    ev = [(t, x) for t, x in ev if not is_junk(x) and not BUMPER.search(x)]
    for i, (t0, x) in enumerate(ev):
        if t0 >= before: break
        n = len(words(x)); prev = t0
        for t, y in ev[i + 1:]:
            if t - prev > gap: break
            prev = t; n += len(words(y))
        if n >= need: return t0, x
    return None, ''

def speech_start(ev):
    b = cold_open(ev)
    if b[0] is not None: return b
    return sustained(ev)

def clean(x):
    return re.sub(r'\[[^\]]*\]|>>', ' ', x).strip()

def dense(ev, window=45, need=35):
    """Conservative: the first line after which at least `need` words are
    spoken within `window` s. Prefers starting early over skipping talk."""
    ev = [(t, clean(x)) for t, x in ev]
    ev = [(t, x) for t, x in ev if x and not is_junk(x) and not BUMPER.search(x)]
    for i, (t0, x) in enumerate(ev):
        n = sum(len(words(y)) for t, y in ev[i:] if t - t0 < window)
        if n >= need: return t0, x
    return None, ''

# 2026-11-19, Chance: the narrated opener ("There's a universe inside each of
# us. The InnerVerse Podcast is your portal to that infinite realm of ideas...
# our lives.") is the OLD INTRO, the same every time: treat it as intro.
SIG = re.compile(r"universe inside each|your portal to|portal to that infinite", re.I)
NARR = re.compile(r"universe inside each|portal|infinite realm|realm of ideas|be your host as|and i.ll be your host|serve up|inspirational|sound waves|brightest minds|highest vibes|keep searching|empowering perspectives|greatest masterpiece|masterpiece|our lives", re.I)

def drop_old_intro(ev):
    if not any(t < 40 and SIG.search(x) for t, x in ev):
        return ev
    ends = [t for t, x in ev if t < 33 and re.search(r"masterpiece|our lives|lives\.", x, re.I)]
    if ends:  # drop everything up to the narration's last line
        cut = max(ends)
        return [(t, x) for t, x in ev if t > cut]
    return [(t, x) for t, x in ev if not (t < 40 and NARR.search(x))]

def start_v2(ev):
    ev = [(t, clean(x)) for t, x in ev]; ev = [(t, x) for t, x in ev if x]
    ev = drop_old_intro(ev)
    b = cold_open(ev)
    if b[0] is not None: return b
    return sustained(ev, span=45, gap=12)

# Hand override kept: vibe-rant-22 = 138 (talk starts at 141 s; memes read over music fooled the rule).

if __name__ == '__main__':
    # python3 evaluate.py results.json slug [slug ...]
    d = json.load(open(sys.argv[1]))
    for k in sys.argv[2:]:
        v = d[k]; print(k, v.get('first'), '->', start_v2(v.get('ev', [])))
