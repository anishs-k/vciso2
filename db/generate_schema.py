"""Regenerate the database schema from the control-framework workbook.

    pip install openpyxl
    python3 db/generate_schema.py "docs/Master-Framework v13.0 Control-Framework Map.xlsx"

Writes:
  db/init/001_framework_tables.sql   the schema
  db/SCHEMA_DIFF.md                  every difference between the schema and the workbook

Everything that deviates from the sheet on purpose is in the DECISIONS section below, each
with the reason it is reported under in SCHEMA_DIFF.md.
The workbook parsing and DECISIONS are also used by db/generate_client_schema.py (via
load_schema), so a client database always has exactly the tables documented here.
"""
import openpyxl, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL_OUT = os.path.join(ROOT, 'db/init/001_framework_tables.sql')
DIFF_OUT = os.path.join(ROOT, 'db/SCHEMA_DIFF.md')
SKIP_SHEETS = 2  # Flow-Diagram, Sample-UI


def tname(s):
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')


def strip_markers(raw):
    return re.sub(r'\(?\s*(FK\s*\+\s*PK|FK|PK)\s*\)', '', raw).strip()


def mechanical(base):
    """Plain snake_case of a header with any (...) note removed."""
    return tname(re.sub(r'\(.*?\)', '', base))


# ---------------------------------------------------------------- naming

# Header (markers stripped, whitespace collapsed) -> column name, where plain snake_case
# would be wrong, ambiguous or misspelt.
RENAME = {
    'Clause_ID / Control_ID': ('clause_control_id', 'Same key as Clause_Control_ID in Master-Clause-Control-Map'),
    'Year Fom': ('year_from', 'Typo fixed'),
    'Access_Privilage': ('access_privilege', 'Typo fixed'),
    'Genereted (Y/N)': ('generated', 'Typo fixed'),
    'Evidenace Date From': ('evidence_date_from', 'Typo fixed'),
    'Date of Creation': ('created_at', 'Standard audit column name'),
    'Date Of Creation': ('created_at', 'Standard audit column name'),
    'Created BY': ('created_by', None),
    'Created By': ('created_by', None),
    'Date of Update': ('updated_at', 'Standard audit column name'),
    'Date Of Updation': ('updated_at', 'Standard audit column name'),
    'Updated By': ('updated_by', None),
    'Data_Pulling_Freq (Times in a Day)': ('data_pulling_freq_per_day', 'The four frequency headers differ only in brackets'),
    'Data_Pulling_Freq (Times in a Week)': ('data_pulling_freq_per_week', 'The four frequency headers differ only in brackets'),
    'Data_Pulling_Freq (Times in a Month)': ('data_pulling_freq_per_month', 'The four frequency headers differ only in brackets'),
    'Data_Pulling_Freq (Times in a Quarter)': ('data_pulling_freq_per_quarter', 'The four frequency headers differ only in brackets'),
    'Review Frequency (In Months per Year)': ('review_frequency_months', 'Unit kept in the name'),
    'Contract Period (In Months)': ('contract_period_months', 'Unit kept in the name'),
    'Billing Frequency (in Months)': ('billing_frequency_months', 'Unit kept in the name'),
    'Password_Change (In Days)': ('password_change_days', 'Unit kept in the name'),
    'Number Of Framework (License)': ('framework_license_count', 'Clearer name'),
    'Numbers of API Integration (License)': ('api_integration_license_count', 'Clearer name'),
    'Number Of Users (License)': ('user_license_count', 'Clearer name'),
    'Invoicing (M/Q/H/Y)': ('invoicing_frequency', 'Clearer name'),
    'Active_Y_N': ('active', 'Same as "Active (Y/N)" in the other sheets'),
    'Internet_Y_N': ('internet', 'Y/N suffix dropped; column is true/false'),
    'Country ID': ('country_id', None),
}
PER_TABLE_RENAME = {
    # (table, column index or stripped header) -> (column name, reason)
    ('master_framework', 15): ('framework_code', 'Second "Framework_ID" column holds the short code (ISO9001, ISO27001...)'),
    ('customer_framework_users', 'Password'): ('password_hash', 'Passwords are stored hashed, never in plain text'),
    ('customer_asset_owner', 'Password'): ('password_encrypted', 'Asset credentials are stored encrypted, never in plain text'),
    ('customer_framework_role_user', 'License_ID_'): ('role_id', 'Confirmed: License_ID holds Role IDs (Role_0001...)'),
    ('rcsa', 0): ('control_area_id', 'Values (100001, 100002...) are control-area IDs, not Master-Framework IDs'),
    ('rcsa', 4): ('framework_id', None),
}

