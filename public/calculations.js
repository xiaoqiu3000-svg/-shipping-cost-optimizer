'use strict';
/* Pure functions shared by the browser and Node tests. No network access. */
(function (root) {
  function number(value, name, min = 0, max = 1e12, integer = false) {
    if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') throw new Error(name + ' is required.');
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) throw new Error(name + ' must be ' + (integer ? 'a whole number' : 'a number') + ' between ' + min + ' and ' + max + '.');
    return n;
  }
  function roundUp(value, increment = 0) {
    const n = number(value, 'Weight');
    const step = number(increment, 'Rounding increment', 0, 1e6);
    if (step === 0) return n;
    let q = n / step;
    const nearest = Math.round(q);
    if (nearest > 0 && Math.abs(q - nearest) <= 8 * Number.EPSILON * Math.max(1, Math.abs(q))) q = nearest;
    return Number((Math.ceil(q) * step).toPrecision(15));
  }
  function volume(dimensions, roundDimensions = false) {
    if (!Array.isArray(dimensions) || dimensions.length !== 3) throw new Error('Three package dimensions are required.');
    if (typeof roundDimensions !== 'boolean') throw new Error('Invalid dimension-rounding option.');
    return dimensions.map((v, i) => {
      const n = number(v, ['Length', 'Width', 'Height'][i], 0.000001, 100000);
      return roundDimensions ? roundUp(n, 1) : n;
    }).reduce((a, b) => a * b, 1);
  }
  function dimWeight(dimensions, divisor, roundDimensions = false) {
    const result = volume(dimensions, roundDimensions) / number(divisor, 'DIM divisor', 0.000001, 1e9);
    return number(result, 'Calculated dimensional weight');
  }
  function chargeable(actual, dimensional, increment = 0) {
    return roundUp(Math.max(number(actual, 'Actual weight'), number(dimensional, 'Dimensional weight')), increment);
  }
  function cbm(dimensions, count = 1, unit = 'cm') {
    const factor = {cm: 0.01, in: 0.0254}[unit];
    if (!factor) throw new Error('Volume units must be cm or in.');
    return volume(dimensions) * factor ** 3 * number(count, 'Carton count', 1, 1000000, true);
  }
  function compare({current, proposed, actual, divisor, increment = 0, roundDimensions = false, shipments = 1, rate = null}) {
    const beforeDim = dimWeight(current, divisor, roundDimensions);
    const afterDim = dimWeight(proposed, divisor, roundDimensions);
    const before = chargeable(actual, beforeDim, increment);
    const after = chargeable(actual, afterDim, increment);
    const count = number(shipments, 'Monthly shipments', 0, 1000000, true);
    const difference = before - after;
    const unitRate = rate === null ? null : number(rate, 'Cost per weight unit', 0, 1000000);
    return {beforeDim, afterDim, before, after, difference, percent: before === 0 ? 0 : difference / before * 100, monthlyWeight: difference * count, monthlyCost: unitRate === null ? null : difference * count * unitRate};
  }
  const api = Object.freeze({number, roundUp, volume, dimWeight, chargeable, cbm, compare});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Shipping = api;
})(globalThis);
