"""Read-only HTTP checks for the approved deployment. No third-party analytics."""
from __future__ import annotations
import json
import os
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = 'https://shipping-cost-optimizer-xiaoqiu3000.onrender.com'
OUT = Path('seo-check-results')
OUT.mkdir(exist_ok=True)
CONFIG = json.loads(Path('site.config.json').read_text())
VERSION = CONFIG['version']
CHECKS = []
PAGES = ['', 'packaging-optimizer', 'dim-weight-calculator', 'chargeable-weight-calculator', 'cbm-calculator', 'shipping-guide', 'about', 'privacy', 'feedback']

def fetch(route):
    request = Request(BASE + route, headers={'User-Agent':'ShippingCostOptimizer-SEOCheck/0.3'})
    with urlopen(request, timeout=20) as response:
        if response.status != 200 or not response.url.startswith(BASE + '/'):
            raise AssertionError(f'Unexpected response: {response.status} {response.url}')
        return response.read().decode('utf-8'), dict(response.headers)

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.canonicals=[]; self.metadata={}; self.headings=0; self.links=[]
    def handle_starttag(self, tag, attributes):
        a=dict(attributes)
        if tag=='link' and a.get('rel')=='canonical': self.canonicals.append(a.get('href'))
        if tag=='meta': self.metadata[a.get('name',a.get('property',''))]=a.get('content','')
        if tag=='h1': self.headings+=1
        if tag=='a': self.links.append(a.get('href',''))

def check(name, fn):
    # A transient connection failure must reproduce before it becomes a failed check.
    for attempt in range(2):
        try:
            details=fn(); CHECKS.append({'name':name,'passed':True,'detail':details});print('PASS',name,flush=True);return
        except Exception as exc:
            error=str(exc)
            if attempt==0: time.sleep(2)
    CHECKS.append({'name':name,'passed':False,'error':error});print('FAIL',name,error,flush=True)

def release_ready():
    # On a push, Render can lag behind the CI checkout. Wait without triggering redeploys.
    for attempt in range(12):
        try:
            data=json.loads(fetch('/release.json')[0])
            if data.get('version')==VERSION: return data
            message=f'Expected {VERSION}, received {data.get("version")}'
        except Exception as exc: message=str(exc)
        if attempt<11: time.sleep(15)
    raise AssertionError('Release not visible after bounded wait: '+message)

def verify_page(route):
    text,headers=fetch('/'+route+'/' if route else '/')
    parser=Page();parser.feed(text)
    expected=BASE+('/'+route+'/' if route and route!='packaging-optimizer' else '/')
    assert parser.canonicals==[expected], parser.canonicals
    assert parser.metadata.get('app-version')==VERSION
    assert parser.metadata.get('og:url')==expected
    assert parser.metadata.get('description')
    assert parser.headings==1
    assert 'noindex' not in parser.metadata.get('robots','')
    assert 'noindex' not in {k.lower():v for k,v in headers.items()}.get('x-robots-tag','').lower()
    assert all('/'+x+'/' in parser.links for x in ['about','privacy','feedback','shipping-guide'])
    assert '@@' not in text
    return {'http':200,'canonical':expected,'version':VERSION}

def sitemap():
    text,_=fetch('/sitemap.xml'); root=ET.fromstring(text)
    urls=[x.text for x in root.findall('{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    expected={BASE+('/'+x+'/' if x else '/') for x in PAGES if x!='packaging-optimizer'}
    assert len(urls)==len(set(urls))==8
    assert set(urls)==expected, urls
    return urls

def robots():
    text,_=fetch('/robots.txt');assert 'Sitemap: '+BASE+'/sitemap.xml' in text;assert 'Allow: /' in text;return text

def styles():
    text,_=fetch('/site.css');assert text==Path('dist/site.css').read_text();return 'Deployed CSS matches this build.'

def privacy():
    text,_=fetch('/privacy/');assert 'analytics scripts' in text and 'public' in text
    manifest=json.loads(fetch('/release.json')[0]);assert manifest['trackingEnabled'] is False and manifest['checkoutEnabled'] is False
    return 'No analytics or checkout has been enabled.'

def missing():
    try: fetch('/seo-check-nonexistent-page-684151/')
    except HTTPError as exc:
        assert exc.code==404, exc.code;return {'http':404}
    raise AssertionError('Unknown path returned 200 (soft 404).')

check('Release is deployed',release_ready)
for route in PAGES: check('Canonical and metadata /'+route,lambda route=route:verify_page(route))
check('Sitemap has eight canonical URLs',sitemap)
check('robots.txt advertises sitemap',robots)
check('Deployed support stylesheet matches build',styles)
check('Privacy and monetization status',privacy)
check('Unknown path returns genuine 404',missing)
# Inspect the new informational pages in a real browser as well as their HTTP source.
try:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch()
        for name,width in [('desktop',1440),('mobile',390)]:
            context=browser.new_context(viewport={'width':width,'height':900},is_mobile=name=='mobile',has_touch=name=='mobile')
            page=context.new_page(); errors=[]
            page.on('pageerror',lambda error: errors.append(str(error)))
            def article(route):
                response=page.goto(BASE+'/'+route+'/',wait_until='networkidle',timeout=45000)
                assert response and response.status==200
                assert page.locator('h1').count()==1
                dimensions=page.evaluate('({width:innerWidth,content:document.documentElement.scrollWidth})')
                assert dimensions['content']<=dimensions['width']+1, dimensions
                if route in ['shipping-guide','feedback']:
                    page.screenshot(path=str(OUT/(route+'-'+name+'.png')),full_page=True)
                return dimensions
            for route in ['shipping-guide','about','privacy','feedback']:
                check(name+' article layout '+route,lambda route=route:article(route))
            check(name+' information pages have no script errors',lambda: {'errors':errors} if not errors else (_ for _ in ()).throw(AssertionError(str(errors))))
            context.close()
        browser.close()
except Exception as exc:
    CHECKS.append({'name':'Information page browser execution','passed':False,'error':str(exc)})

summary={'url':BASE,'version':VERSION,'checked_at_utc':datetime.now(timezone.utc).isoformat(),'source_commit':os.getenv('GITHUB_SHA'),'scope':'Read-only external HTTPS SEO and release checks','passed':sum(c['passed'] for c in CHECKS),'failed':sum(not c['passed'] for c in CHECKS),'checks':CHECKS}
(OUT/'results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print('SEO_CHECK_SUMMARY='+json.dumps(summary),flush=True)
if os.getenv('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as file:
        file.write(f"## SEO release {VERSION}\n{summary['passed']} passed; {summary['failed']} failed.\n")
sys.exit(1 if summary['failed'] else 0)
