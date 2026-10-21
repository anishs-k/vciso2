// Evidence files. A file is stored under CTW_EVIDENCE_DIR (default <instance dir>/evidence; a volume in
// a deployment) with a random name, and recorded as an evidence cycle row in customer_transactions
// (Customer-Transactions sheet): evidence_file_name = original name, folder_location = stored name.
// The stored name is the evidence ID the UI uses.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const db = require('../db');

const DIR = path.resolve(process.env.CTW_EVIDENCE_DIR || path.join(process.env.CTW_INSTANCE_DIR || '.', 'evidence'));
const ID = /^[0-9a-f-]{36}(\.[a-z0-9]{1,8})?$/;

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => fs.mkdir(DIR, { recursive: true }, (err) => cb(err, DIR)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 9);
      cb(null, crypto.randomUUID() + ext);
    },
  }),
  limits: { fileSize: Number(process.env.CTW_EVIDENCE_MAX_MB || 25) * 1024 * 1024, files: 10 },
});

const fileOf = (id) => (ID.test(id) ? path.join(DIR, id) : null);
const sizeOf = (id) => {
  try {
    return fs.statSync(fileOf(id)).size;
  } catch {
    return null;
  }
};

// Download links. The UI opens them as plain links (no Authorization header), so the random stored
// name is the capability: it is only ever shown to signed-in users of this instance.
const downloads = express.Router();
async function send(req, res, asAttachment) {
  const id = req.params.id;
  const file = fileOf(id);
  if (!file || !fs.existsSync(file)) return res.status(404).json({ error: 'No such evidence file' });
  const { rows } = await db.query('SELECT evidence_file_name FROM customer_transactions WHERE folder_location = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'No such evidence file' });
  if (asAttachment) return res.download(file, rows[0].evidence_file_name);
  res.sendFile(file);
}
downloads.get('/evidence/file/:id', (req, res, next) => send(req, res, false).catch(next));
downloads.get('/evidence/download/:id', (req, res, next) => send(req, res, true).catch(next));

function remove(id) {
  const file = fileOf(id);
  if (file) fs.rm(file, { force: true }, () => {});
}

module.exports = { upload, downloads, sizeOf, remove, DIR };
