'use strict';
// Build-time advertising preparation only: no ad requests, cookies or tracking.
// Review/account verification is intentionally separate from live ad serving.
const fs = require('node:fs');
const path = require('node:path');
const ROUTES = ['', 'packaging-optimizer', 'dim-weight-calculator', 'chargeable-weight-calculator', 'cbm-calculator', 'shipping-guide', 'about', 'privacy', 'feedback'];
const TOOL_ROUTES = ROUTES.slice(0, 5);

function validate(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Advertising configuration must be an object.');
  const allowed = ['model', 'provider', 'mode', 'publisherId'];
  if (Object.keys(config).some(key => !allowed.includes(key))) throw new Error('Unknown advertising setting. Live ads cannot be enabled by adding a flag.');
  if (config.model !== 'display-ads' || config.provider !== 'google-adsense') throw new Error('Expected the display-ads model with google-adsense.');
  if (!['off', 'verification'].includes(config.mode)) throw new Error('Only off and verification modes are implemented. Live ad serving requires a separate reviewed integration.');
  if (typeof config.publisherId !== 'string' || (config.publisherId && !/^ca-pub-\d{16}$/.test(config.publisherId))) throw new Error('Use the public ca-pub- ID from your own AdSense account, not a Search Console token or HTML snippet.');
  if (config.mode === 'verification' && (!config.publisherId || config.publisherId === 'ca-pub-0000000000000000')) throw new Error('Verification requires the site owner\'s actual AdSense publisher ID.');
  return {...config};
}

function replaceRequired(html, pattern, replacement, description) {
  if (!pattern.test(html)) throw new Error('Cannot find ' + description + '; rebuild with build.js and seo.js first.');
  return html.replace(pattern, replacement);
}

function prepare(dist, settings) {
  const config = validate(settings);
  const verifying = config.mode === 'verification';
  const status = verifying ? 'verification-only' : 'not-configured';
  const manifestPath = path.join(dist, 'release.json');
  const release = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (release.trackingEnabled !== false || release.checkoutEnabled !== false) throw new Error('Unexpected active tracking or checkout. Review the privacy notice before changing monetization.');
  const prepared = [];
  // Validate the whole build before writing any output. Never silently leave old disclosures.
  for (const route of ROUTES) {
    const file = path.join(dist, route, 'index.html');
    let html = fs.readFileSync(file, 'utf8');
    if (html.includes('name="monetization-model"') || html.includes('name="google-adsense-account"')) throw new Error('Advertising preparation already present; start from a clean build.');
    const metadata = '<meta name="monetization-model" content="display-ads">\n<meta name="ads-status" content="' + status + '">\n' + (verifying ? '<meta name="google-adsense-account" content="' + config.publisherId + '">\n' : '');
    html = replaceRequired(html, /<\/head>/, metadata + '</head>', route + ' head');
    html = html.replace('Free tools. Clear assumptions.', 'Free calculators. No paid plans.');
    if (route === 'about') {
      html = replaceRequired(html, /<h2>Commercial status<\/h2><p>[\s\S]*?<\/p>/, '<h2>How this free tool is funded</h2><p>The four calculators and plain-text reports remain free. Display advertising is the planned revenue model, not subscriptions, paid reports or affiliate commissions. Advertising is not active in this release, and no advertising approval or income is claimed. There is no checkout or preorder.</p>', 'commercial disclosure');
    }
    if (route === 'privacy') {
      html = replaceRequired(html, /<h2>Future changes<\/h2>/, '<h2>Advertising preparation</h2><p>Display advertising through Google AdSense is planned but not active. This release does not load advertising scripts, create ad impressions, or set advertising cookies. Public account-verification metadata and an ads.txt entry may be published for site review; these are not ad-serving code.</p><p>Before advertising is enabled, this notice must explain the actual providers and data use, and applicable consent and privacy choices must be implemented and tested. Google and its partners may use cookies, identifiers, IP addresses and browsing information when their advertising services are used. See <a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer" target="_blank">how Google uses information from partner sites</a>. This future processing is not activated by the present release.</p><h2>Future changes</h2>', 'privacy section');
    }
    if (route === 'feedback') {
      html = replaceRequired(html, /<h2>Need CSV batch comparison\?<\/h2><p>[\s\S]*?<\/p>/, '<h2>Suggestions for the free calculators</h2><p>CSV batch comparison remains a proposed feature, not an available product. Feedback is for improving the free tools, not for selling a subscription. There is no checkout, waitlist database, payment request or promised release date.</p>', 'feature feedback section');
    }
    // Inactive HTML comments mark future placements outside calculator/clipboard controls.
    // No empty ad containers, simulated ads, ad script or ad unit is rendered.
    if (TOOL_ROUTES.includes(route)) html = replaceRequired(html, /<section class="panel next-steps">/, '<!-- planned-ad-placement: after-explanation; inactive -->\n<section class="panel next-steps">', 'post-calculator content');
    if (route === 'shipping-guide') html = replaceRequired(html, /<\/article>/, '</article>\n<!-- planned-ad-placement: end-of-guide; inactive -->', 'guide article');
    html = replaceRequired(html, /<footer class="footer">/, '<p class="small">Free calculators. Display advertising is planned but not active.</p><footer class="footer">', 'footer');
    prepared.push([file, html]);
  }
  const adsPath = path.join(dist, 'ads.txt');
  if (fs.existsSync(adsPath)) throw new Error('Existing ads.txt found; review its authorized sellers instead of overwriting it.');
  for (const [file, html] of prepared) fs.writeFileSync(file, html);
  if (verifying) fs.writeFileSync(adsPath, 'google.com, ' + config.publisherId.slice(3) + ', DIRECT, f08c47fec0942fa0\n');
  release.monetizationModel = 'display-ads';
  release.adsServingEnabled = false;
  release.advertising = {provider: config.provider, mode: config.mode, status, verificationConfigured: verifying};
  fs.writeFileSync(manifestPath, JSON.stringify(release) + '\n');
  return {pages: prepared.length, status, adsServingEnabled: false, adsTxtGenerated: verifying};
}

if (require.main === module) {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'ads.config.json'), 'utf8'));
  console.log('Advertising preparation:', prepare(path.join(__dirname, 'dist'), config));
}
module.exports = {validate, prepare, ROUTES};
