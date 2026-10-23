-- One contract per office. A contract now belongs to an office, and each office has one current contract
-- (before: one current contract per client). Contract IDs are <office ID>_C<NNN> (lib/contract-id.js);
-- older IDs (Contract_00101_001) stay as they are. A client's current contract from before this change
-- becomes its Primary office's. Safe to run twice.

ALTER TABLE ctw_contract ADD COLUMN IF NOT EXISTS office_id text;

UPDATE ctw_contract k SET office_id = o.office_id
  FROM ctw_client_office o
 WHERE k.office_id IS NULL AND k.is_current AND o.customer_id = k.customer_id AND o.office_type = 'Primary';

DROP INDEX IF EXISTS ctw_contract_one_current;
CREATE UNIQUE INDEX IF NOT EXISTS ctw_contract_one_current_per_office ON ctw_contract (customer_id, office_id) WHERE is_current;

INSERT INTO ctw_migration (name) VALUES ('012_contract_per_office') ON CONFLICT DO NOTHING;