ID_TYPES = {'fy_id': 'integer', 'framework_id': 'integer', 'clause_control_id': 'integer', 'tool_id': 'integer',
            'api_id': 'bigint', 'sub_control_id': 'bigint', 'control_id': 'integer', 'control_area_id': 'integer'}


def ctype(col, header):
    h = header.lower()
    if col in ID_TYPES: return ID_TYPES[col]
    if col in ('created_at', 'updated_at'): return 'timestamptz'
    if col in ('created_by', 'updated_by'): return 'text'
    if re.search(r'\(y ?/ ?n\)|_y_n$', h) or col.startswith('access_') or col in ('single_signon', 'mfa'): return 'boolean'
    if 'datetime' in h or col in ('last_updated', 'last_password_change'): return 'timestamptz'
    if 'date' in h or col in ('invoice_month', 'target_completion'): return 'date'
    if 'amount' in h or ('value' in h and 'contract' in h): return 'numeric(15,2)'
    if col in ('total', 'critical', 'built', 'in_scope_poc', 'planned', 'serial_no', 'year_from', 'year_to',
               'financial_year', 'cycle_no', 'current_collection_no', 'contact_priority',
               'number_of_documents_upload', 'minimum_word_in_document') \
            or col.endswith(('_count', '_months', '_days')) or col.startswith('data_pulling_freq'): return 'integer'
    return 'text'


