"""Read-only acceptance tests against the explicitly approved public deployment.

Run with Python 3.10+ and playwright==1.57.0 (Chromium installed).
No account, secret, payment, customer data, or remote mutation is used.
Mobile coverage is Chromium with a narrow/touch viewport, NOT real iOS Safari.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

from playwright.sync_api import sync_playwright

BASE = 'https://shipping-cost-optimizer-xiaoqiu3000.onrender.com'
OUT = Path('live-check-results')
OUT.mkdir(exist_ok=True)
RESULTS: list[dict] = []
ADVISORIES: list[str] = []
PAGES = [('/', 'pack'), ('/packaging-optimizer/', 'pack'),
         ('/dim-weight-calculator/', 'dim'),
         ('/chargeable-weight-calculator/', 'charge'), ('/cbm-calculator/', 'cbm')]


def check(name, fn):
    try:
        detail = fn()
        item = {'name': name, 'passed': True, 'detail': detail}
    except Exception as exc:
        item = {'name': name, 'passed': False, 'error': str(exc)}
    RESULTS.append(item)
    print(('PASS ' if item['passed'] else 'FAIL ') + name + ': ' + str(item.get('detail', item.get('error', ''))), flush=True)


def get(path):
    req = Request(BASE + path, headers={'User-Agent': 'ShippingCostOptimizer-AcceptanceTest/1.0'})
    with urlopen(req, timeout=35) as response:
        assert response.status == 200, f'HTTP {response.status}'
        assert response.url.startswith(BASE + '/'), f'Unexpected redirect to {response.url}'
        return response.read(), dict(response.headers)


class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = None
        self.noindex = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical = attrs.get('href')
        if tag == 'meta' and attrs.get('name') == 'robots':
            self.noindex = 'noindex' in attrs.get('content', '').lower()


def http_page(path, tool):
    body, headers = get(path)
    text = body.decode('utf-8')
    assert 'Shipping Cost Optimizer' in text
    assert f'data-tool="{tool}"' in text
    head = Head()
    head.feed(text)
    assert not head.noindex, 'Page has noindex'
    assert 'noindex' not in str({k.lower():v for k,v in headers.items()}.get('x-robots-tag', '')).lower()
    if not head.canonical:
        ADVISORIES.append(f'{path}: canonical URL missing; configure SITE_URL before search submission.')
    return {'http_status': 200, 'bytes': len(body), 'canonical': head.canonical}


def asset(name):
    body, _ = get('/' + name)
    reference = Path('public', name).read_bytes()
    assert body == reference, 'Published asset differs from the checked-out source.'
    return {'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()}


def robots():
    body, _ = get('/robots.txt')
    text = body.decode('utf-8')
    assert 'Allow: /' in text
    if 'Sitemap:' not in text:
        ADVISORIES.append('robots.txt does not advertise a sitemap. SEO setup is incomplete.')
    return text


def navigate(page, path):
    response = page.goto(BASE + path, wait_until='networkidle', timeout=45000)
    assert response and response.status == 200
    page.locator('#calculator button[type="submit"]').wait_for()


def submit(page):
    page.locator('#calculator button[type="submit"]').click()
    page.locator('#result-big').wait_for()
    return page.locator('#result-big').inner_text()


def basic(page, path, tool):
    navigate(page, path)
    expected = {'pack': '25% less', 'dim': '4.8 kg', 'charge': '4.8 kg', 'cbm': '0.24 m³'}[tool]
    value = submit(page)
    assert value == expected, f'{value!r} != {expected!r}'
    dims = page.evaluate('({width: innerWidth, content: document.documentElement.scrollWidth})')
    assert dims['content'] <= dims['width'] + 1, f'Horizontal overflow: {dims}'
    assert not page.locator('#copy').is_disabled()
    assert not page.locator('#download').is_disabled()
    assert not page.locator('#error').inner_text().strip()
    return {'result': value, 'viewport': dims}


def imperial(page):
    navigate(page, '/dim-weight-calculator/')
    page.locator('#units').select_option('imperial')
    assert page.locator('#divisor').input_value() == '139'
    for key in ['box0', 'box1', 'box2']:
        page.locator('#' + key).fill('12')
    value = submit(page)
    assert value == '12.432 lb', value
    assert 'reset' in page.locator('#unit-note').inner_text()
    return value


def charge_rounding(page):
    navigate(page, '/chargeable-weight-calculator/')
    page.locator('#increment').select_option('0.5')
    value = submit(page)
    assert value == '5 kg', value
    return value


def no_saving(page):
    navigate(page, '/packaging-optimizer/')
    page.locator('#actual').fill('10')
    value = submit(page)
    assert value == 'No change', value
    return value


def cost_increase(page):
    navigate(page, '/packaging-optimizer/')
    page.locator('#new2').fill('25')
    value = submit(page)
    assert value == '25% more', value
    return value


def increment_no_saving(page):
    navigate(page, '/packaging-optimizer/')
    page.locator('#new2').fill('19')
    page.locator('#increment').select_option('1')
    value = submit(page)
    assert value == 'No change', value
    return value


def monthly_cost(page):
    navigate(page, '/packaging-optimizer/')
    page.locator('details.cost summary').click()
    page.locator('#rate').fill('6.5')
    page.locator('#shipments').fill('800')
    submit(page)
    metrics = page.locator('#metrics').inner_text()
    assert '$6,240.00' in metrics, metrics
    return '4.8 to 3.6 kg; 800 shipments; 6.5 per kg; linear reduction $6,240.00'


def invalid_divisor(page):
    navigate(page, '/dim-weight-calculator/')
    submit(page)
    page.locator('#divisor').fill('0')
    assert not page.locator('#divisor').evaluate('(e) => e.checkValidity()')
    page.locator('#calculator button[type="submit"]').click()
    assert page.locator('#result-big').count() == 0
    assert page.locator('#copy').is_disabled()
    return 'Zero divisor rejected; stale result and export cleared.'


def fractional_cartons(page):
    navigate(page, '/cbm-calculator/')
    page.locator('#count').fill('1.5')
    assert not page.locator('#count').evaluate('(e) => e.checkValidity()')
    page.locator('#calculator button[type="submit"]').click()
    assert page.locator('#result-big').count() == 0
    return 'Fractional carton count rejected.'


def download(page):
    navigate(page, '/')
    submit(page)
    with page.expect_download() as event:
        page.locator('#download').click()
    item = event.value
    assert item.suggested_filename == 'shipping-comparison.txt'
    item.save_as(str(OUT / 'sample-live-report.txt'))
    text = (OUT / 'sample-live-report.txt').read_text()
    assert '25% less' in text and 'Inputs and assumptions' in text
    return {'filename': item.suggested_filename, 'bytes': len(text.encode())}


def clipboard(page):
    navigate(page, '/')
    submit(page)
    page.locator('#copy').click()
    page.wait_for_function("document.getElementById('export-status').textContent.length > 0")
    status = page.locator('#export-status').inner_text()
    assert status == 'Report copied.', status
    text = page.evaluate('navigator.clipboard.readText()')
    assert '25% less' in text
    return status


def screenshot(page, name):
    navigate(page, '/')
    submit(page)
    page.screenshot(path=str(OUT / (name + '.png')), full_page=True)
    return name + '.png'


for path, tool in PAGES:
    check('HTTPS ' + path, lambda p=path, t=tool: http_page(p, t))
for name in ['style.css', 'calculations.js', 'app.js']:
    check('Published source matches ' + name, lambda n=name: asset(n))
check('robots.txt', robots)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, viewport, mobile in [('desktop', {'width': 1440, 'height': 1000}, False),
                                       ('mobile', {'width': 390, 'height': 844}, True)]:
            context = browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile,
                                          accept_downloads=True, permissions=['clipboard-read', 'clipboard-write'])
            page = context.new_page()
            page.set_default_timeout(10000)
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            for path, tool in PAGES:
                check(name + ' calculation and layout ' + path, lambda pth=path, t=tool: basic(page, pth, t))
            check(name + ' screenshot', lambda: screenshot(page, name))
            if name == 'desktop':
                for title, func in [('Imperial units and divisor', imperial), ('Billing rounding', charge_rounding),
                                    ('Actual-weight floor', no_saving), ('Larger package increases cost', cost_increase),
                                    ('Rounding removes apparent saving', increment_no_saving), ('Monthly linear estimate', monthly_cost),
                                    ('Reject zero divisor and stale result', invalid_divisor), ('Reject fractional cartons', fractional_cartons),
                                    ('Download report', download), ('Copy report', clipboard)]:
                    check(title, lambda f=func: f(page))
            check(name + ' no uncaught JavaScript errors', lambda: {'errors': errors} if not errors else (_ for _ in ()).throw(AssertionError(str(errors))))
            context.close()
        browser.close()
except Exception as exc:
    RESULTS.append({'name': 'Browser execution', 'passed': False, 'error': str(exc)})

summary = {'url': BASE, 'checked_at_utc': datetime.now(timezone.utc).isoformat(),
           'source_commit': os.getenv('GITHUB_SHA'), 'scope': 'Public HTTPS + live Chromium desktop and mobile viewport; not real iOS or mainland-network testing',
           'passed': sum(r['passed'] for r in RESULTS), 'failed': sum(not r['passed'] for r in RESULTS),
           'advisories': ADVISORIES, 'checks': RESULTS}
(OUT / 'results.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding='utf-8')
print('LIVE_CHECK_SUMMARY=' + json.dumps(summary, ensure_ascii=False), flush=True)
if os.getenv('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as f:
        f.write(f"## Public website verification\n{BASE}\n\n{summary['passed']} passed; {summary['failed']} failed.\n\n")
        for item in RESULTS:
            f.write(f"- {'PASS' if item['passed'] else 'FAIL'}: {item['name']}\n")
        f.write('\n### Advisories\n' + '\n'.join('- ' + a for a in ADVISORIES) + '\n')
sys.exit(1 if summary['failed'] else 0)
