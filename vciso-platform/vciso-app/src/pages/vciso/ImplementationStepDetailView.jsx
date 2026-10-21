import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { C, ALL_ISO_STEPS, STEP_STATUS_CFG } from './AuditConstants';
import DocumentWizardModal from '../../components/DocumentWizardModal';
import Card, { InnerCard } from '../../components/shared/Card';
import SectionHeading from '../../components/shared/SectionHeading';
import { th } from '../../theme';

export default function ImplementationStepDetailView() {
  const { frameworkSlug, stepId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const token = getToken();
  
  const step = ALL_ISO_STEPS.find(s => s.id === stepId);
  const [stepData, setStepData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const loadData = useCallback(async () => {
    if (!step) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/vciso/audit/${encodeURIComponent(frameworkSlug)}/steps`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const rows = await res.json();
        const data = rows.find(r => r.step_id === stepId) || {};
        setStepData(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [frameworkSlug, stepId, step, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateStep = async (field, value) => {
    setSaving(true);
    const updated = { ...stepData, [field]: value };
    setStepData(updated);
    
    try {
      await fetch(`/api/vciso/audit/${encodeURIComponent(frameworkSlug)}/steps/${encodeURIComponent(stepId)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: updated.status || 'not_started', 
          notes: updated.notes || '', 
          owner: updated.owner || '', 
          approver: updated.approver || '', 
          doc_version: updated.doc_version || '1.0', 
          due_date: updated.due_date || ''
        }),
      });
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  if (!step) {
    return (
      <div className="reg-doc">
        <div className="reg-body text-center">
          <div className="reg-title">Implementation step not found</div>
          <button
            onClick={() => navigate(`/dashboard/vciso/audit/${frameworkSlug}?tab=implementation`)}
            className="reg-btn-secondary mt-4"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const st = stepData.status || 'not_started';
  const cfg = STEP_STATUS_CFG?.[st] || { label: 'Not Started', color: th('#64748B', { dark: '#94A3B8' }), bg: th('#F1F5F9', { dark: '#172033' }) };

  return (
    <>
      <button
        onClick={() => navigate(`/dashboard/vciso/audit/${frameworkSlug}?tab=implementation`)}
        className="reg-back-link"
      >
        <span>←</span> Back to Implementation Steps
      </button>

      <Card title={step.title}>
        <p>
          {step.why || 'With this document you need to define clear rules for all of your employees for the use of information systems and other information assets.'}
        </p>

        <div className="flex flex-col md:flex-row gap-5 items-stretch">

          {/* Left card */}
          <InnerCard title="Basic information about this step" className="flex-1">
            <div className="mb-5">
              <div className="reg-label">Covers these ISO 27001 requirements</div>
              <div className="reg-value">controls {step.clause}</div>
            </div>

            <div className="mb-5">
              <div className="reg-label">Estimated workload for completing this step</div>
              <div className="reg-value">{step.workload}</div>
            </div>

            <div className="mb-5">
              <div className="reg-label">Step usually finished in</div>
              <div className="reg-value">{step.duration}</div>
            </div>

            <div className="mb-5">
              <div className="reg-label">Why do this?</div>
              <div className="reg-value-muted">{step.why}</div>
            </div>

            <div>
              <div className="reg-label">Step deadline</div>
              <input
                type="date"
                className="reg-input w-48"
                value={stepData.due_date || ''}
                onChange={e => updateStep('due_date', e.target.value)}
              />
            </div>
          </InnerCard>

          {/* Right card */}
          <InnerCard title="Document / register information" className="flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-y-4 gap-x-3 mb-7 items-center">
              <div className="reg-label">Document status</div>
              <div>
                <select
                  value={st}
                  onChange={e => updateStep('status', e.target.value)}
                  className="reg-input w-auto cursor-pointer"
                >
                  <option value="not_started">Not Set</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="reg-label">Document version</div>
              <div className="reg-value">{stepData.doc_version || 'Not Set'}</div>

              <div className="reg-label">Last update</div>
              <div className="reg-value">
                {stepData.updated_at ? new Date(stepData.updated_at).toLocaleDateString() : 'Not Set'}
              </div>
            </div>

            <SectionHeading>We suggest you include the following people</SectionHeading>

            <div className="mt-4 mb-5">
              <div className="reg-label">Reviewing the document</div>
              <div className="reg-value">{stepData.owner || step.reviewers}</div>
            </div>

            <div className="mb-7">
              <div className="reg-label">Approving the document</div>
              <div className="reg-value">{stepData.approver || step.approvers}</div>
            </div>

            <div className="mt-auto">
              <button
                onClick={() => setShowWizard(true)}
                className="reg-btn-primary w-full justify-center"
              >
                {stepData.doc_content ? 'Edit / View Document Wizard' : 'Open Document Wizard'}
              </button>
            </div>
          </InnerCard>

        </div>

        <div className="reg-group mt-7 mb-0">
          <SectionHeading>Training</SectionHeading>
          <div className="reg-notice-box">
            You will be able to edit this section once you start working on the document.
          </div>
        </div>
      </Card>

      {showWizard && (
        <DocumentWizardModal 
          step={step}
          stepData={stepData}
          frameworkSlug={frameworkSlug}
          token={token}
          onClose={() => setShowWizard(false)}
          onSave={() => {
            loadData();
            setShowWizard(false);
          }}
        />
      )}
    </>
  );
}


