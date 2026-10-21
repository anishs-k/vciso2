-- Contracts stored before IDs were generated (all "Contract_001") get generated IDs in the order their
-- clients were onboarded: Contract_<the customer ID's digits>_<running number>, e.g. the sixth client
-- Cust_001216 -> Contract_001216_006. The running number then continues after them (db/006_contract_id.sql).
-- IDs already in that form are left alone. Runs once.

WITH old AS (
  SELECT k.customer_id, k.contract_id,
         row_number() OVER (ORDER BY c.created_at, k.customer_id, k.contract_id) AS n
    FROM ctw_contract k JOIN ctw_client c USING (customer_id)
   WHERE k.contract_id !~ ('^Contract_' || COALESCE(NULLIF(regexp_replace(k.customer_id, '\D', '', 'g'), ''), k.customer_id) || '_[0-9]+$')
)
UPDATE ctw_contract k
   SET contract_id = 'Contract_' || COALESCE(NULLIF(regexp_replace(k.customer_id, '\D', '', 'g'), ''), k.customer_id)
                     || '_' || lpad(old.n::text, 3, '0')
  FROM old
 WHERE k.customer_id = old.customer_id AND k.contract_id = old.contract_id;

SELECT setval('ctw_contract_seq', GREATEST(n, 1), n > 0)
  FROM (SELECT GREATEST((SELECT count(*) FROM ctw_contract),
                        (SELECT CASE WHEN is_called THEN last_value ELSE 0 END FROM ctw_contract_seq)) AS n) c;

INSERT INTO ctw_migration (name) VALUES ('007_contract_renumber') ON CONFLICT DO NOTHING;
