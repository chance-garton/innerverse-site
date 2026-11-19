"""SUPERSEDED 2026-11-19: Chance rejected this cut-and-paste approach (see project doc
claude/HANDOFF-description-refresh-2026-11-19.md). Kept only as a reference for the
link-classification lists and the old-site link resolver; do not run it to write Acast.

Rewrite Acast episode descriptions: keep episode-specific content, replace the
old support/boilerplate sections with the standard InnerVerse block, strip Rokfin,
keep Patreon/Substack links to specific Plus shows.

Usage: python3 -I rewrite.py <feed-desc.json> <linkmap.json> <out.json>
"""
import json, re, sys, html

SUFFIX = re.compile(r"<hr><p style='color:grey; font-size:0\.75em;'> Hosted on Acast\..*$", re.S)
BLOCK = re.compile(r'<(h[1-6]|p|ul|ol|blockquote|pre)\b[^>]*>.*?</\1>|<hr\s*/?>', re.S)

def text(h):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h))).strip()

# Headings that open a boilerplate section (dropped until the next heading).
BOILER_HEAD = re.compile(r'''^(✦\s*)?(
    support(\s+innerverse.*|\s*&\s*affiliate.*|\s+links:?|\s*:)?$ |
    (💜\s*)?support\s+innerverse.* |
    more\s+ways\s+to\s+support.* |
    telegram(\s+links)?:?$ |
    get\s+tuned:?$ |
    work\s+with\s+(me|chance):?$ |
    services:?$ |
    (innerverse\s+)?affiliates:?$ |
    biofield\s+tuning\s+sessions.* |
    explore\s+innerverse | more\s+innerverse | more\s+inner\s+whirled.* | more\s+astroherbalism |
    continue\s+into\s+innerverse\s+plus.* |
    (join|subscribe\s+to|get)\s+innerverse\s+plus.* |
    subscribe\s+on\s+patreon.* |
    🔒.*extended.* | 🔓.* |
    join\s+(rokfin|patreon).* | extended\s+show\s+on\s+rokfin.* |
    support\s+innerverse\s+on\s+rokfin.* |
    get\s+innerverse\s+plus.* |
    innerverse\s+plus\+?\s+is\s+best.* |
    listen\s+and\s+follow:?$ |
    also\s+available\s+on\s+these\s+platforms:? |
    where\s+to\s+find\s+chance:? |
    join\s+the\s+innerverse\s+tribe.*
)\s*$''', re.I | re.X)

# Headings that open an episode-specific section (kept).
KEEP_HEAD = re.compile(r'''^(✦\s*)?(
    episode\s+links | links:? | links\s+below:? | resource\s+links | related\s+links:? |
    show\s+notes.* | music\s+in\s+this\s+episode | we\s+(talked\s+about|discussed).* |
    guests? | guest\s+links | the\s+panel | panel | major\s+topics | topics.* |
    episode\s+description | description | in\s+this\s+episode | more\s+from\s+.* |
    find\s+.*\s+online | only\s+(in|on)\s+plus\+?.* | video.* | watch\s+video.* |
    call\s+in\s+to\s+vibe\s+rant
)\s*$''', re.I | re.X)

# Lines dropped wherever they appear (old affiliates, socials, dead pages).
DROP_LINE = re.compile(r'''(
    rokfin | t\.me/innerverse | secretenergy | designbyhumans | innerversemerch |
    paypal\.me | cash\s*app | \$chancegarton | altmediaunited | itunes\.apple\.com/us/podcast/innerverse |
    podcasts\.apple\.com/.*innerverse | discord\.com/invite/ECuVMUp | oregon-ite | skool\.com/tradingbusiness |
    clivedecarle | tippecanoeherbs\.com | lotuswei\.com | eagle-research\.com | biofieldtuningstore |
    innerversepodcast\.com/(audiobooks|oracle-cards|sound-healing|biofield-tuning|plus|support)\b |
    tinyurl\.com/(2dhsaras|4sedfdsh|4wyd5ecs|2p9xpdn3|4m7sv4wt) | t\.me/viberantcalls | join\s+this\s+group\s+on\s+telegram |
    circle\.innerversepodcast\.com/app | patreon\.com/innerverse/?(["<\s]|$) | innerverseplus\.com |
    leave\s+a\s+5\s+star | make\s+a\s+donation
)''', re.I | re.X)

PLUS_POST = re.compile(r'https?://(www\.)?(patreon\.com/(?:innerverse/)?posts/[^\s"<]+|[a-z0-9-]+\.substack\.com/p/[^\s"<]+)', re.I)

