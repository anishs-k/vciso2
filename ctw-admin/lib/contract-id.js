// Contracts: one per office, its ID <office ID>_C<NNN>, e.g. Cust_00301_002_C002. The number runs on across
// the client's contracts (the highest so far + 1) and stays with the contract. The office ID starts with
// the customer ID, so no two clients get the same ID; one typed in by hand is checked against the others.
// Clients from before (db/012_contract_per_office.sql) keep their older IDs (Contract_00101_001).

const contractNumber = (id) => Number(String(id || '').match(/_C(\d+)$/)?.[1] || 0);
const contractIdFor = (officeId, n) => `${officeId}_C${String(n).padStart(3, '0')}`;

// The spec's contracts. A spec from before per-office contracts has one "contract": the Primary office's.
// (intake/client_intake.py contracts_of does the same for the validator and the builder.)
function contractsOf(spec) {
  if (Array.isArray(spec?.contracts)) return spec.contracts;
  if (!spec?.contract) return [];
  const primary = spec.organization?.offices?.find((o) => o.office_type === 'Primary')?.office_id;
  return [{ ...spec.contract, office_id: spec.contract.office_id || primary }];
}

// Gives the spec its `contracts` (from an older "contract" too) and every contract without an ID one.
function assignContractIds(spec) {
  const contracts = contractsOf(spec).map((k) => ({ ...k }));
  let n = Math.max(0, ...contracts.map((k) => contractNumber(k.contract_id)));
  for (const k of contracts) {
    if (!String(k.contract_id || '').trim() && k.office_id) k.contract_id = contractIdFor(k.office_id, ++n);
  }
  delete spec.contract;
  spec.contracts = contracts;
  return spec;
}

// Refuses contract IDs another client already has.
async function checkContractIds(db, customerId, contracts) {
  const ids = contracts.map((k) => k.contract_id).filter(Boolean);
  if (!ids.length) return;
  const { rows } = await db.query(
    'SELECT contract_id, customer_id FROM ctw_contract WHERE contract_id = ANY($1) AND customer_id <> $2 LIMIT 1',
    [ids, customerId],
  );
  if (rows.length) {
    throw Object.assign(new Error(`Contract ID ${rows[0].contract_id} is already used by ${rows[0].customer_id}`), {
      code: 'contract_taken',
    });
  }
}

module.exports = { contractIdFor, contractNumber, contractsOf, assignContractIds, checkContractIds };
