// Framework scoping for the per-client records the portal stores in one flat
// list: uploaded evidence and vCISO-authored implementation steps.
//
// The backend hands the client everything it holds for the organisation in a
// single payload, so each view has to narrow that payload to the framework
// currently selected in the sidebar. Without it an ISO record surfaces inside
// the DPDP tab and vice versa.
//
// Kept free of imports so both the client dashboard and VCISOMainPage can use
// it without creating an import cycle.

export const ISO_KEY = 'iso-27001';
export const DPDP_KEY = 'dpdp';
export const CSPM_KEY = 'cspm';

// Maps every spelling in use ('dpdp', 'dpdp-2023', 'DPDP Act, 2023',
// 'iso27001-2022', 'ISO/IEC 27001:2022', 'cspm', 'CSPM', …) onto one
// canonical key.
export function frameworkKeyOf(value) {
  const s = String(value || '').toLowerCase();
  if (!s) return null;
  if (s.includes('dpdp')) return DPDP_KEY;
  if (s.includes('cspm') || s.includes('cloud security posture')) return CSPM_KEY;
  if (s.includes('iso') || s.includes('27001')) return ISO_KEY;
  return null;
}

// Legacy evidence rows predate the framework_id column, so fall back to the
// shape of the clause reference: DPDP cites sections and rules, ISO cites
// numbered clauses and A.x controls.
function inferEvidenceKey(evidence) {
  const ref = String(
    evidence?.reference || evidence?.control_id || evidence?.question_id || ''
  )
    .toLowerCase()
    .trim();

  if (ref.includes('dpdp')) return DPDP_KEY;
  if (/^(s\.\s*\d|section\s*\d|rule\s*\d)/.test(ref)) return DPDP_KEY;
  return ISO_KEY;
}

// CSPM proofs are always written with framework_id 'cspm', so they never need
// the legacy inference above — but they must never fall through to ISO either,
// which is what isEvidenceInFramework below guarantees by comparing keys.


// A record belongs to exactly one framework — never both — so an
// unattributable row resolves to ISO rather than leaking into every tab.
export function isEvidenceInFramework(evidence, framework) {
  const active = frameworkKeyOf(framework) || ISO_KEY;
  return (frameworkKeyOf(evidence?.framework_id) || inferEvidenceKey(evidence)) === active;
}

export function scopeEvidencesToFramework(evidences, framework) {
  return (evidences || []).filter(ev => isEvidenceInFramework(ev, framework));
}

// Step rows written before iso_impl_steps gained framework_id are told apart
// by their id prefix: 'dpdp-step-3' is DPDP, 'step-3' is ISO. A 'custom-…' id
// carries no prefix, which is why the column is the real source of truth.
export function stepFrameworkKey(step) {
  const explicit = frameworkKeyOf(step?.framework_id);
  if (explicit) return explicit;
  const id = String(step?.step_id || step?.id || '').toLowerCase();
  return id.startsWith('dpdp') ? DPDP_KEY : ISO_KEY;
}

export function isStepInFramework(step, framework) {
  return stepFrameworkKey(step) === (frameworkKeyOf(framework) || ISO_KEY);
}

export function scopeStepsToFramework(steps, framework) {
  return (steps || []).filter(s => isStepInFramework(s, framework));
}