def strip_rokfin(b):
    b = re.sub(r'<a\b[^>]*rokfin[^>]*>.*?</a>', '', b, flags=re.I | re.S)
    b = re.sub(r'https?://(www\.)?rokfin\.com/\S*?(?=[\s<"]|$)', '', b, flags=re.I)
    b = re.sub(r'\bRokfin\s*(or|&amp;|&|and|/)\s*', '', b, flags=re.I)
    b = re.sub(r'\s*(or|&amp;|&|and|/)\s*Rokfin\b', '', b, flags=re.I)
    b = re.sub(r'\s*\|\s*Rokfin\b|\bRokfin\s*\|\s*', '', b, flags=re.I)
    b = re.sub(r'(\s*[|\-:,]\s*)+(?=</(p|li|h\d)>)', '', b)
    return b

SITE_MAP = {}
SITE_URL = re.compile(r'https?://(?:www\.)?innerversepodcast\.com/[^\s"<]*', re.I)

def fix_site_links(b, own):
    """Resolve old innerversepodcast.com links in one line. Returns the new line, or '' to drop it."""
    urls = [u.rstrip('.,);') for u in SITE_URL.findall(html.unescape(b))]
    if not urls:
        return b
    for u in set(urls):
        new = SITE_MAP.get(u, u if u not in SITE_MAP else None)
        if u in SITE_MAP:
            new = SITE_MAP[u]
        else:
            continue  # current links (block urls etc.) are left as they are
        if new is None or new in own:
            rest = text(re.sub(r'<a\b[^>]*>.*?</a>', '', b.replace(u, ''), flags=re.S))
            rest = re.sub(r'[\s\-:|•–]+', ' ', rest).strip()
            if len(rest) < 60:
                return ''
            b = re.sub(r'<a\b[^>]*href="' + re.escape(u) + r'"[^>]*>.*?</a>', '', b, flags=re.S)
            b = b.replace(u, '')
        else:
            b = b.replace(u, new)
    return b

PITCH = re.compile(r'''(
    ^\s*(🔓|🔒)?\s*(get|join|subscribe|become|sign\s+up)\b.{0,120}(plus\+?|patreon|substack|channel|member) |
    (extended|full)\s+(version|episode).{0,60}(patreon|substack|plus\+?|channel|members?) |
    (2nd|second)\s+(half|hour).{0,80}(patreon|plus\+?|substack) |
    free\s+listeners\s+are\s+only |
    plus\+?\s+extension\s*!?\s*:?\s*$ | explore\s+membership | double\s+your\s+content |
    ^\s*(patreon|substack|youtube)(\s*\|\s*(patreon|substack|youtube))+\s*$ |
    ^\s*(patreon|substack|youtube)\s*:?\s*$
)''', re.I | re.X)

def is_heading(tag, inner):
    t = text(inner)
    if not t or len(t) > 80:
        return False
    if tag.startswith('h'):
        return True
    strong = re.fullmatch(r'\s*(<(strong|b|u|em)>\s*)+.*?(</(strong|b|u|em)>\s*)+', inner, re.S)
    caps = t.upper() == t and re.search(r'[A-Z]{3}', t)
    return bool(strong or caps or BOILER_HEAD.match(t))

def clean_list(block, own=()):
    """Drop <li> items matching DROP_LINE or pointing at dead/own old site pages; return '' if nothing left."""
    tag = re.match(r'<(ul|ol)', block).group(1)
    items = re.findall(r'<li\b[^>]*>.*?</li>', block, re.S)
    keep = []
    for li in items:
        if DROP_LINE.search(li):
            continue
        li = fix_site_links(li, own)
        if li and text(li):
            keep.append(li)
    if not keep:
        return ''
    return f'<{tag}>' + ''.join(keep) + f'</{tag}>'

def a(url):
    return f'<a href="{url}" rel="noopener noreferrer" target="_blank">{url}</a>'

AFFILIATES = [
    ('Tippecanoe Herbs: 10% off with code "innerverse" → ', 'https://tippecanoeherbs.com/'),
    ('The Sonic Slider → ', 'https://biofieldtuningstore.com/collections/the-sonic-slider-collection?ref=innerverse'),
    ('Spirit Whirled audiobooks, narrated by Chance → ', 'https://www.innerversepodcast.com/support#spiritwhirled'),
    ('LotusWei Flower Elixirs → ', 'https://lotuswei.com/innerverse'),
    ('Clive de Carle → ', 'https://clivedecarle.com/?sld=204'),
    ('AquaCure AC50: discount with code "innerverse" → ', 'https://eagle-research.com/product/ac50/'),
]

