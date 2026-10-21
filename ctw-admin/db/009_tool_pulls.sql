-- A scanner tool pulls at least once a day (the form starts each new tool at 1).
-- Safe to run twice.

ALTER TABLE ctw_client_tool DROP CONSTRAINT IF EXISTS ctw_client_tool_pull_frequency_per_day_check;
ALTER TABLE ctw_client_tool ADD CONSTRAINT ctw_client_tool_pull_frequency_per_day_check CHECK (pull_frequency_per_day >= 1);

INSERT INTO ctw_migration (name) VALUES ('009_tool_pulls') ON CONFLICT DO NOTHING;
