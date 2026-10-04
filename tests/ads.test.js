'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {validate, prepare, ROUTES} = require('../monetization');
const OFF = {model:'display-ads', provider:'google-adsense', mode:'off', publisherId:''};
// Synthetic identifier used ONLY in isolated test files, never for network requests.
const VERIFY = {...OFF, mode:'verification', publisherId:'ca-pub-1234567890123456'};
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipping-ads-'));
  for (const route of ROUTES) {
    const dest = path.join(dir, route); fs.mkdirSync(dest, {recursive:true});
    const content = route === 'about' ? '<h2>Commercial status</h2><p>Old commercial copy.</p>' : route === 'privacy' ? '<h2>Future changes</h2><p>No analytics scripts; public feedback.</p>' : route === 'feedback' ? '<h2>Need CSV batch comparison?</h2><p>Old feedback copy.</p>' : '<article>Useful content</article><section class="panel next-steps">Examples</section>';
    fs.writeFileSync(path.join(dest, 'index.html'), '<html><head><link rel="canonical" href="https://example.test/'+route+'"><meta name="google-site-verification" content="search_token"></head><body><small>Free tools. Clear assumptions.</small>'+content+'<footer class="footer">Footer</footer></body></html>');
  }
  fs.writeFileSync(path.join(dir,'release.json'),JSON.stringify({version:'0.3.1',trackingEnabled:false,checkoutEnabled:false}));
  fs.writeFileSync(path.join(dir,'sitemap.xml'),'<urlset>unchanged</urlset>');
  fs.writeFileSync(path.join(dir,'404.html'),'<html>Error without advertising</html>');
  return dir;
}
function output(fn, settings=OFF) { const dir=fixture();try{prepare(dir,settings);fn(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});} }
const html = (dir, route='') => fs.readFileSync(path.join(dir,route,'index.html'),'utf8');
test('off state leaves ads.txt absent and publishes honest status',()=>output(dir=>{assert.ok(!fs.existsSync(path.join(dir,'ads.txt')));const r=JSON.parse(fs.readFileSync(path.join(dir,'release.json')));assert.equal(r.monetizationModel,'display-ads');assert.equal(r.adsServingEnabled,false);assert.equal(r.advertising.status,'not-configured');assert.equal(r.checkoutEnabled,false);}));
test('off state adds no advertising verification ID, scripts or containers',()=>output(dir=>{for(const route of ROUTES){const s=html(dir,route);assert.ok(!s.includes('google-adsense-account'));assert.ok(!s.includes('<script'));assert.ok(!s.includes('<iframe'));assert.ok(!s.includes('adsbygoogle'));}}));
test('Search Console tag and canonical survive',()=>output(dir=>{for(const route of ROUTES){assert.ok(html(dir,route).includes('content="search_token"'));assert.ok(html(dir,route).includes('rel="canonical"'));}}));
test('verification uses actual-shaped publisher ID without ad requests',()=>output(dir=>{for(const route of ROUTES){const s=html(dir,route);assert.ok(s.includes('name="google-adsense-account" content="'+VERIFY.publisherId+'"'));assert.ok(s.indexOf(VERIFY.publisherId)<s.indexOf('</head>'));assert.ok(!s.includes('<script'));}assert.equal(fs.readFileSync(path.join(dir,'ads.txt'),'utf8'),'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');const r=JSON.parse(fs.readFileSync(path.join(dir,'release.json')));assert.equal(r.adsServingEnabled,false);assert.equal(r.advertising.status,'verification-only');},VERIFY));
test('sitemap and error page are unchanged',()=>output(dir=>{assert.equal(fs.readFileSync(path.join(dir,'sitemap.xml'),'utf8'),'<urlset>unchanged</urlset>');assert.ok(!fs.readFileSync(path.join(dir,'404.html'),'utf8').includes('monetization'));}));
test('disclosures say free tools and ads not active',()=>output(dir=>{assert.ok(html(dir,'about').includes('Display advertising is the planned revenue model'));assert.ok(html(dir,'privacy').includes('does not load advertising scripts'));assert.ok(html(dir,'feedback').includes('not for selling a subscription'));}));
test('inactive placements stay off privacy/feedback/about pages',()=>output(dir=>{assert.ok(html(dir).includes('planned-ad-placement: after-explanation'));assert.ok(html(dir,'shipping-guide').includes('planned-ad-placement: end-of-guide'));for(const route of ['about','privacy','feedback'])assert.ok(!html(dir,route).includes('planned-ad-placement'));}));
for (const publisherId of ['pub-1234567890123456','ca-pub-123','<script>x</script>','search-console-token-only',null,true]) test('reject invalid publisher '+String(publisherId),()=>assert.throws(()=>validate({...OFF,publisherId})));
test('refuse verification without actual account ID',()=>{assert.throws(()=>validate({...OFF,mode:'verification'}));assert.throws(()=>validate({...VERIFY,publisherId:'ca-pub-0000000000000000'}));});
test('refuse live mode before reviewed integration',()=>assert.throws(()=>validate({...VERIFY,mode:'live'}),/separate reviewed integration/));
test('refuse unknown activation flag and provider',()=>{assert.throws(()=>validate({...OFF,enabled:true}));assert.throws(()=>validate({...OFF,provider:'other'}));});
test('do not overwrite an existing ads.txt authorization',()=>{const dir=fixture();try{fs.writeFileSync(path.join(dir,'ads.txt'),'other seller');assert.throws(()=>prepare(dir,VERIFY),/Existing ads.txt/);assert.equal(fs.readFileSync(path.join(dir,'ads.txt'),'utf8'),'other seller');assert.ok(!html(dir).includes('monetization-model'));}finally{fs.rmSync(dir,{recursive:true,force:true});}});
test('fail before writes if expected disclosure is missing',()=>{const dir=fixture();try{fs.writeFileSync(path.join(dir,'privacy/index.html'),'<html>unexpected template</html>');assert.throws(()=>prepare(dir,OFF));assert.ok(!html(dir).includes('monetization-model'));}finally{fs.rmSync(dir,{recursive:true,force:true});}});
test('repeated build stage cannot duplicate publisher metadata',()=>output(dir=>assert.throws(()=>prepare(dir,OFF),/already present/)));