def block(link, posts, yt=()):
    P = lambda s: f'<p>{s}</p>'
    out = [P('<br>'), P('━━━━━━━━━━━━━━━━━━━━')]
    PITCH = 'InnerVerse Plus+ is best on the InnerVerse website. Unlock the extended episode archive and private member community for only $9/month.'
    if link.get('plus'):
        out += [P('🔓 Hear the full uncut episode on InnerVerse Plus+'), P(a(link['plus']))]
        for u in posts:
            out.append(P(('Also on Substack: ' if 'substack' in u else 'Also on Patreon: ') + a(u)))
        for u in yt:
            out.append(P('Also for YouTube members: ' + a(u)))
        out += [P(PITCH), P('Join Plus+: ' + a('https://www.innerversepodcast.com/plus'))]
    else:
        out += [P('🔓 ' + PITCH), P('Join Plus+: ' + a('https://www.innerversepodcast.com/plus'))]
        for u in posts:
            out.append(P(('Extended episode on Substack: ' if 'substack' in u else 'Extended episode on Patreon: ') + a(u)))
        for u in yt:
            out.append(P('Extended episode for YouTube members: ' + a(u)))
    out += [P('<br>'), P('📱 Listen in the InnerVerse app: ' + a('https://circle.innerversepodcast.com/app/')),
            P('<br>'), P('🌀 Book a Biofield Tuning session with Chance'),
            P(a('https://www.innerversepodcast.com/biofield-tuning')),
            P('<br>'), P('🌿 SUPPORT THE SHOW THROUGH OUR AFFILIATES')]
    out += [P(html.escape(lbl, quote=False) + a(u)) for lbl, u in AFFILIATES]
    out.append(P('<br>'))
    if link.get('free'):
        out.append(P('🌐 Chapters, quotes &amp; more: ' + a(link['free'])))
    else:
        out.append(P('🌐 ' + a('https://www.innerversepodcast.com')))
    out.append(P('━━━━━━━━━━━━━━━━━━━━'))
    return ''.join(out)

