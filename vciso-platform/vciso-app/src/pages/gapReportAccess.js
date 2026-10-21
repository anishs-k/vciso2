// Visibility rules for the post-submission gap analysis report.
//
// The client submits the questionnaire and the vCISO can inspect the findings
// immediately, but the client itself must not read the report until the vCISO
// has audited every single response of that assessment.

const PRIVILEGED_ROLES = ['vciso', 'admin', 'owner', 'vciso_admin'];

export const EMPTY_AUDIT_PROGRESS = {
  total: 0,
  reviewed: 0,
  pending: 0,
  assessmentStatus: null,
  fullyAudited: false,
};

// vCISO / admin side always reads the report, submitted or not.
export function isPrivilegedReportViewer(user) {
  return PRIVILEGED_ROLES.includes(String(user?.role || '').toLowerCase());
}

// A response is audited once the vCISO stamps it with any decision other than
// the default 'pending'. The whole report is audited only when none are left.
export function computeAuditProgress(assessment, responses) {
  const list = Array.isArray(responses) ? responses : [];
  const reviewed = list.filter(
    r => r.vciso_review_status && r.vciso_review_status !== 'pending'
  ).length;
  const assessmentStatus = assessment?.status || null;

  return {
    total: list.length,
    reviewed,
    pending: list.length - reviewed,
    assessmentStatus,
    // The review endpoint stamps 'approved' only when no response is left
    // pending, so it is a safe fallback if the response list did not load.
    fullyAudited:
      (list.length > 0 && reviewed >= list.length) || assessmentStatus === 'approved',
  };
}
