'use strict';
// Build-time only. No visitor tracking, remote requests or runtime dependencies.
const fs = require('node:fs');
const path = require('node:path');
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode = text => text.replace(/&(amp|lt|gt|quot|#39);/g, (_, c) => ({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[c]));
const tools = ['', 'packaging-optimizer', 'dim-weight-calculator', 'chargeable-weight-calculator', 'cbm-calculator'];
const repo = 'https://github.com/xiaoqiu3000-svg/-shipping-cost-optimizer';
function safeSite(value) {
  const site = new URL(value);
  if (site.protocol !== 'https:' || site.username || site.password || site.search || site.hash || site.pathname !== '/') {
    throw new Error('The site URL must be an HTTPS origin without a path, credentials, query or fragment.');
  }
  return site;
}
function token(value) {
  if (typeof value !== 'string' || (value && !/^[A-Za-z0-9_=-]{1,256}$/.test(value))) throw new Error('Invalid public verification token. Use only the content value, not an HTML tag.');
  return value;
}
function issueLink(title) {
  const url = new URL(repo + '/issues/new');
  url.searchParams.set('title', title);
  url.searchParams.set('body', 'Please use made-up examples only. Do not post customer details, addresses, order IDs, invoices, credentials or private contract rates.\n\nWhat are you trying to do?\n\nWhat is missing or incorrect?\n\nWhat would a useful result look like?');
  return escape(url.href);
}
const articles = {
  'shipping-guide': {
    title: 'Dimensional Weight and Packaging: Worked Examples',
    description: 'Understand DIM divisors, billable-weight rounding and packaging trade-offs with reproducible examples, not promised savings.',
    body: `<p class="eyebrow">METHODS &amp; EXAMPLES · REVIEWED 2026-10-03</p>
<h1>When does a smaller box actually help?</h1>
<p>Start with the outside dimensions of the packed carton, its actual weight, and the rules for your service. These examples use an <strong>assumed divisor of 5,000 cm³/kg</strong>. They are not a carrier rate table or a shipping quote.</p>
<h2>1. Compute dimensional weight</h2><p>A 40 × 30 × 20 cm carton has a volume of 24,000 cm³. Dividing by 5,000 gives <strong>4.8 kg</strong>. If its actual weight is 1.5 kg, a simple higher-of-the-two rule uses 4.8 kg before billing increments.</p>
<h2>2. Compare a proposed package</h2><p>Changing only the height to 15 cm gives 40 × 30 × 15 ÷ 5,000 = <strong>3.6 kg</strong>. Under the same assumptions the difference is 1.2 kg per shipment, or 25% of the original billable estimate. This does not prove that the product fits or that an invoice will fall by 25%.</p>
<h2>3. Test the actual-weight floor</h2><p>If the same shipment weighs 6 kg, both boxes are billed at an estimated 6 kg before other rules: max(6, 4.8) = max(6, 3.6) = 6. Smaller volume alone produces <strong>no weight-based saving</strong> in this scenario.</p>
<h2>4. Apply rounding before comparing</h2><p>A 40 × 30 × 19 cm box gives 4.56 kg. Under a whole-kilogram upward billing increment, both 4.8 and 4.56 become 5 kg. Again there is no difference. Dimension rounding and weight rounding are separate rules; select each explicitly.</p>
<h2>5. Treat cost as a conditional estimate</h2><p>At an assumed linear rate of 6.50 per billable kg and 800 shipments, 1.2 × 6.50 × 800 = 6,240 currency units per month. The rate is an input assumption, not market data. Minimum charges, rate bands, surcharges, packaging prices, taxes, actual-weight changes and damage risk can change the result.</p>
<h2>6. Do not mix cm/kg and in/lb divisors</h2><p>A divisor carries units. A cm³/kg divisor cannot be copied unchanged into an in³/lb calculation. The example defaults change when you switch unit systems; enter your actual measurements and contract divisor again.</p>
<h2>7. Know what CBM does not tell you</h2><p>Ten 40 × 30 × 20 cm cartons occupy 10 × 0.4 × 0.3 × 0.2 = <strong>0.24 m³</strong> of external volume. That is not a pallet layout, stackability assessment, container-fit guarantee or NMFC freight class.</p>
<h2>Check the source, then your own tariff</h2><p><a href="https://www.fedex.com/en-my/customer-support/faq/invoices-and-payments/fees-and-charges/calculate-dimensional-weight.html" target="_blank" rel="noopener noreferrer">FedEx Malaysia's dimensional-weight guidance</a> is an official regional example of the formula and measurement rules. Your origin, service and agreement may differ. This is a reference link, not an affiliate link.</p><p><a href="/">Try the packaging comparison</a> or <a href="/feedback/">report an unclear calculation</a>.</p>`
  },
  about: {
    title: 'About Shipping Cost Optimizer',
    description: 'What these independent shipping calculators do, how to reproduce the results, and what they do not promise.',
    body: `<p class="eyebrow">ABOUT THIS PROJECT</p><h1>Useful calculations. Visible assumptions.</h1><p>Shipping Cost Optimizer is an independently maintained set of four free browser-based calculators: packaging comparison, dimensional weight, chargeable weight and carton volume. Its purpose is to make assumptions visible before you choose packaging.</p><h2>What is implemented</h2><p>The tools apply the dimensions, units, divisor and rounding rules you enter. Calculations run on your device. You can copy or download a plain-text report with the inputs and assumptions. No registration or payment is needed.</p><h2>What is not implemented</h2><p>This site does not retrieve live rates, sell labels, book carriers, classify freight, validate product fit, predict damage, or guarantee savings. It is not operated or endorsed by FedEx, UPS, DHL, USPS or a marketplace.</p><h2>Review and reproduce</h2><p>Read the <a href="/shipping-guide/">worked examples</a> and inspect the <a href="${repo}" target="_blank" rel="noopener noreferrer">public source repository</a>. Automated tests check defined examples and input boundaries, not every possible carrier tariff or device.</p><h2>Commercial status</h2><p>There are currently no paid features, checkout, advertisements or affiliate links. Batch CSV comparison is only a proposed feature; the feedback page is not a checkout or a preorder. Any future pricing or referral relationship will be disclosed before use.</p><p>For corrections or feature requests, use the <a href="/feedback/">feedback page</a>. It explains the privacy limitations of public GitHub issues.</p>`
  },
  privacy: {
    title: 'Privacy and Data Handling',
    description: 'What stays in your browser, what the hosting provider may process, and how public feedback works.',
    body: `<p class="eyebrow">PRIVACY · UPDATED 2026-10-03</p><h1>Your calculation inputs stay on your device.</h1><h2>Calculator data</h2><p>The application does not send dimensions, weights, rates or reports to a server. It has no account system, payment form, advertising cookies, analytics scripts or behavioral event collection. Inputs are not intentionally saved in localStorage or cookies. Browser autofill and clipboard history are controlled by your browser and operating system.</p><h2>Reports</h2><p>Copy report writes the report to your clipboard after you click. Download report creates a local text file after you click. Sharing that file later is your choice.</p><h2>Website delivery</h2><p>Loading any hosted page requires network requests. Render and its infrastructure may process IP addresses, browser information, request paths and access logs to deliver and secure this website. We do not claim that visiting a website is anonymous or that its hosting logs have a particular retention period. See <a href="https://render.com/privacy" target="_blank" rel="noopener noreferrer">Render's privacy policy</a>.</p><h2>External links and public feedback</h2><p>Reference links and feedback links leave this site. GitHub feedback requires a GitHub account and is public when you submit it. Do not include customer names, addresses, order numbers, invoices, credentials or private contract rates. No calculator inputs are automatically added to feedback links.</p><h2>Future changes</h2><p>If analytics, payments or hosted processing are added, this notice must be updated before activation and any required consent or account setup must be handled first. This release has not activated those services.</p><p><a href="/about/">About the project</a> · <a href="/feedback/">Report a privacy concern using non-sensitive information</a></p>`
  },
  feedback: {
    title: 'Feedback and Batch Comparison Requests',
    description: 'Report a reproducible calculator issue or request CSV batch comparison. Public GitHub feedback; no purchase or preorder.',
    body: `<p class="eyebrow">HELP CHOOSE WHAT TO BUILD NEXT</p><h1>Does this solve your packaging task?</h1><p>A working calculator is not proof that a product is useful. Tell us which calculation is incorrect or which repetitive task still takes too much time.</p><h2>Report a calculation problem</h2><p>Include the tool, unit system, assumed divisor, rounding choices, expected result and browser. Use invented numbers rather than confidential shipment details.</p><p><a class="feedback-link" href="${issueLink('Calculator feedback')}" target="_blank" rel="noopener noreferrer">Open a public issue on GitHub →</a></p><h2>Need CSV batch comparison?</h2><p>Comparing many cartons at once and exporting a combined report is a proposed feature, not an available product. There is no checkout, waitlist database, payment request or promised release date.</p><p><a class="feedback-link" href="${issueLink('Feature interest: CSV batch packaging comparison')}" target="_blank" rel="noopener noreferrer">Request batch comparison on GitHub →</a></p><h2>Before you leave this site</h2><p><strong>A GitHub account is required and submitted issues are public.</strong> The link opens a draft; nothing is submitted automatically. Do not post real addresses, customer records, invoices, credentials or private contract prices. Calculator values are not attached to either link.</p><p><a href="/privacy/">Read the privacy notice</a> · <a href="/">Return to the calculator</a></p>`
  }
};
const css = `.reading{max-width:820px;margin:28px auto;line-height:1.75;overflow-wrap:anywhere}.reading h1{font-size:clamp(1.8rem,5vw,2.8rem);line-height:1.18;margin:14px 0 22px}.reading h2{margin-top:30px;font-size:1.2rem}.site-links{display:flex;gap:12px 22px;flex-wrap:wrap;margin:26px 0;line-height:1.6}.site-links a,.reading a,.next-steps a{color:#146b55;text-underline-offset:4px}.next-steps{margin-top:22px}.next-steps p{max-width:80ch;line-height:1.65}.feedback-link{display:inline-block;font-weight:700;padding:12px 0}.site-links a:focus-visible,.reading a:focus-visible{outline:3px solid #146b55;outline-offset:4px}@media(max-width:500px){.reading{margin:18px auto}.site-links{gap:12px 18px}}`;
function buildSeo(dist, config) {
  const site = safeSite(config.url);
  const verification = [['google-site-verification', token(config.googleSiteVerification || '')], ['msvalidate.01', token(config.bingSiteVerification || '')]].filter(([, value]) => value).map(([name,value])=>`<meta name="${name}" content="${escape(value)}">`).join('\n');
  const version = String(config.version);
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid version.');
  const canonicalFor = route => new URL(route && route !== 'packaging-optimizer' ? route+'/' : '', site).href;
  const nav = '<nav class="site-links" aria-label="Site information">'+Object.entries({'shipping-guide':'Worked examples',about:'About',privacy:'Privacy',feedback:'Feedback'}).map(([route,label])=>`<a href="/${route}/">${label}</a>`).join('')+'</nav>';
  function head(title, description, canonical) {
    return `<link rel="canonical" href="${escape(canonical)}">\n<meta name="app-version" content="${escape(version)}">\n<meta property="og:type" content="website"><meta property="og:site_name" content="Shipping Cost Optimizer"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}">\n<link rel="stylesheet" href="/site.css">\n${verification}`;
  }
  for (const route of tools) {
    const file = path.join(dist, route, 'index.html');
    let html = fs.readFileSync(file, 'utf8');
    const title = decode(html.match(/<title>([^<]+)<\/title>/)[1]);
    const description = decode(html.match(/name="description" content="([^"]+)"/)[1]);
    html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/g, '');
    html = html.replace('</head>', head(title, description, canonicalFor(route))+'\n</head>');
    // Link to the preferred homepage, not duplicate /index.html or /packaging-optimizer/.
    html = html.replace(/href="(?:\.\.\/)?index\.html"/g, 'href="/"').replace(/href="(?:\.\.\/)?packaging-optimizer\/"/g, 'href="/"');
    html = html.replace('<footer class="footer">', '<section class="panel next-steps"><h2>Check the assumptions before acting.</h2><p><a href="/shipping-guide/">See worked examples</a>, including cases where smaller packaging does not lower billable weight. Missing a workflow? <a href="/feedback/">Tell us what you need</a>.</p></section>'+nav+'<footer class="footer">');
    html = html.replace('v0.2 · No AI API needed', 'v'+escape(version)+' · Local calculations');
    fs.writeFileSync(file, html);
  }
  for (const [route, article] of Object.entries(articles)) {
    const title = article.title+' | Shipping Cost Optimizer';
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><meta name="description" content="${escape(article.description)}"><meta name="theme-color" content="#146b55"><link rel="stylesheet" href="/style.css">${head(title,article.description,canonicalFor(route))}</head><body><a class="skip" href="#main">Skip to content</a><header class="top"><div class="wrap"><a class="brand" href="/"><span aria-hidden="true">↗</span>Shipping Cost Optimizer</a><small>Free tools. Clear assumptions.</small></div></header><main id="main" class="wrap"><nav class="site-links" aria-label="Calculators"><a href="/">Packaging</a><a href="/dim-weight-calculator/">DIM weight</a><a href="/chargeable-weight-calculator/">Chargeable weight</a><a href="/cbm-calculator/">CBM</a></nav><article class="panel reading">${article.body}</article>${nav}<footer class="footer"><span>Independent tools · Estimates, not quotes</span><span>v${escape(version)}</span></footer></main></body></html>`;
    fs.mkdirSync(path.join(dist,route),{recursive:true});fs.writeFileSync(path.join(dist,route,'index.html'),html);
  }
  fs.writeFileSync(path.join(dist,'site.css'),css+'\n');
  const urls = [...new Set([...tools,...Object.keys(articles)].map(canonicalFor))];
  fs.writeFileSync(path.join(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(url=>'  <url><loc>'+escape(url)+'</loc></url>').join('\n')+'\n</urlset>\n');
  fs.writeFileSync(path.join(dist,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: '+new URL('sitemap.xml',site).href+'\n');
  fs.writeFileSync(path.join(dist,'release.json'),JSON.stringify({version,canonicalOrigin:site.origin,pages:tools.length+Object.keys(articles).length,indexableUrls:urls.length,trackingEnabled:false,checkoutEnabled:false})+'\n');
  // An error page is not an SEO landing page.
  const errorPage = path.join(dist,'404.html');
  if(fs.existsSync(errorPage))fs.writeFileSync(errorPage,fs.readFileSync(errorPage,'utf8').replace('<title>','<meta name="robots" content="noindex"><title>'));
  return {pages:9,urls};
}
if (require.main === module) {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname,'site.config.json'),'utf8'));
  if(process.env.SITE_URL)config.url=process.env.SITE_URL;
  if(process.env.GOOGLE_SITE_VERIFICATION)config.googleSiteVerification=process.env.GOOGLE_SITE_VERIFICATION;
  if(process.env.BING_SITE_VERIFICATION)config.bingSiteVerification=process.env.BING_SITE_VERIFICATION;
  console.log('SEO release:',buildSeo(path.join(__dirname,'dist'),config));
}
module.exports={buildSeo,safeSite,token,tools};
