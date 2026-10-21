// Contract IDs: Contract_<the customer ID's digits>_<running number over all clients' contracts>, e.g.
// Contract_001216_006 for Cust_001216 when five contracts exist. The number comes from ctw_contract_seq
// (db/006_contract_id.sql). A customer ID without digits is used whole. The admin may also type an ID of
// their own; no two clients may share one.

const digitsOf = (customerId) => customerId.replace(/\D/g, '') || customerId;
const format = (customerId, n) => `Contract_${digitsOf(customerId)}_${String(n).padStart(3, '0')}`;

// The running number of a generated-looking ID for this customer, or null.
function autoNumber(customerId, contractId) {
  const prefix = `Contract_${digitsOf(customerId)}_`;
  const rest = contractId.startsWith(prefix) ? contractId.slice(prefix.length) : '';
  return /^\d+$/.test(rest) ? Number(rest) : null;
}

// The other client that has this contract ID, or null.
async function usedBy(db, contractId, customerId) {
  const { rows } = await db.query(
    'SELECT customer_id FROM ctw_contract WHERE contract_id = $1 AND customer_id <> $2 LIMIT 1',
    [contractId, customerId],
  );
  return rows[0]?.customer_id ?? null;
}

// The ID the next generated contract would get, without using the number up (shown in the form).
async function previewContractId(db, customerId) {
  const { rows } = await db.query('SELECT last_value, is_called FROM ctw_contract_seq');
  let n = Number(rows[0].last_value) + (rows[0].is_called ? 1 : 0);
  while (await usedBy(db, format(customerId, n), customerId)) n++;
  return format(customerId, n);
}

// Takes the next running number for good and returns the ID made from it.
async function nextContractId(db, customerId) {
  for (;;) {
    const { rows } = await db.query(`SELECT nextval('ctw_contract_seq') AS n`);
    const id = format(customerId, rows[0].n);
    if (!(await usedBy(db, id, customerId))) return id;
  }
}

// The client's current contract ID, or null.
async function currentContractId(db, customerId) {
  const { rows } = await db.query(
    'SELECT contract_id FROM ctw_contract WHERE customer_id = $1 AND is_current',
    [customerId],
  );
  return rows[0]?.contract_id ?? null;
}

// Decides the contract ID before the client is stored -> { contractId, generate, advanceTo }:
//   - empty: the current one kept, or (none yet) generated after storing (`generate`), so a refused
//     client uses no number up;
//   - unchanged: kept (older clients share Contract_001 from before IDs were generated);
//   - another client's: refused, unless it is a generated-looking one (two admins saw the same preview),
//     which is then generated afresh;
//   - generated-looking and free: kept, and the running number moves past it (`advanceTo`).
async function planContractId(db, customerId, wanted, current) {
  const id = (wanted || '').trim();
  if (!id) return current ? { contractId: current } : { contractId: 'pending', generate: true };
  if (id === current) return { contractId: id };
  const n = autoNumber(customerId, id);
  const other = await usedBy(db, id, customerId);
  if (other) {
    if (n !== null) return { contractId: 'pending', generate: true };
    throw Object.assign(new Error(`Contract ID ${id} is already used by ${other}`), { code: 'contract_taken' });
  }
  return { contractId: id, advanceTo: n };
}

// After storing: takes the number the plan needs, returns the final ID.
async function applyContractPlan(db, customerId, plan) {
  if (plan.advanceTo != null) {
    await db.query(
      `SELECT setval('ctw_contract_seq', GREATEST($1::bigint, 1, (SELECT CASE WHEN is_called THEN last_value ELSE 0 END FROM ctw_contract_seq)))`,
      [plan.advanceTo],
    );
  }
  if (!plan.generate) return plan.contractId;
  const id = await nextContractId(db, customerId);
  await db.query('UPDATE ctw_contract SET contract_id = $2 WHERE customer_id = $1 AND is_current', [customerId, id]);
  return id;
}

module.exports = { previewContractId, nextContractId, currentContractId, planContractId, applyContractPlan };