def rewrite(desc, link):
    body = SUFFIX.sub('', desc)
    blocks, pos = [], 0
    for m in BLOCK.finditer(body):
        stray = body[pos:m.start()]
        if text(stray):
            blocks.append('<p>' + stray.strip() + '</p>')
        blocks.append(m.group(0)); pos = m.end()
    if text(body[pos:]):
        blocks.append('<p>' + body[pos:].strip() + '</p>')
    # Patreon/Substack post links anywhere (kept in the new block, deduped).
    posts = []
    for u in PLUS_POST.findall(body):
        url = 'https://' + ('www.' if u[0] else '') + u[1]
        url = re.sub(r'[.,);]+$', '', url)
        if url not in posts and not any(url in b for b in []):
            posts.append(url)
    kept, mode, dropped_heads, yt, plus_sec, cluster = [], 'keep', [], [], False, False
    own = {u for u in (link.get('free'), link.get('plus')) if u}
    for b in blocks:
        m = re.match(r'<(h[1-6]|p)\b[^>]*>(.*)</\1>$', b, re.S)
        if m and is_heading(m.group(1), m.group(2)):
            t = text(m.group(2))
            if BOILER_HEAD.match(t):
                mode = 'drop'; dropped_heads.append(t)
                plus_sec = bool(re.search(r'plus|extended|unlock', t, re.I))
                continue
            if KEEP_HEAD.match(t) or not re.search(r'support|plus|patreon|rokfin|telegram', t, re.I):
                mode = 'keep'
        if 'rokfin' in b.lower() and not b.startswith(('<ul', '<ol')):
            nb = strip_rokfin(b)
            if 'rokfin' in nb.lower() or not re.search(r'https?://|[a-z]{4}', text(nb)) or len(text(nb)) < 8:
                continue
            b = nb
        if mode == 'drop':
            # A real prose line ends a boilerplate section.
            ext = [u for u in re.findall(r'href="(https?://[^"]+)"', b)
                   if not DROP_LINE.search(u) and not re.search(r'patreon\.com|substack\.com/p/|youtu', u, re.I)]
            if (b.startswith('<p') or b.startswith('<h')) and not DROP_LINE.search(b) \
                    and (len(text(b)) >= 25 or ext) and not re.search(r'support|patreon|plus\+|subscribe', text(b), re.I):
                mode = 'keep'
            else:
                if plus_sec and b.startswith(('<ul', '<ol', '<p')):
                    for u in re.findall(r'https?://(?:www\.)?(?:youtu\.be/[\w-]+|youtube\.com/(?:watch\?v=|live/)[\w-]+)', b):
                        if u not in yt: yt.append(u)
                continue
        if b.startswith('<hr'):
            continue
        if b.startswith(('<ul', '<ol')):
            b = clean_list(b, own)
            if not b:
                continue
            items = re.findall(r'<li\b[^>]*>(.*?)</li>', b, re.S)
            if items and all(re.search(r'patreon\.com/(innerverse/)?posts|substack\.com/p/|^\s*(youtube|video)\b', text(i), re.I) and len(text(i)) < 120 for i in items) \
                    and re.search(r'patreon|substack', b, re.I):
                for u in re.findall(r'https?://(?:www\.)?(?:youtu\.be/[\w-]+|youtube\.com/(?:watch\?v=|live/)[\w-]+)', b):
                    if u not in yt: yt.append(u)
                continue
        elif DROP_LINE.search(b) and len(text(b)) < 300:
            continue
        else:
            b = fix_site_links(b, own)
            if not b or not text(b):
                continue
            t_b = text(b)
            label = re.match(r'^\s*(patreon|substack|youtube|video)\s*[:\-–]\s*(https?://\S+)\s*$', t_b, re.I)
            if label:
                kind, u = label.group(1).lower(), label.group(2)
                if kind in ('patreon', 'substack') and re.search(r'patreon\.com/(innerverse/)?posts|substack\.com/p/', u):
                    cluster = True
                    continue
                if kind in ('youtube', 'video') and cluster and re.search(r'youtu\.be/|youtube\.com/(watch|live)', u):
                    if u not in yt: yt.append(u)
                    continue
            if len(t_b) < 260 and PITCH.search(t_b) and not ('Extension' in t_b and len(t_b) > 100):
                cluster = True
                for u in re.findall(r'https?://(?:www\.)?(?:youtu\.be/[\w-]+|youtube\.com/(?:watch\?v=|live/)[\w-]+)', b):
                    if u not in yt: yt.append(u)
                continue
            cluster = cluster and len(t_b) < 200
            # a bare post link standing alone right after a pitch line moves into the block too
            if re.fullmatch(r'https?://(www\.)?(patreon\.com/(innerverse/)?posts/\S+|[a-z0-9-]+\.substack\.com/p/\S+)', t_b):
                continue
        kept.append(b)
    # Trim trailing empty paragraphs and orphan headings.
    def empty(b):
        return not text(b) or re.fullmatch(r'<p>(<br>|&nbsp;|\s)*</p>', b)
    while kept and (empty(kept[-1]) or (re.match(r'<(h[1-6]|p)', kept[-1]) and is_heading(re.match(r'<(h[1-6]|p)', kept[-1]).group(1), re.sub(r'^<[^>]+>|</[^>]+>$', '', kept[-1])) and KEEP_HEAD.match(text(kept[-1])) is None and len(text(kept[-1])) < 40 and 'href' not in kept[-1])):
        kept.pop()
    # Drop headings with nothing under them, and collapse runs of blank lines.
    def head_of(b):
        m = re.match(r'<(h[1-6]|p)\b[^>]*>(.*)</\1>$', b, re.S)
        return bool(m and is_heading(m.group(1), m.group(2)) and 'href' not in b)
    tidy = []
    for i, b in enumerate(kept):
        if head_of(b):
            nxt = next((k for k in kept[i + 1:] if not empty(k)), None)
            if nxt is None or head_of(nxt):
                continue
        if empty(b) and tidy and empty(tidy[-1]):
            continue
        tidy.append(b)
    while tidy and empty(tidy[0]):
        tidy.pop(0)
    while tidy and empty(tidy[-1]):
        tidy.pop()
    kept = tidy
    # Posts that still appear in kept text don't need repeating.
    keptjoined = ''.join(kept)
    posts = [u for u in posts if u.split('://', 1)[1] not in keptjoined]
    yt = [u for u in yt if u.split('://', 1)[1] not in keptjoined]
    new = keptjoined + block(link, posts, yt)
    return new, dropped_heads, posts + yt

if __name__ == '__main__':
    if len(sys.argv) > 4:
        SITE_MAP.update(json.load(open(sys.argv[4])))
    feed = json.load(open(sys.argv[1]))
    lm = json.load(open(sys.argv[2]))
    res = []
    for e in feed:
        link = lm.get(e['id'], {})
        new, heads, posts = rewrite(e['desc'], link)
        res.append(dict(id=e['id'], title=e['title'], old=SUFFIX.sub('', e['desc']), new=new,
                        dropped_heads=heads, posts=posts, link=link))
    json.dump(res, open(sys.argv[3], 'w'), indent=1, ensure_ascii=False)
    print(len(res))
