import html, json, re, sys
A = lambda u: f'<a href="{html.escape(u, quote=True)}">{html.escape(u)}</a>'
GAP = '<p><br></p>'
def P(t): return f'<p>{t}</p>'
def H(t): return f'<h3>✦ {t}</h3>'
def UL(items): return '<ul>' + ''.join(f'<li>{i}</li>' for i in items) + '</ul>'
def L(label, url): return f'{label}: {A(url)}'
RULE = '━━━━━━━━━━━━━━━━━━━━'
PLUSCOPY = 'InnerVerse Plus+ is best on the InnerVerse website. Unlock the extended episode archive and private member community for only $9/month.'
def block(free=None, plus=None, patreon=None, substack=None, ytm=None):
    out = [P(RULE)]
    if plus:
        out += [P('🔓 Hear the full uncut episode on InnerVerse Plus+'), P(A(plus))]
        if patreon: out.append(P(L('Also on Patreon', patreon)))
        if substack: out.append(P(L('Also on Substack', substack)))
        if ytm: out.append(P(L('Also for YouTube members', ytm)))
        out += [P(PLUSCOPY), P(L('Join Plus+', 'https://www.innerversepodcast.com/plus'))]
    else:
        out += [P('🔓 ' + PLUSCOPY), P(L('Join Plus+', 'https://www.innerversepodcast.com/plus'))]
        if patreon: out.append(P(L('Extended episode on Patreon', patreon)))
        if substack: out.append(P(L('Extended episode on Substack', substack)))
    out += [GAP, P('📱 Listen in the InnerVerse app: ' + A('https://circle.innerversepodcast.com/app/')),
            GAP, P('🌀 Book a Biofield Tuning session with Chance'), P(A('https://www.innerversepodcast.com/biofield-tuning')),
            GAP, P('🌿 SUPPORT THE SHOW THROUGH OUR AFFILIATES'),
            P('Tippecanoe Herbs: 10% off with code "innerverse" → ' + A('https://tippecanoeherbs.com/')),
            P('The Sonic Slider → ' + A('https://biofieldtuningstore.com/collections/the-sonic-slider-collection?ref=innerverse')),
            P('Spirit Whirled audiobooks, narrated by Chance → ' + A('https://www.innerversepodcast.com/support#spiritwhirled')),
            P('LotusWei Flower Elixirs → ' + A('https://lotuswei.com/innerverse')),
            P('Clive de Carle → ' + A('https://clivedecarle.com/?sld=204')),
            P('AquaCure AC50: discount with code "innerverse" → ' + A('https://eagle-research.com/product/ac50/')),
            GAP, P('🌐 Chapters, quotes &amp; more: ' + A(free or 'https://www.innerversepodcast.com')), P(RULE)]
    return ''.join(out)
def assemble(prose, topics=None, ext=None, quotes=None, links=None, music=None, **blk):
    parts = [''.join(P(x) for x in prose)]
    if topics: parts.append(H('IN THIS EPISODE') + UL(topics))
    if ext: parts.append(H('IN THE PLUS+ EXTENSION') + (UL(ext) if isinstance(ext, list) else P(ext)))
    if quotes: parts.append(H('QUOTES') + UL(quotes))
    if links: parts.append(H('EPISODE LINKS') + UL([L(a, b) for a, b in links]))
    if music: parts.append(H('MUSIC') + UL([L(a, b) for a, b in music]))
    parts.append(block(**blk))
    return GAP.join(parts)