# ---------------------------------------------------------------- DECISIONS
# Primary keys that differ from the sheet markers: table -> (new PK, reason)
PK_DECISIONS = {
    'master_framework': (['framework_id'],
        'Sheet marks no PK, but 15 other sheets reference Framework_ID'),
    'financial_year_master': (['fy_id'],
        'Agreed: Country_ID dropped from the key so other tables can reference FY_ID alone; Country_ID kept as a normal column'),
    'master_customer_contract_detail': (['contract_id'],
        'Agreed: one PO covers several contracts (PO_001 -> Contract_001..003), so Contract_ID alone is unique; Customer_Ref_PO kept as a normal column'),
    'customer_contract_framework_map': (['customer_id', 'office_id', 'fy_id', 'framework_id'],
        'Agreed: the same framework can be taken by several offices and renewed each year (sample: Cust_00101 has framework 103 at two offices)'),
    'customer_framework_role_user': (['framework_id', 'role_id', 'user_id', 'ui_id'],
        'Same key as the sheet, with License_ID renamed to Role_ID'),
    'customer_fy_financial_plan': (['customer_id', 'framework_id', 'financial_year', 'invoice_month'],
        'Agreed: one plan row per billing month (sample has 15 rows for the same customer + framework)'),
    'customer_fy_invoices': (['customer_id', 'framework_id', 'financial_year', 'invoice_month'],
        'Agreed: one invoice row per billing month (sample has 15 rows for the same customer + framework)'),
    'rcsa_control_area': (['control_area_id'], 'RCSA split: each control area is one row'),
    'rcsa_sub_control': (['sub_control_id'],
        'RCSA split: Sub_Control_ID is unique on its own (1000010001...); the sheet\'s five-column key would be mostly blank'),
}
UNIQUE_DECISIONS = {
    'customer_fy_invoices': ([['invoice_number']], 'Invoice numbers must not repeat (blank allowed until generated)'),
}
# Columns that are not in the sheet: table -> [(after column, new column, type, reason)]. They go after the
# sheet's last column, so a table's columns stand in the sheet's order (side by side, nothing looks shifted).
COLUMNS_ADDED = {
    'master_clause_control_map': [('updated_by', 'source_clause_control_id', 'text',
        'The sheet\'s own Clause_Control_ID. It repeats (10201 for 4.1, 4.2, 4.3...) and DPDPA uses text codes '
        '(DPDP-CN-01), so client builds number controls <Framework_ID><3-digit sequence> (102001, 102002...) '
        'and keep the sheet\'s ID here')],
}
# FK target for a column name: (table, [columns])
REF = {
    'function_id': ('vciso_function', ['function_id']),
    'role_id': ('roles', ['role_id']),
    'ui_id': ('ui_report_dashboard_list', ['ui_id']),
    'framework_id': ('master_framework', ['framework_id']),
    'clause_control_id': ('master_clause_control_map', ['clause_control_id']),
    'customer_id': ('master_customer_details', ['customer_id']),
    'office_id': ('master_customer_address_details', ['office_id']),
    'address_id': ('master_customer_address_details', ['office_id']),
    'user_id': ('customer_framework_users', ['user_id']),
    'user_id_from': ('customer_framework_users', ['user_id']),
    'user_id_to': ('customer_framework_users', ['user_id']),
    'owner_id': ('customer_framework_users', ['user_id']),
    'fy_id': ('financial_year_master', ['fy_id']),
    'contract_id': ('master_customer_contract_detail', ['contract_id']),
    'tool_id': ('tool_api_map', ['tool_id', 'api_id']),
    'api_id': ('tool_api_map', ['tool_id', 'api_id']),
    'control_area_id': ('rcsa_control_area', ['control_area_id']),
}
# FKs added where the sheet has no (FK) marker: (table, column) -> reason
FK_ADDED = {
    ('customer_contract_framework_map', 'framework_id'): 'Column is marked PK only, but its values are Master-Framework IDs',
    ('customer_framework_role_user', 'framework_id'): 'Column is marked PK only, but its values are Master-Framework IDs',
    ('customer_framework_role_user', 'role_id'): 'Was License_ID (FK); now points at Roles',
    ('rcsa_sub_control', 'control_area_id'): 'New column linking each sub-control to its control area (the sheet does this by row order)',
}
# Sheet (FK) markers deliberately not turned into constraints: (table, column) -> reason
FK_SKIPPED = {
    ('ui_report_dashboard_list', 'ui_id'): 'Marked FK + PK, but this table is where UI_ID is defined; nothing else to point at',
    ('customer_framework_users', 'user_id'): 'Marked FK + PK, but this table is where User_ID is defined; nothing else to point at',
    ('customer_framework_role_user', 'customer_ref_po'): 'Customer_Ref_PO is no longer a key of the contract table; the Contract_ID FK already ties the row to its contract',
    ('customer_transactions', 'customer_ref_po'): 'Customer_Ref_PO is no longer a key of the contract table; the Contract_ID FK already ties the row to its contract',
    ('rcsa_sub_control', 'control_id'): 'Open question: probably Clause_Control_ID, not yet confirmed',
    ('rcsa_sub_control', 'document_id'): 'No documents table exists yet',
}


# ---------------------------------------------------------------- read the workbook

