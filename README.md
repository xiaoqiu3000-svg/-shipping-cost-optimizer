# Shipping Cost Optimizer

A browser-based shipping calculator for dimensional weight, chargeable weight, carton volume, and packaging comparisons.

## Project status

Repository initialization. The website and deployment configuration will be added next. A successful code commit does not mean that a public website has been deployed.

## MVP requirements

- Dimensional weight with explicit units and a user-supplied carrier divisor.
- Chargeable weight with a configurable rounding increment.
- CBM calculation for whole numbers of identical cartons.
- Current-versus-proposed packaging comparison, including both increases and decreases.
- Input validation; no silent fallback for invalid divisors, weights, or dimensions.
- Optional linear cost estimate using the user's own rate, clearly distinguished from an actual carrier quote.
- Responsive, accessible interface; calculations remain in the browser.
- Automated formula tests and deployment documentation.

## Calculation limits

Carrier rules depend on the service, route, contract, and date. Verify the applicable divisor, rounding rules, minimum charges, and surcharges before relying on any estimate. This project does not obtain live shipping quotes or guarantee savings.

## Privacy and commercialization

Do not commit credentials or collect shipment details. Analytics, affiliate links, payment collection, and external services remain disabled unless explicitly configured and disclosed.
