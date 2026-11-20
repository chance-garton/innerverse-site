#!/usr/bin/env python3
"""Print everything a writer needs for one or more episodes.  usage: show.py <acast_id> [...]"""
import json, sys, os
R = os.path.dirname(os.path.abspath(__file__))
F = {x['id']: x for x in json.load(open(f'{R}/facts.json'))}
for i in sys.argv[1:]:
    f = F[i]
    print('=' * 100)
    print('ID:', i); print('TITLE:', f['title']); print('DATE:', f['date'], '| SHOWS:', f['shows'], '| EP#:', f['epnum'])
    print('FREE PAGE (block bottom line, automatic):', f['free']); print('PLUS PAGE (block, automatic):', f['plus'])
    print('KNOWN PATREON POST:', f['patreon']); print('KNOWN SUBSTACK POST:', f['substack']); print('KNOWN YOUTUBE MEMBERS VIDEO:', f['ytmembers'])
    print('FREE YOUTUBE VIDEO (first episode link):', f['video'])
    print('SITE INTRO (use only if the old text has no description):', f['intro'])
    if f['sitelinks']:
        print('OLD SITE LINKS IN THE ORIGINAL -> what they mean now:')
        for u, v in f['sitelinks'].items():
            why = 'this episode\'s own page: drop (the block links it)' if v == f['free'] else ('bare domain: drop' if v == 'BARE' else ('dead: drop' if v is None else ('boilerplate page: drop' if '/episodes/' not in str(v) else 'ANOTHER EPISODE: keep the line, use ' + str(v))))
            print('   ', u, '->', why)
    print('ORIGINAL HTML:'); print(f['orig'])
