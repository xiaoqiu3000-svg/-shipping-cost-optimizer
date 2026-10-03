'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const dist = path.join(root,'dist');
fs.rmSync(dist,{recursive:true,force:true}); fs.mkdirSync(dist,{recursive:true});
for (const file of ['style.css','calculations.js','app.js']) fs.copyFileSync(path.join(root,'public',file),path.join(dist,file));
const template = fs.readFileSync(path.join(root,'public/template.html'),'utf8');
const definitions = {
  pack: {title:'Packaging Optimizer — Compare Billable Weight',heading:'Ship products. Not empty space.',description:'Compare two package sizes, see the change in billable weight, and estimate monthly cost differences using your own rate.',formula:'Billable weight = round up(max(actual weight, L × W × H ÷ divisor))',explanation:'Compare the current and proposed billable weights using identical carrier assumptions. A reduction can disappear when actual weight or a billing increment becomes the limiting factor.'},
  dim: {title:'Dimensional Weight Calculator — cm/kg & in/lb',heading:'Know your dimensional weight.',description:'Calculate volumetric weight using your own divisor and measurement rules. Choose metric or imperial inputs, with optional dimension rounding.',formula:'Dimensional weight = length × width × height ÷ divisor',explanation:'Use a divisor expressed in cubic centimeters per kilogram for cm/kg inputs, or cubic inches per pound for in/lb inputs. Divisors are not interchangeable across unit systems.'},
  charge: {title:'Chargeable Weight Calculator — Configurable Rounding',heading:'Know which weight gets billed.',description:'Compare actual and dimensional weight, then apply your chosen billing increment. Keep carrier-specific rules explicit.',formula:'Chargeable weight = ceil(max(actual, dimensional) ÷ increment) × increment',explanation:'With no rounding selected, the result is simply the larger input. Some services use additional minimums and exceptions that this simple estimate does not include.'},
  cbm: {title:'CBM Calculator — Carton Volume in Cubic Meters',heading:'Turn carton dimensions into CBM.',description:'Calculate total cubic meters for identical cartons from centimeter or inch measurements, without uploading shipment details.',formula:'CBM = L × W × H × unit-to-meter factor³ × carton count',explanation:'One centimeter is 0.01 meter; one inch is 0.0254 meter. This is outside volume, not a pallet arrangement, container-fit result or freight classification.'}
};
const pages = [['','pack'],['packaging-optimizer','pack'],['dim-weight-calculator','dim'],['chargeable-weight-calculator','charge'],['cbm-calculator','cbm']];
const escape = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let site = null;
if (process.env.SITE_URL) {
  site = new URL(process.env.SITE_URL);
  if (site.protocol !== 'https:' || site.username || site.password || site.search || site.hash) throw new Error('SITE_URL must be a clean HTTPS deployment URL.');
  site.pathname = site.pathname.replace(/\/?$/,'/');
}
for (const [route,tool] of pages) {
  const d=definitions[tool];
  const canonical=site ? '<link rel="canonical" href="'+escape(new URL(route ? route+'/' : '',site).href)+'">' : '';
  const values={TITLE:d.title+' | Shipping Cost Optimizer',DESCRIPTION:d.description,TOOL:tool,HEADING:d.heading,FORMULA:d.formula,EXPLANATION:d.explanation,BASE:route?'../':'',CANONICAL:canonical};
  const html=template.replace(/@@([A-Z]+)@@/g,(_,key)=>key==='CANONICAL'?values[key]:escape(values[key]));
  const dir=path.join(dist,route);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html);
}
fs.writeFileSync(path.join(dist,'404.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found</title><h1>Page not found</h1><p><a href="/">Return to Shipping Cost Optimizer</a></p></html>');
fs.writeFileSync(path.join(dist,'robots.txt'),'User-agent: *\nAllow: /\n'+(site?'Sitemap: '+new URL('sitemap.xml',site).href+'\n':''));
if(site) fs.writeFileSync(path.join(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.map(([route])=>'<url><loc>'+escape(new URL(route?route+'/':'',site).href)+'</loc></url>').join('')+'</urlset>');
console.log('Built 5 static pages in dist/. '+(site?'Sitemap generated.':'Set SITE_URL after deployment to generate canonical URLs and a sitemap.'));
