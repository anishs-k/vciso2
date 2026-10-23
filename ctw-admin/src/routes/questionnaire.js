// The client onboarding questionnaire (intake/questionnaire.py): the empty Excel to send a client, and
// the answers read back from a filled-in one, which the onboarding form fills itself from.
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const db = require('../db');
const { wrap, httpError } = require('../http');
const { runQuestionnaire } = require('../../lib/python');
const { OPTIONS } = require('./catalogue');

const router = express.Router();
const FILENAME = 'Client_Onboarding_Questionnaire.xlsx';

router.get('/template', wrap(async (_req, res) => {
  const { rows: frameworks } = await db.query(
    'SELECT framework_id, framework_name FROM ctw_framework WHERE active ORDER BY framework_id',
  );
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctw-questionnaire-'));
  const file = path.join(dir, FILENAME);
  try {
    await runQuestionnaire(['template', file], { options: OPTIONS, frameworks });
    res.attachment(FILENAME);
    res.send(fs.readFileSync(file));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}));

// Body: { file: <the .xlsx, base64> } -> { answers: { key: value }, warnings: [...] }
router.post('/read', wrap(async (req, res) => {
  const file = req.body?.file;
  if (typeof file !== 'string' || !file) throw httpError(400, 'Choose the filled-in questionnaire (.xlsx) to upload');
  // The choice lists help split free-text answers (contact types, roles, tools) in the client form.
  const out = await runQuestionnaire(['read'], { file, options: OPTIONS });
  if (out.error) throw httpError(400, out.error);
  res.json(out);
}));

module.exports = router;
