#!/usr/bin/env python3
"""Render and check one or more episode specs.  usage: check.py <acast_id> [...]   (or 'all')"""
import json, re, sys, html, os
from html.parser import HTMLParser
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import P, H, UL, A, GAP, block, E
R = os.path.dirname(os.path.abspath(__file__))
def fn(i): return re.sub(r'[^\w.-]', '_', i)
FACTS = {x['id']: x for x in json.load(open(f'{R}/facts.json'))}
LIMIT = 3750
BANNED = re.compile(r'rokfin|bitchute|brandnewtube|brand new tube|t\.me/|\btelegram\b|paypal|\bcash\s*app\b|\$chancegarton|secretenergy|secret energy|designbyhumans|innerversemerch|altmediaunited|alt media united|itunes\.apple\.com/us/podcast/innerverse|id1066918535|discord\.(com|gg)|ositracker|tinyurl\.com|skool\.com|innerverseplus\.com|/sound-healing|/oracle-cards|/audiobooks|/season-\d|innerversepodcast\.com/blog/|patreon\.com/innerverse/?$|leave a 5 star|hosted on acast', re.I)
BOILER_URL = re.compile(r'''rokfin|bitchute|brandnewtube|t\.me/|paypal|cash\.app|secretenergy|designbyhumans|innerversemerch|altmediaunited|itunes\.apple\.com/us/podcast/innerverse|id1066918535|discord\.(com|gg)|ositracker|clivedecarle|tippecanoeherbs|rmdycollective|lotuswei|eagle-research|biofieldtuningstore|oregon-ite|skool\.com|tinyurl\.com|innerverseplus\.com|circle\.innerversepodcast\.com|patreon\.com/innerverse/?$|patreon\.com/innerverse\?|patreon\.com/join|substack\.com/?$|substack\.com/subscribe|amazon\.com/.*innerverse|acast\.com|spotify\.com/show|youtube\.com/(c/|@|user/)?innerverse|rumble\.com/c/innerverse|instagram\.com/innerverse|facebook\.com/innerverse|twitter\.com/innerverse|odysee\.com/@innerverse|apple\.co''', re.I)
def norm(u):
    u = html.unescape(u).strip().rstrip('/.,);')
    u = re.sub(r'^https?://(www\.|m\.)?', '', u, flags=re.I)
    m = re.match(r'(?:youtu\.be/|youtube\.com/(?:watch\?v=|live/|shorts/|embed/))([\w-]{11})', u)
    if m: return 'yt:' + m.group(1)
    m = re.match(r'patreon\.com/(?:innerverse/)?posts/(?:[\w-]*?-)?(\d+)', u)
    if m: return 'patreon:' + m.group(1)
    u = re.sub(r'[?&](s|si|feature|ref_src|utm_\w+)=[^&]*', '', u)
    return u.lower().rstrip('/?')
def links_in(h): return re.findall(r'href="([^"]+)"', h)
class V(HTMLParser):
    OK = {'p','br','h3','ul','li','a','strong','em'}
    def __init__(s): super().__init__(); s.st=[]; s.err=[]
    def handle_starttag(s,t,a):
        if t not in s.OK: s.err.append('tag '+t)
        if t!='br': s.st.append(t)
    def handle_endtag(s,t):
        if not s.st or s.st[-1]!=t: s.err.append('unbalanced '+t)
        else: s.st.pop()
def render(spec, f):
    parts = [''.join(P(E(x)) for x in spec['prose'])]
    if spec.get('topics'): parts.append(H('IN THIS EPISODE') + UL([E(x) for x in spec['topics']]))
    ext = spec.get('ext')
    if ext: parts.append(H('IN THE PLUS+ EXTENSION') + (UL([E(x) for x in ext]) if isinstance(ext, list) else P(E(ext))))
    if spec.get('quotes'): parts.append(H('QUOTES') + UL([E(x) for x in spec['quotes']]))
    if spec.get('links'): parts.append(H('EPISODE LINKS') + UL([f'{E(a)}: {A(b)}' for a, b in spec['links']]))
    if spec.get('music'): parts.append(H('MUSIC') + UL([f'{E(a)}: {A(b)}' for a, b in spec['music']]))
    parts.append(block(free=f['free'], plus=f['plus'], patreon=spec.get('patreon'), substack=spec.get('substack'), ytm=spec.get('ytmembers')))
    return GAP.join(parts)
def check(i):
    f = FACTS[i]; errs = []
    try: spec = json.load(open(f'{R}/specs/{fn(i)}.json'))
    except Exception as ex: return None, [f'cannot read spec: {ex}']
    if not spec.get('prose'): errs.append('prose is empty')
    out = render(spec, f)
    v = V(); v.feed(out)
    if v.err or v.st: errs.append('html: ' + ', '.join(v.err + v.st)[:200])
    if '—' in out or '–' in out: errs.append('em or en dash present')
    vis = html.unescape(re.sub(r'<[^>]+>', ' ', out))
    for m in BANNED.finditer(out): errs.append(f'banned text: {m.group(0)!r}')
    if len(out) > LIMIT: errs.append(f'too long: {len(out)} > {LIMIT} (trim the episode text: quotes, then lists, then prose)')
    newn = {norm(u) for u in links_in(out)}
    dropped = {norm(u): r for u, r in spec.get('dropped', [])}
    sitel = {k: v for k, v in f['sitelinks'].items()}
    for u in dict.fromkeys(links_in(f['orig']) + re.findall(r'(?<!href=")(https?://[^\s"<]+)', re.sub(r'<a [^>]*>', '', f['orig']))):
        n = norm(u)
        if n in newn or n in dropped: continue
        if u in sitel or 'innerversepodcast.com' in u:
            tgt = sitel.get(u)
            if tgt and tgt not in ('BARE', 'NOTMAPPED') and '/episodes/' in tgt and tgt != f['free'] and norm(tgt) not in newn:
                errs.append(f'old site link to another episode must be kept with its new address {tgt}')
            continue
        if BOILER_URL.search(html.unescape(u)): continue
        errs.append(f'original link missing (keep it, or list it in "dropped" with a reason): {u}')
    if f['video'] and norm(f['video']) not in newn: errs.append(f'free video missing: {f["video"]}')
    if spec.get('links') and f['video'] and norm(spec['links'][0][1]) != norm(f['video']): errs.append('first episode link must be Watch on YouTube with the free video')
    for k in ('patreon', 'substack', 'ytmembers'):
        fk = {'ytmembers': 'ytmembers'}.get(k, k)
        if f.get(fk) and not spec.get(k): errs.append(f'{k} known for this episode but not in spec: {f[fk]}')
    for n in [norm(u) for u in links_in(out)]:
        if out.count('') and list(norm(u) for u in links_in(out)).count(n) > 1 and not n.startswith('innerversepodcast.com'):
            errs.append(f'duplicate link: {n}'); break
    open(f'{R}/out/{fn(i)}.html', 'w').write(out)
    return len(out), errs
if __name__ == '__main__':
    ids = list(FACTS) if sys.argv[1:] == ['all'] else sys.argv[1:]
    bad = 0
    for i in ids:
        if sys.argv[1:] == ['all'] and not os.path.exists(f'{R}/specs/{fn(i)}.json'): continue
        n, errs = check(i)
        print(('OK  ' if not errs else 'FAIL') + f' {i} {n}')
        for e in errs: print('   - ' + e)
        bad += bool(errs)
    sys.exit(1 if bad else 0)
