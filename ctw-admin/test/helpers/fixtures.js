// Test data. The sample client of intake/sample_client_spec.json with its dates moved to today, so the
// tests do not start failing when the sample's licence (31 March 2027) runs out.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const iso = (d) => d.toISOString().slice(0, 10);

function financialYear(date) {
  const d = new Date(`${date}T00:00:00Z`);
  return d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}

// The sample spec, renamed to `customerId`, with a contract and licence running a year from today. Its
// contract ID is left empty for the API to generate (no two clients may share one).
function freshSample(customerId = 'Cust_00101') {
  const raw = fs.readFileSync(path.join(ROOT, 'intake', 'sample_client_spec.json'), 'utf8');
  const spec = JSON.parse(raw.replaceAll('Cust_00101', customerId));
  delete spec.license_seal;
  const start = new Date();
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  spec.contract.contract_id = '';
  spec.contract.contract_start_date = iso(start);
  spec.contract.contract_end_date = iso(end);
  spec.contract.financial_year = financialYear(iso(start));
  spec.licensing_limits.valid_to = iso(end);
  return spec;
}

module.exports = { freshSample, financialYear, ROOT };
