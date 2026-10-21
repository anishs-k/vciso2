// Gap-assessment questionnaires (assessment, assessment_response): the client answers on the
// questionnaire pages, the vCISO reviews each answer. Proof files are evidence in customer_transactions.
const crypto = require('crypto');
const express = require('express');
const db = require('../../db');
const ctx = require('../../core/context');

const router = express.Router();
const { wrap, customerId } = ctx;

const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });
// Questionnaires the UI has that are not a workbook framework.
const NON_FRAMEWORK_QUESTIONNAIRES = ['cspm'];
const REVIEW = ['pending', 'accepted', 'verified', 'rejected', 'needs_remediation'];

// Any spelling the UI uses -> the questionnaire's key (iso27001-2022, dpdp, cspm, ...).
function questionnaireKey(k) {
  const s = String(k || '').toLowerCase();
  if (s.includes('dpdp')) return 'dpdp';
  if (s.includes('cspm')) return 'cspm';
  if (s.includes('27001')) return 'iso27001-2022';
  return s;
}

const ASSESSMENT_SQL = `
  SELECT a.assessment_id AS id, a.customer_id AS client_id, c.customer_name AS company_name, c.customer_name AS client_name,
         ad.industry AS client_industry, a.questionnaire AS framework_id, COALESCE(a.framework_name, mf.standard) AS framework_name,
         a.cycle_no, a.status, a.respondent_name, a.respondent_email, a.target_date, a.readiness_score::float AS readiness_score,
         a.summary, a.submitted_at, COALESCE(a.updated_at, a.created_at) AS updated_at
    FROM assessment a JOIN master_customer_details c ON c.customer_id = a.customer_id
    LEFT JOIN master_customer_address_details ad ON ad.customer_id = a.customer_id AND ad.office_type = 'Primary'
    LEFT JOIN master_framework mf ON mf.framework_id = a.framework_id
   WHERE a.customer_id = $1`;

// One answer as the review pages read it; proof_files_json is a JSON string, the proof_file_* columns
// describe the first file (older UI code reads those).
function toResponse(r) {
  const files = (r.proof_files || []).map((f) => ({
    ...f, url: f.id ? `/api/evidence/file/${f.id}` : null, download_url: f.id ? `/api/evidence/download/${f.id}` : null,
  }));
  const first = files[0] || {};
  return {
    id: r.response_id, assessment_id: r.assessment_id, question_id: r.question_id, reference: r.reference,
    clause_control_id: r.clause_control_id, response_value: r.response_value, score: r.score === null ? null : Number(r.score),
    status: r.status, notes: r.notes, proof_files_json: JSON.stringify(files),
    proof_file_name: first.name || null, proof_file_size: first.size || null, proof_file_type: first.type || null,
    proof_file_id: first.id || null, proof_file_url: first.url || null,
    vciso_review_status: r.vciso_review_status, vciso_notes: r.vciso_notes, vciso_rejection_reason: r.vciso_rejection_reason,
    reviewed_by: r.reviewer_name || r.reviewed_by, reviewed_at: r.reviewed_at, updated_at: r.updated_at,
  };
}

async function responses(assessmentId) {
  const { rows } = await db.query(
    `SELECT r.*, u.user_name AS reviewer_name FROM assessment_response r
       LEFT JOIN customer_framework_users u ON u.user_id = r.reviewed_by
      WHERE r.assessment_id = $1 ORDER BY r.question_id`, [assessmentId]);
  return rows.map(toResponse);
}

// The latest assessment of a questionnaire (highest cycle), or null.
async function current(key) {
  const { rows } = await db.query(`${ASSESSMENT_SQL} AND a.questionnaire = $2 ORDER BY a.cycle_no DESC LIMIT 1`,
    [customerId(), questionnaireKey(key)]);
  return rows[0] || null;
}

router.get('/vciso/assessments', wrap(async (_req, res) => {
  const { rows } = await db.query(`${ASSESSMENT_SQL} ORDER BY a.updated_at DESC NULLS LAST, a.created_at DESC`, [customerId()]);
  res.json(rows);
}));

router.get('/vciso/assessments/client/:clientId', ctx.ownClient(), wrap(async (req, res) => {
  const a = await current(req.query.frameworkId);
  res.json({ assessment: a, responses: a ? await responses(a.id) : [] });
}));

// By ID; also the Gap Analysis page's made-up "assess-<client>-<questionnaire>" IDs.
router.get('/vciso/assessments/:id', wrap(async (req, res) => {
  const prefix = `assess-${customerId()}-`;
  const a = req.params.id.startsWith(prefix)
    ? await current(req.params.id.slice(prefix.length))
    : (await db.query(`${ASSESSMENT_SQL} AND a.assessment_id = $2`, [customerId(), req.params.id])).rows[0];
  if (!a) throw httpError(404, 'No assessment stored yet');
  res.json({ ...a, responses: await responses(a.id) });
}));

// The control an answer is about, when its reference is a control of a licensed framework.
async function controlFor(frameworkId, ref) {
  if (!frameworkId || !ref) return null;
  const { rows } = await db.query(
    `SELECT m.clause_control_id FROM master_clause_control_map m JOIN master_framework mf ON mf.framework_id = m.framework_id
      WHERE m.framework_id = $1 AND ${ctx.UI_CONTROL_ID} = $2`, [frameworkId, String(ref)]);
  return rows[0]?.clause_control_id ?? null;
}

const proofList = (files) => (Array.isArray(files) ? files : files ? [files] : [])
  .filter((f) => f && (f.id || f.name))
  .map((f) => ({ id: f.id || null, name: f.name || f.original_name || f.filename || null, size: f.size || null, type: f.type || f.mimetype || null }));

