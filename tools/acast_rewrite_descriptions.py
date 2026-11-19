"""Rewrite Acast episode descriptions: keep episode-specific content, replace the
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
    support(\s+innerverse.*|\s*&\s*affiliate.*|\s*:)?$ |
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
    tinyurl\.com/(2dhsaras|4sedfdsh) | patreon\.com/innerverse/?(["<\s]|$) | innerverseplus\.com |
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

def is_heading(tag, inner):
    t = text(inner)
    if not t or len(t) > 80:
        return False
    if tag.startswith('h'):
        return True
    strong = re.fullmatch(r'\s*(<(strong|b|u|em)>\s*)+.*?(</(strong|b|u|em)>\s*)+', inner, re.S)
    caps = t.upper() == t and re.search(r'[A-Z]{3}', t)
    return bool(strong or caps or BOILER_HEAD.match(t))

def clean_list(block):
    """Drop <li> items matching DROP_LINE; return '' if nothing left."""
    tag = re.match(r'<(ul|ol)', block).group(1)
    items = re.findall(r'<li\b[^>]*>.*?</li>', block, re.S)
    keep = [li for li in items if not DROP_LINE.search(li)]
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
    if link.get('plus'):
        out += [P('🔓 Hear the full uncut episode on InnerVerse Plus+'), P(a(link['plus']))]
        for u in posts:
            out.append(P(('Also on Substack: ' if 'substack' in u else 'Also on Patreon: ') + a(u)))
        for u in yt:
            out.append(P('Also for YouTube members: ' + a(u)))
        out.append(P('Join Plus+: ' + a('https://www.innerversepodcast.com/plus')))
    else:
        out.append(P('🔓 Join InnerVerse Plus+: ' + a('https://www.innerversepodcast.com/plus')))
        for u in posts:
            out.append(P(('Full episode on Substack: ' if 'substack' in u else 'Full episode on Patreon: ') + a(u)))
        for u in yt:
            out.append(P('Full episode for YouTube members: ' + a(u)))
    out += [P('<br>'), P('🌀 Book a Biofield Tuning session with Chance'),
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
    kept, mode, dropped_heads, yt, plus_sec = [], 'keep', [], [], False
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
            b = clean_list(b)
            if not b:
                continue
        elif DROP_LINE.search(b) and len(text(b)) < 300:
            continue
        elif re.fullmatch(r'https?://(www\.)?innerversepodcast\.com/(season-\d+|blog|episodes)/\S+', text(b)):
            continue
        kept.append(b)
    # Trim trailing empty paragraphs and orphan headings.
    def empty(b):
        return not text(b) or re.fullmatch(r'<p>(<br>|&nbsp;|\s)*</p>', b)
    while kept and (empty(kept[-1]) or (re.match(r'<(h[1-6]|p)', kept[-1]) and is_heading(re.match(r'<(h[1-6]|p)', kept[-1]).group(1), re.sub(r'^<[^>]+>|</[^>]+>$', '', kept[-1])) and KEEP_HEAD.match(text(kept[-1])) is None and len(text(kept[-1])) < 40 and 'href' not in kept[-1])):
        kept.pop()
    # Posts that still appear in kept text don't need repeating.
    keptjoined = ''.join(kept)
    posts = [u for u in posts if u.split('://', 1)[1] not in keptjoined]
    yt = [u for u in yt if u.split('://', 1)[1] not in keptjoined]
    new = keptjoined + block(link, posts, yt)
    return new, dropped_heads, posts + yt

if __name__ == '__main__':
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