def load_schema(xlsx):
    """Parse the workbook and apply the DECISIONS.

    Returns dict(wb, tables, fks, fk_skipped, dropped, rcsa). Each column carries `idx`, its
    position in the sheet (None for added columns), so callers can read the sheet's rows.
    """
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
    tables = {}   # name -> dict(sheet, cols, pk, uniques, note)
    dropped = []  # (sheet, header, reason)

    for ws in wb.worksheets[SKIP_SHEETS:]:
        t = tname(ws.title)
        hdr = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
        cols, seen = [], set()
        for i, h in enumerate(hdr):
            if h is None:
                if any(x is not None for x in hdr[i + 1:]):
                    dropped.append((ws.title, f'(blank header, column {i + 1})', 'Column has no name'))
                continue
            raw = ' '.join(str(h).split())
            base = strip_markers(raw)
            rename = PER_TABLE_RENAME.get((t, i)) or PER_TABLE_RENAME.get((t, base)) or RENAME.get(base)
            col, why = rename if rename else (mechanical(base), None)
            if col in seen:
                dropped.append((ws.title, raw, f'Duplicate of an earlier "{raw}" column in the same sheet'))
                continue
            seen.add(col)
            cols.append(dict(name=col, header=raw, why=why, marked_pk='PK' in raw, marked_fk='FK' in raw, fk=None, idx=i))
        if t == 'vciso_sub_function_process_map':
            for c in cols: dropped.append((ws.title, c['header'], 'Sheet only says "To be defined"; table has no columns yet'))
            cols = []
        tables[t] = dict(sheet=ws.title, cols=cols, pk=[c['name'] for c in cols if c['marked_pk']], uniques=[], note=None)

    # RCSA mixes two kinds of row (a control area, then its sub-controls), so it becomes two tables.
    rcsa = tables.pop('rcsa')
    audit = [c for c in rcsa['cols'] if c['name'] in ('active', 'created_at', 'created_by', 'updated_at', 'updated_by')]
    area_cols = [col_ for col_ in rcsa['cols'] if col_['name'] in ('control_area_id', 'major_control_area')] + audit
    # The new control_area_id link goes last, after the sheet's own columns.
    sub_cols = [dict(name='sub_control_id', **{k: v for k, v in next(c for c in rcsa['cols'] if c['name'] == 'sub_control_id').items() if k != 'name'})] \
        + [c for c in rcsa['cols'] if c['name'] in ('sub_control_area', 'framework_id', 'control_id', 'document_id')] \
        + [dict(c) for c in audit] \
        + [dict(name='control_area_id', header='(new)', why=None, marked_pk=False, marked_fk=False, fk=None, idx=None)]
    tables['rcsa_control_area'] = dict(sheet='RCSA', cols=area_cols, pk=[], uniques=[],
                                       note='Area rows of the RCSA sheet (rows with "Major Control Area" filled)')
    tables['rcsa_sub_control'] = dict(sheet='RCSA', cols=sub_cols, pk=[], uniques=[],
                                      note='Sub-control rows of the RCSA sheet')

    for t, (pk, _) in PK_DECISIONS.items():
        tables[t]['pk'] = pk
    for t, (u, _) in UNIQUE_DECISIONS.items():
        tables[t]['uniques'] = u
    for t, added in COLUMNS_ADDED.items():
        for after, name, typ, why in added:
            cols = tables[t]['cols']
            pos = next(i for i, c in enumerate(cols) if c['name'] == after) + 1
            cols.insert(pos, dict(name=name, header='(new)', why=why, marked_pk=False, marked_fk=False, fk=None,
                                  idx=None, type=typ))

    def col(t, name):
        return next(c for c in tables[t]['cols'] if c['name'] == name)

    # foreign keys
    fks = []        # (table, child cols, parent table, parent cols, origin)
    fk_skipped = []  # (table, column, reason)
    for t, tb in tables.items():
        names = {c['name'] for c in tb['cols']}
        done = set()
        for c in tb['cols']:
            n = c['name']
            wanted = c['marked_fk'] or (t, n) in FK_ADDED
            if not wanted: continue
            if (t, n) in FK_SKIPPED:
                fk_skipped.append((t, n, FK_SKIPPED[(t, n)])); continue
            if n not in REF:
                fk_skipped.append((t, n, 'No table has this as its key')); continue
            pt, pcols = REF[n]
            if pt == t:
                fk_skipped.append((t, n, 'Marked FK + PK, but this table is where it is defined; nothing else to point at')); continue
            child = [n] if len(pcols) == 1 else pcols
            if not all(x in names for x in child):
                fk_skipped.append((t, n, f'{pt} key is ({", ".join(pcols)}); this table lacks {", ".join(x for x in child if x not in names)}'))
                continue
            if (pt, tuple(child)) in done: continue
            done.add((pt, tuple(child)))
            origin = 'added' if (t, n) in FK_ADDED else 'sheet'
            fks.append((t, child, pt, pcols, origin))
            c['fk'] = f'{pt}({", ".join(pcols)})'

    # types; FK children take the parent column's type
    for tb in tables.values():
        for c in tb['cols']:
            if 'type' not in c: c['type'] = ctype(c['name'], c['header'])
    ptype = {(t, c['name']): c['type'] for t, tb in tables.items() for c in tb['cols']}
    for t, ccols, pt, pcols, _ in fks:
        for cc, pc in zip(ccols, pcols):
            col(t, cc)['type'] = ptype[(pt, pc)]

    return dict(wb=wb, tables=tables, fks=fks, fk_skipped=fk_skipped, dropped=dropped, rcsa=rcsa)