// A questionnaire submission. Re-submitting updates the current cycle; an approved assessment starts a
// new cycle. An answer the vCISO rejected goes back to pending review when it is resubmitted.
router.post('/vciso/assessments/submit', wrap(async (req, res) => {
  const b = req.body;
  if (b.clientId && b.clientId !== customerId()) throw httpError(404, 'Unknown client');
  const key = questionnaireKey(b.frameworkId);
  if (!key) throw httpError(400, 'frameworkId is required');
  const f = NON_FRAMEWORK_QUESTIONNAIRES.includes(key) ? null : await ctx.resolveFramework(key);
  if (!f && !NON_FRAMEWORK_QUESTIONNAIRES.includes(key)) throw httpError(404, `Framework "${b.frameworkId}" is not licensed for this organisation`);
  const answers = b.answers && typeof b.answers === 'object' ? b.answers : {};
  const stats = b.stats || {};
  const readiness = [stats.readinessPct, stats.readiness, stats.overallReadiness, stats.completionPct].find((x) => Number.isFinite(Number(x)));

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await current(key);
    let id = cur?.id;
    if (!cur || cur.status === 'approved') {
      id = `ASM_${crypto.randomUUID()}`;
      await client.query(
        `INSERT INTO assessment (assessment_id, customer_id, questionnaire, framework_id, framework_name, cycle_no)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, customerId(), key, f?.framework_id ?? null, b.frameworkName || f?.standard || key, (cur?.cycle_no || 0) + 1]);
    }
    await client.query(
      `UPDATE assessment SET status = 'submitted', submitted_at = now(), submitted_by = $2, respondent_name = $3,
              respondent_email = $4, target_date = $5, readiness_score = $6, summary = $7, updated_at = now()
        WHERE assessment_id = $1`,
      [id, req.user.user_id, b.respondentName || b.submittedBy || req.user.name, b.respondentEmail || req.user.email,
       b.targetDate || null, readiness === undefined ? null : Number(readiness),
       JSON.stringify({ stats, themeBreakdown: b.themeBreakdown || null, disclaimer: b.disclaimer || null })]);
    for (const [qId, raw] of Object.entries(answers)) {
      const ans = raw && typeof raw === 'object' ? raw : { value: raw };
      await client.query(
        `INSERT INTO assessment_response (response_id, assessment_id, question_id, reference, clause_control_id, response_value,
           score, status, notes, proof_files)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (assessment_id, question_id) DO UPDATE SET reference = EXCLUDED.reference,
           clause_control_id = EXCLUDED.clause_control_id, response_value = EXCLUDED.response_value, score = EXCLUDED.score,
           status = EXCLUDED.status, notes = EXCLUDED.notes, proof_files = EXCLUDED.proof_files, updated_at = now(),
           vciso_review_status = CASE WHEN assessment_response.vciso_review_status = 'rejected' THEN 'pending'
                                      ELSE assessment_response.vciso_review_status END`,
        [`RSP_${crypto.randomUUID()}`, id, qId, ans.reference || null, await controlFor(f?.framework_id, ans.reference),
         ans.value === undefined || ans.value === null ? null : String(ans.value),
         Number.isFinite(Number(ans.score)) && ans.score !== null && ans.score !== '' ? Number(ans.score) : null,
         ans.status || null, (b.notes || {})[qId] || null, JSON.stringify(proofList((b.files || {})[qId]))]);
    }
    await client.query('COMMIT');
    res.json({ success: true, assessmentId: id, responses: Object.keys(answers).length });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// vCISO review of one answer. The UI may send an ID it made up ("resp-..."); then the answer is
// found by assessment + question (or, from Gap Analysis, by the questionnaire and question in the ID).
router.patch('/vciso/assessments/responses/:id/verify', wrap(async (req, res) => {
  const b = req.body;
  if (!REVIEW.includes(b.reviewStatus)) throw httpError(400, `reviewStatus must be one of ${REVIEW.join(', ')}`);
  let assessmentId = b.assessmentId;
  let questionId = b.questionId;
  const gap = `resp-assess-${customerId()}-`;
  if (!assessmentId && req.params.id.startsWith(gap)) {
    const rest = req.params.id.slice(gap.length);
    const cut = rest.lastIndexOf('-');
    assessmentId = (await current(rest.slice(0, cut)))?.id;
    questionId = rest.slice(cut + 1);
  }
  const { rows } = await db.query(
    `UPDATE assessment_response r SET vciso_review_status = $4, vciso_notes = $5, vciso_rejection_reason = $6,
            reviewed_by = $7, reviewed_at = now()
       FROM assessment a
      WHERE a.assessment_id = r.assessment_id AND a.customer_id = $1
        AND (r.response_id = $2 OR (r.assessment_id = $3 AND r.question_id = $8))
      RETURNING r.response_id, r.assessment_id`,
    [customerId(), req.params.id, assessmentId || null, b.reviewStatus, b.vcisoNotes || null, b.rejectionReason || null,
     req.user.user_id, questionId || null]);
  if (!rows[0]) throw httpError(404, 'This answer has not been submitted yet');
  await db.query(
    `UPDATE assessment SET status = 'in_review', updated_at = now() WHERE assessment_id = $1 AND status = 'submitted'`,
    [rows[0].assessment_id]);
  res.json({ responseId: rows[0].response_id, reviewStatus: b.reviewStatus, reviewedBy: req.user.name, reviewedAt: new Date().toISOString() });
}));

module.exports = { router, questionnaireKey, NON_FRAMEWORK_QUESTIONNAIRES };
