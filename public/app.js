'use strict';
(() => {
  const C = window.Shipping;
  const tool = document.body.dataset.tool;
  const form = document.getElementById('calculator');
  const result = document.getElementById('result');
  const unitSelect = document.getElementById('units');
  const error = document.getElementById('error');
  let report = '';
  const fmt = (n, digits = 3) => Number(n).toLocaleString('en-US', {maximumFractionDigits: digits});
  const config = () => unitSelect.value === 'metric' ? {dim:'cm', weight:'kg', divisor:5000, current:[40,30,20], proposed:[40,30,15], actual:1.5} : {dim:'in', weight:'lb', divisor:139, current:[16,12,8], proposed:[16,12,6], actual:3.3};
  function input(id, label, value, options = {}) {
    return '<label for="'+id+'">'+label+'<input id="'+id+'" name="'+id+'" type="number" inputmode="decimal" min="'+(options.min ?? 0.000001)+'" max="'+(options.max ?? 100000)+'" step="'+(options.integer ? '1' : 'any')+'" value="'+value+'" '+(options.optional ? '' : 'required')+'></label>';
  }
  function dimensions(prefix, values, title) {
    const u = config();
    return '<fieldset><legend>'+title+'</legend><div class="triple">'+['Length','Width','Height'].map((name,i) => input(prefix+i, name+' ('+u.dim+')', values[i])).join('')+'</div></fieldset>';
  }
  function rounding() {
    const u = config();
    return '<div class="pair"><label for="increment">Billable-weight increment<select id="increment" name="increment"><option value="0">No rounding (raw estimate)</option><option value="0.5">Round up to 0.5 '+u.weight+'</option><option value="1">Round up to 1 '+u.weight+'</option></select></label><label for="dimensionRound">Dimension measurement<select id="dimensionRound" name="dimensionRound"><option value="raw">Use entered dimensions</option><option value="up">Round each up to whole '+u.dim+'</option></select></label></div>';
  }
  function clearResult() {
    report = '';
    result.innerHTML = '<div class="empty"><span class="eyebrow">YOUR COMPARISON</span><h2>Start with your package.</h2><p>Replace the example values, check your carrier rules, then calculate.</p><div class="box-icon" aria-hidden="true">↔</div><p class="small">No sign-up. No calculator data uploaded.</p></div>';
    document.getElementById('copy').disabled = true;
    document.getElementById('download').disabled = true;
  }
  function renderForm() {
    const u = config();
    let html = '';
    if (tool === 'pack') {
      html = dimensions('old',u.current,'Current packaging') + dimensions('new',u.proposed,'Proposed packaging') + '<div class="pair">'+input('actual','Actual weight ('+u.weight+')',u.actual)+input('divisor','DIM divisor ('+u.dim+'³ / '+u.weight+')',u.divisor,{max:1e9})+'</div>'+rounding()+'<details class="cost"><summary>Monthly cost estimate · optional</summary><div class="pair">'+input('shipments','Shipments per month',800,{min:0,max:1e6,integer:true})+input('rate','Your cost per billable '+u.weight,'',{min:0,max:1e6,optional:true})+'<label for="currency">Currency<select id="currency" name="currency"><option>USD</option><option>CNY</option><option>EUR</option><option>GBP</option></select></label></div><p class="small">Linear estimate only. Excludes rate tiers, minimum charges, surcharges, packaging cost and taxes. The actual package weight is assumed unchanged.</p></details>';
    } else if (tool === 'dim') {
      html = dimensions('box',u.current,'Outside dimensions') + input('divisor','DIM divisor ('+u.dim+'³ / '+u.weight+')',u.divisor,{max:1e9}) + '<label for="dimensionRound">Dimension measurement<select id="dimensionRound" name="dimensionRound"><option value="raw">Use entered dimensions</option><option value="up">Round each up to whole '+u.dim+'</option></select></label>';
    } else if (tool === 'charge') {
      html = '<div class="pair">'+input('actual','Actual weight ('+u.weight+')',2,{min:0})+input('dimensional','Dimensional weight ('+u.weight+')',4.8,{min:0})+'</div><label for="increment">Billable-weight increment<select id="increment" name="increment"><option value="0">No rounding (raw estimate)</option><option value="0.5">Round up to 0.5 '+u.weight+'</option><option value="1">Round up to 1 '+u.weight+'</option></select></label>';
    } else {
      html = dimensions('box',u.current,'One carton') + input('count','Number of identical cartons',10,{min:1,max:1e6,integer:true});
    }
    form.innerHTML = html + '<p class="small assumptions">Divisors shown are examples, not a universal carrier tariff. Confirm the applicable units, divisor and rounding rules.</p><button class="primary" type="submit">'+(tool === 'pack' ? 'Compare packaging' : 'Calculate')+' <span aria-hidden="true">→</span></button>';
    clearResult();
    error.textContent = '';
  }
  function addRow(label, value) {
    const row = document.createElement('div');
    const dt = document.createElement('dt'); const dd = document.createElement('dd');
    dt.textContent = label; dd.textContent = value; row.append(dt,dd);
    document.getElementById('metrics').append(row);
    report += label + ': ' + value + '\n';
  }
  function show(title, big, description, warning = false) {
    result.innerHTML = '<span class="eyebrow" id="result-label"></span><h2 class="result-number" id="result-big"></h2><p id="result-description"></p><dl id="metrics"></dl><p class="small result-note">An estimate, not a shipping quote. Carrier service and contract rules take precedence.</p>';
    document.getElementById('result-label').textContent = title;
    document.getElementById('result-big').textContent = big;
    document.getElementById('result-big').classList.toggle('warning',warning);
    document.getElementById('result-description').textContent = description;
    report = 'Shipping Cost Optimizer\n'+new Date().toISOString()+'\n'+title+': '+big+'\n'+description+'\n';
  }
  function calculate(event) {
    event.preventDefault();
    error.textContent = '';
    const u = config();
    const data = new FormData(form);
    const get = key => data.get(key);
    const dims = prefix => [0,1,2].map(i=>get(prefix+i));
    const rounded = get('dimensionRound') === 'up';
    try {
      if (tool === 'pack') {
        const r = C.compare({current:dims('old'),proposed:dims('new'),actual:get('actual'),divisor:get('divisor'),increment:get('increment'),roundDimensions:rounded,shipments:get('shipments'),rate:get('rate').trim() === '' ? null : get('rate')});
        const increase = r.difference < -1e-9;
        const unchanged = Math.abs(r.difference) <= 1e-9;
        show('BILLABLE WEIGHT COMPARISON',unchanged ? 'No change' : fmt(Math.abs(r.percent),1)+'% '+(increase?'more':'less'),unchanged?'This change does not reduce billable weight under the selected rules.':increase?'The proposed package increases estimated billable weight.':'The proposed package reduces estimated billable weight.',increase);
        addRow('Current dimensional weight',fmt(r.beforeDim)+' '+u.weight);
        addRow('Proposed dimensional weight',fmt(r.afterDim)+' '+u.weight);
        addRow('Current billable estimate',fmt(r.before)+' '+u.weight);
        addRow('Proposed billable estimate',fmt(r.after)+' '+u.weight);
        addRow('Monthly billable weight '+(increase?'increase':'reduction'),fmt(Math.abs(r.monthlyWeight))+' '+u.weight);
        if (r.monthlyCost !== null) addRow('Linear monthly cost '+(increase?'increase':'reduction'),new Intl.NumberFormat('en-US',{style:'currency',currency:get('currency')}).format(Math.abs(r.monthlyCost)));
      } else if (tool === 'dim') {
        const d = C.dimWeight(dims('box'),get('divisor'),rounded);
        show('DIMENSIONAL WEIGHT',fmt(d)+' '+u.weight,'Length × width × height ÷ the divisor you entered.');
        addRow('Entered dimensions',dims('box').join(' × ')+' '+u.dim);
        addRow('DIM divisor',get('divisor')+' '+u.dim+'³ / '+u.weight);
      } else if (tool === 'charge') {
        const n = C.chargeable(get('actual'),get('dimensional'),get('increment'));
        show('BILLABLE WEIGHT ESTIMATE',fmt(n)+' '+u.weight,'Higher of actual and dimensional weight, rounded up by your selected increment.');
        addRow('Actual weight',get('actual')+' '+u.weight);
        addRow('Dimensional weight',get('dimensional')+' '+u.weight);
      } else {
        const total = C.cbm(dims('box'),get('count'),u.dim);
        show('TOTAL CARTON VOLUME',fmt(total,6)+' m³','External volume for identical cartons. This does not calculate pallet or container fit.');
        addRow('Number of cartons',get('count'));
        addRow('Volume per carton',fmt(total / Number(get('count')),6)+' m³');
      }
      if (get('increment') !== null) addRow('Weight rounding',Number(get('increment'))===0?'None':get('increment')+' '+u.weight+' upward');
      if (get('dimensionRound') !== null) addRow('Dimension rounding',rounded?'Each dimension rounded up to whole '+u.dim:'None');
      report += '\nInputs and assumptions\nUnits: '+u.dim+' / '+u.weight+'\n';
      for (const [key,value] of data.entries()) report += key+': '+value+'\n';
      report += '\nEstimate only. Check carrier tariffs. Package fit and protection are not verified.\n';
      document.getElementById('copy').disabled = false;
      document.getElementById('download').disabled = false;
    } catch (e) {
      clearResult(); error.textContent = e.message;
    }
  }
  form.addEventListener('submit',calculate);
  form.addEventListener('input',()=>{clearResult();error.textContent='';document.getElementById('export-status').textContent='';});
  unitSelect.addEventListener('change',()=>{renderForm();document.getElementById('unit-note').textContent='Example inputs reset for the selected units. Enter your measurements again.';});
  document.getElementById('download').addEventListener('click',()=>{
    if (!report) return;
    const url = URL.createObjectURL(new Blob([report],{type:'text/plain;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url; a.download='shipping-comparison.txt'; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  document.getElementById('copy').addEventListener('click',async()=>{
    if (!report) return;
    try {await navigator.clipboard.writeText(report);document.getElementById('export-status').textContent='Report copied.';} catch {document.getElementById('export-status').textContent='Clipboard unavailable. Use Download report instead.';}
  });
  document.querySelector('[data-nav="'+tool+'"]')?.setAttribute('aria-current','page');
  renderForm();
})();