# ---------------------------------------------------------------- SQL


def q(s):
    return "'" + s.replace("'", "''") + "'"


def main():
    XLSX = sys.argv[1]
    schema = load_schema(XLSX)
    wb, tables, fks, fk_skipped, dropped, rcsa = (schema[k] for k in ('wb', 'tables', 'fks', 'fk_skipped', 'dropped', 'rcsa'))

    def col(t, name):
        return next(c for c in tables[t]['cols'] if c['name'] == name)

    out = ['-- Generated by db/generate_schema.py from "docs/Master-Framework v13.0 Control-Framework Map.xlsx".',
           '-- Do not edit by hand: change the workbook or the DECISIONS in the generator and regenerate.',
           '-- Every difference from the workbook is listed in db/SCHEMA_DIFF.md.',
           '--', '-- Runs automatically when the db container starts with an empty data volume.', '']
    for t, tb in tables.items():
        lines = []
        for c in tb['cols']:
            d = f"  {c['name']} {c['type']}"
            if c['name'] == 'created_at': d += ' NOT NULL DEFAULT now()'
            lines.append(d)
        if tb['pk']: lines.append(f"  PRIMARY KEY ({', '.join(tb['pk'])})")
        for u in tb['uniques']: lines.append(f"  UNIQUE ({', '.join(u)})")
        out.append(f'CREATE TABLE {t} (' + ('\n' + ',\n'.join(lines) + '\n' if lines else '') + ');')
        out.append(f"COMMENT ON TABLE {t} IS {q(tb['sheet'] + (' - ' + tb['note'] if tb['note'] else ''))};")
        for c in tb['cols']:
            if c['header'] != c['name']: out.append(f"COMMENT ON COLUMN {t}.{c['name']} IS {q(c['header'])};")
        out.append('')
    out.append('-- Foreign keys (added after all tables exist so creation order does not matter)')
    for t, cc, pt, pc, _ in fks:
        out.append(f"ALTER TABLE {t} ADD CONSTRAINT {('fk_' + t + '_' + '_'.join(cc))[:63]} "
                   f"FOREIGN KEY ({', '.join(cc)}) REFERENCES {pt} ({', '.join(pc)});")
    open(SQL_OUT, 'w', encoding='utf-8').write('\n'.join(out) + '\n')

    # ---------------------------------------------------------------- SCHEMA_DIFF.md

    md = []
    w = md.append
    w('# Database vs. workbook: every difference')
    w('')
    w(f'Workbook: `docs/{os.path.basename(XLSX)}`  ')
    w('Schema: `db/init/001_framework_tables.sql` (generated by `db/generate_schema.py`, which also writes this file)')
    w('')
    w(f'Totals: {len(tables)} tables, {sum(len(t["cols"]) for t in tables.values())} columns, '
      f'{sum(1 for t in tables.values() if t["pk"])} primary keys, {len(fks)} foreign keys, '
      f'{sum(len(t["uniques"]) for t in tables.values())} unique constraint(s).')
    w('')
    w('## 1. Sheets not turned into tables')
    w('')
    for ws in wb.worksheets[:SKIP_SHEETS]:
        w(f'- **{ws.title}**: diagram / UI mock-up, not a data table')
    w('')
    w('## 2. Table structure changes')
    w('')
    w('- **RCSA** is split into two tables. The sheet mixes two kinds of row: a control-area row '
      '(e.g. 100001 "IT Governance Controls") followed by its sub-control rows (1000010001 "Approved IT policies...").')
    w('  - `rcsa_control_area`: one row per area (from "Framework_ID (FK + PK)" and "Major Control Area").')
    w('  - `rcsa_sub_control`: one row per sub-control, plus a new `control_area_id` column linking it to its area '
      '(the sheet expresses this only by row order).')
    w('- **vCISO_Sub_Function_Process_Map** has no columns: the sheet only says "To be defined".')
    w('- Every table and column name is converted to lowercase snake_case '
      '(e.g. "Master-Customer-Details" -> `master_customer_details`, "Customer_Name" -> `customer_name`). '
      'The original sheet name / header is stored as a database comment on each table and column.')
    w('- **Audit columns** in every sheet: "Date of Creation" / "Date Of Creation" -> `created_at`, '
      '"Date of Update" / "Date Of Updation" -> `updated_at`, "Created BY" -> `created_by`, "Updated By" -> `updated_by`.')
    w('- Notes in brackets in a header are dropped from the name (e.g. "Office_Type (Primary/ Secondary/ Others)" -> `office_type`), '
      'except where listed in section 3.')
    w('')
    w('## 3. Columns renamed beyond plain snake_case')
    w('')
    w('| Sheet | Header in sheet | Column in database | Why |')
    w('|---|---|---|---|')
    seen_rows = set()
    for t, tb in tables.items():
        for c in tb['cols']:
            if c['header'] == '(new)' or c['name'] in ('created_at', 'updated_at'): continue
            if (tb['sheet'], c['header'], c['name']) in seen_rows: continue
            seen_rows.add((tb['sheet'], c['header'], c['name']))
            base = strip_markers(c['header'])
            if c['name'] != mechanical(base) and c['why']:
                w(f"| {tb['sheet']} | {c['header']} | `{c['name']}` | {c['why']} |")
    w('')
    w('## 4. Columns dropped or added')
    w('')
    w('| Sheet | Column | Change | Why |')
    w('|---|---|---|---|')
    for sheet, header, why in dropped:
        w(f'| {sheet} | {header} | Dropped | {why} |')
    w('| RCSA | `rcsa_sub_control.control_area_id` | Added | Links each sub-control to its control area |')
    for t, added in COLUMNS_ADDED.items():
        for _, name, _, why in added:
            w(f"| {tables[t]['sheet']} | `{t}.{name}` | Added | {why} |")
    w('')
    w('## 5. Primary keys that differ from the (PK) markers')
    w('')
    w('| Sheet | Marked PK in sheet | Primary key in database | Why |')
    w('|---|---|---|---|')
    for t, (pk, why) in PK_DECISIONS.items():
        tb = tables[t]
        sheet_t = 'rcsa' if tb['sheet'] == 'RCSA' else t
        marked = [c['header'] for c in (rcsa['cols'] if sheet_t == 'rcsa' else tb['cols']) if c['marked_pk']]
        label = f"{tb['sheet']} (`{t}`)" if tb['sheet'] == 'RCSA' else tb['sheet']
        w(f"| {label} | {', '.join(marked) or '(none)'} | {', '.join(f'`{p}`' for p in pk)} | {why} |")
    w('')
    w('All other tables use exactly the columns marked (PK). Tables with no (PK) marker have no primary key: '
      + ', '.join(f'`{t}`' for t, tb in tables.items() if not tb['pk']) + '.')
    w('')
    w('## 6. Unique constraints not in the sheet')
    w('')
    for t, (u, why) in UNIQUE_DECISIONS.items():
        w(f"- `{t}`: unique ({', '.join(u[0])}). {why}.")
    w('')
    w('## 7. Foreign keys added without an (FK) marker')
    w('')
    for (t, n), why in FK_ADDED.items():
        w(f'- `{t}.{n}` -> {col(t, n)["fk"]}: {why}.')
    w('- `customer_api_map.tool_id` has no (FK) marker but is part of the `tool_id` + `api_id` FK to `tool_api_map`, '
      'because API_ID (FK) can only be referenced together with Tool_ID.')
    w('')
    w('## 8. (FK) markers with no foreign key in the database')
    w('')
    w('| Table | Column | Why |')
    w('|---|---|---|')
    for t, n, why in fk_skipped:
        w(f'| {t} | `{n}` | {why} |')
    w('')
    w('## 9. Foreign keys where the target had to be chosen')
    w('')
    w('The (FK) marker says a column is a foreign key but not what it points at. These were matched by meaning, not by name:')
    w('')
    w('- `address_id` -> `master_customer_address_details.office_id` (values are office IDs, e.g. Cust_00101_001).')
    w('- `owner_id`, `user_id_from`, `user_id_to` -> `customer_framework_users.user_id`.')
    w('- `tool_id` + `api_id` -> `tool_api_map` together (its key is both columns).')
    w('- Everything else points at the table where the same-named column is the primary key.')
    w('')
    w('## 10. Things the database adds that the sheet does not specify')
    w('')
    w('- **Data types.** The sheet has none; each column is typed from its name and sample values:')
    w('  - Y/N columns -> true/false (`boolean`; Postgres accepts \'Y\'/\'N\' when inserting).')
    w('  - Date columns -> `date`; date-time columns and the audit `created_at` / `updated_at` -> timestamp with time zone.')
    w('  - Money columns (Amount, Value) -> `numeric(15,2)`; counts, years and frequencies -> `integer`.')
    w('  - IDs follow their sample values: numeric IDs (Framework_ID, FY_ID, Clause_Control_ID, Tool_ID, API_ID...) are numbers; '
      'text IDs (Cust_00101, Role_0001...) are text.')
    w('  - A foreign-key column always gets the same type as the column it points at. '
      'Customer-API-Map.Tool_ID is therefore a number although its sample values are "Tool_1", "Tool_2".')
    w('  - Everything else -> `text`.')
    w('- **Defaults.** `created_at` is filled with the current time automatically and cannot be empty.')
    w('- **Required columns.** Primary key columns cannot be empty (a database rule).')
    w('')
    w('## 11. Sample data in the sheet that the database would reject')
    w('')
    w('No data is loaded, only structure. If the sample rows were imported as they are:')
    w('')
    w('- **Master-Clause-Control-Map**: Clause_Control_ID repeats (10201 for 4.1, 4.2, 4.3...) and DPDPA uses text codes (DPDP-CN-01). '
      'Client builds (db/generate_client_schema.py) renumber controls 102001, 102002... in sheet order and keep the sheet\'s ID '
      'in `source_clause_control_id` (section 4). Inserting a row in the middle of the sheet shifts every later number, '
      'so stable IDs in the workbook are still needed before client databases are upgraded in place.')
    w('- **Customer sheets vs. Master-Clause-Control-Map**: customer sheets use 102001, 102002... for controls the master numbers 10201...; '
      'IDs must match across sheets or the foreign keys reject them.')
    w('- **Customer-Asset-Owner**: Asset_ID repeats (10201 four times for Cust_00101); looks copied from the control IDs.')
    w('- **UI-Report-Dashboard-List**: UI_ID repeats with different categories (UI_RD_0002 is both a Report and a Screen).')
    w('- **Financial Year Master**: Country_ID blank (fine now that it is not part of the key).')
    w('- **Blank key / reference values** in many rows (e.g. Customer_ID blank on continuation rows of Customer-Contract-Framework-Map '
      'and Customer-FY-Invoices); every row needs its own values.')
    w('- **Placeholder text in date / user columns** ("Future Date", "System Date", "(User ID)") are notes, not values.')
    w('')
    w('## 12. Full column map')
    w('')
    for t, tb in tables.items():
        w(f"### `{t}` <- {tb['sheet']}")
        w('')
        if not tb['cols']:
            w('(no columns)'); w(''); continue
        w('| Column | Type | Key | Header in sheet |')
        w('|---|---|---|---|')
        for c in tb['cols']:
            key = []
            if c['name'] in tb['pk']: key.append('PK')
            if c['fk']: key.append(f"FK -> {c['fk']}")
            if any(c['name'] in u for u in tb['uniques']): key.append('UNIQUE')
            w(f"| `{c['name']}` | {c['type']} | {'; '.join(key)} | {c['header']} |")
        w('')
    open(DIFF_OUT, 'w', encoding='utf-8').write('\n'.join(md) + '\n')

    print(f'{len(tables)} tables, {len(fks)} FKs -> {os.path.relpath(SQL_OUT, ROOT)}, {os.path.relpath(DIFF_OUT, ROOT)}')


if __name__ == '__main__':
    main()
