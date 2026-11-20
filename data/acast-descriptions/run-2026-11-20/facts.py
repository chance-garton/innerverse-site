import json,re,os
S='/home/claude/innerverse-site/data/acast-descriptions/'
D='/home/claude/innerverse-data/'
feed=json.load(open(S+'feed-desc-2026-11-19.json'))
lm=json.load(open(S+'linkmap-2026-11-19.json'))
um=json.load(open(S+'site-url-map-2026-11-19.json'))
free={e['slug']:e['url'] for e in json.load(open(D+'episodes-index.json'))['episodes']}
plusidx=json.load(open(D+'plus-index.json'))['episodes']
plusurls={e['url'] for e in plusidx}
plusbyslug={e['slug']:e['url'] for e in plusidx}
out=[];notes=[]
for e in feed:
    i=e['id']; m=lm[i]; s=m['slug']
    if 'Soap Box Hero' in e['title']: notes.append(('skip unpublished',e['title'])); continue
    html=re.split(r'<hr>\s*<p style=',e['desc'])[0]
    f={}
    if s and os.path.exists(D+f'episodes/{s}.json'):
        f=json.load(open(D+f'episodes/{s}.json'))['fields']
    fr=m['free']
    if s in free: fr=free[s]
    elif fr and fr.rsplit('/',1)[-1] in free: pass
    elif fr: notes.append(('free page not in index now',e['title'],fr)); 
    pl=f.get('Direct Plus URL') or m['plus']
    if pl and pl not in plusurls:
        notes.append(('plus url not in plus index',e['title'],pl)); 
    # site links in original
    sitelinks={}
    for u in set(re.findall(r'href="(https?://(?:www\.)?innerversepodcast\.com[^"]*)"',html)):
        key=u.strip().replace(' ','')
        if key.rstrip('/') in ('https://www.innerversepodcast.com','https://innerversepodcast.com','http://www.innerversepodcast.com'): sitelinks[u]='BARE'; continue
        cand=[key,key.rstrip('/'),key.replace('http://','https://'),key.replace('://innerverse','://www.innerverse')]
        hit=next((um[c] for c in cand if c in um),'NOTMAPPED')
        sitelinks[u]=hit
    out.append(dict(id=i,title=e['title'],date=m.get('date'),slug=s,
        shows=f.get('Show Categories',[]),epnum=f.get('Episode Number'),
        free=fr,plus=pl,patreon=f.get('Patreon Post URL'),substack=f.get('Substack Post URL'),
        ytmembers=f.get('YouTube Plus URL'),video=f.get('Video URL'),intro=f.get('Intro Paragraph 1'),
        sitelinks=sitelinks,orig=html))
json.dump(out,open('facts.json','w'),indent=1)
print(len(out))
for n in notes: print(n)
import collections
print(collections.Counter(tuple(x['shows']) for x in out).most_common())
print('no video',sum(not x['video'] for x in out),'no free',sum(not x['free'] for x in out),'plus',sum(bool(x['plus']) for x in out))
nm=[(x['title'],u) for x in out for u,v in x['sitelinks'].items() if v=='NOTMAPPED']
print('unmapped site links',len(nm)); print(nm[:15])
