import { useState, useMemo } from 'react';
import { useAdminData } from '../../contexts/AdminDataContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Loader, Empty, ClientAvatar } from './OwnerShared';
import { readBillingDetails } from './OwnerPortalBilling';
import { th } from '../../theme';

const REPORT_CARDS = [
  {
    id: 'revenue-summary',
    icon: '💰',
    title: 'Revenue Summary',
    description: 'Monthly and annual revenue breakdown, trends, and forecasts across all clients.',
  },
  {
    id: 'client-portfolio',
    icon: '👥',
    title: 'Client Portfolio',
    description: 'Overview of all client engagements, contract values, and relationship health.',
  },
  {
    id: 'invoice-report',
    icon: '🧾',
    title: 'Invoice Report',
    description: 'Full history of invoices issued, paid, outstanding, and overdue amounts.',
  },
  {
    id: 'cost-analysis',
    icon: '📊',
    title: 'Cost Analysis',
    description: 'Detailed cost breakdown by service line, client, and time period.',
  },
  {
    id: 'service-adoption',
    icon: '🚀',
    title: 'Service Adoption',
    description: 'Which services are most used, retention rates, and upsell opportunities.',
  },
  {
    id: 'growth-report',
    icon: '📈',
    title: 'Growth Report',
    description: 'Client acquisition, churn, net revenue retention, and growth trajectory.',
  },
];

const MOCK_RECENT_REPORTS = [
  {
    id: 1,
    name: 'Revenue Summary — May 2026',
    generated: '2026-06-01',
    type: 'Revenue',
    typeColor: '#7c3aed',
  },
  {
    id: 2,
    name: 'Invoice Report — Q1 2026',
    generated: '2026-04-03',
    type: 'Invoice',
    typeColor: '#0891b2',
  },
  {
    id: 3,
    name: 'Client Portfolio — Full',
    generated: '2026-03-15',
    type: 'Portfolio',
    typeColor: '#059669',
  },
  {
    id: 4,
    name: 'Growth Report — 2025 Annual',
    generated: '2026-01-10',
    type: 'Growth',
    typeColor: '#d97706',
  },
];

const styles = {
  page: {
    background: th('#f8fafc', { dark: '#0F172A' }),
    minHeight: '100vh',
    padding: '32px 28px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    boxSizing: 'border-box',
  },
  header: {
    marginBottom: '32px',
  },
  headerTitle: {
    fontSize: '26px',
    fontWeight: '700',
    color: th('#1e293b', { dark: '#F1F5F9' }),
    margin: '0 0 6px 0',
  },
  headerSubtitle: {
    fontSize: '14px',
    color: th('#64748b', { dark: '#94A3B8' }),
    margin: 0,
  },
  sectionTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: th('#1e293b', { dark: '#F1F5F9' }),
    margin: '0 0 16px 0',
  },

  // Key Metrics
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '36px',
  },
  metricCard: {
    background: th('#fff', { dark: '#1E293B' }),
    border: `1px solid ${th('#e2e8f0', { dark: '#334155' })}`,
    borderRadius: th('2px', { classic: '12px', dark: '12px' }),
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  metricLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: th('#1e293b', { dark: '#F1F5F9' }),
    lineHeight: 1.1,
  },
  metricAccent: {
    width: '36px',
    height: '4px',
    borderRadius: '2px',
    background: '#7c3aed',
    marginTop: '4px',
  },

  // Report Cards Grid
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
    marginBottom: '40px',
  },
  reportCard: {
    background: th('#fff', { dark: '#1E293B' }),
    border: `1px solid ${th('#e2e8f0', { dark: '#334155' })}`,
    borderRadius: th('2px', { classic: '12px', dark: '12px' }),
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  reportCardHover: {
    boxShadow: '0 4px 16px rgba(124,58,237,0.12)',
    borderColor: '#c4b5fd',
  },
  reportCardIcon: {
    fontSize: '28px',
    lineHeight: 1,
  },
  reportCardTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: th('#1e293b', { dark: '#F1F5F9' }),
    margin: 0,
  },
  reportCardDesc: {
    fontSize: '13px',
    color: th('#64748b', { dark: '#94A3B8' }),
    lineHeight: '1.5',
    margin: 0,
    flexGrow: 1,
  },
  generateBtn: {
    alignSelf: 'flex-start',
    background: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: th('2px', { classic: '8px', dark: '8px' }),
    padding: '8px 18px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '4px',
    transition: 'background 0.15s ease',
  },
  generateBtnHover: {
    background: '#6d28d9',
  },
  generateBtnLoading: {
    background: '#a78bfa',
    cursor: 'not-allowed',
  },
  cardAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: th('#3182CE', { classic: 'linear-gradient(90deg, #7c3aed, #a78bfa)', dark: 'linear-gradient(90deg, #7c3aed, #a78bfa)' }),
    borderRadius: '12px 12px 0 0',
  },

  // Recent Reports
  recentTable: {
    background: th('#fff', { dark: '#1E293B' }),
    border: `1px solid ${th('#e2e8f0', { dark: '#334155' })}`,
    borderRadius: th('2px', { classic: '12px', dark: '12px' }),
    overflow: 'hidden',
    marginBottom: '40px',
  },
  tableHeaderRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 140px 120px 110px',
    background: th('#f8fafc', { dark: '#0F172A' }),
    borderBottom: `1px solid ${th('#e2e8f0', { dark: '#334155' })}`,
    padding: '10px 20px',
    gap: '12px',
  },
  tableHeaderCell: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 140px 120px 110px',
    borderBottom: `1px solid ${th('#f1f5f9', { dark: '#172033' })}`,
    padding: '14px 20px',
    gap: '12px',
    alignItems: 'center',
  },
  tableRowLast: {
    borderBottom: 'none',
  },
  reportName: {
    fontSize: '14px',
    fontWeight: '600',
    color: th('#1e293b', { dark: '#F1F5F9' }),
  },
  reportDate: {
    fontSize: '13px',
    color: th('#64748b', { dark: '#94A3B8' }),
  },
  typeBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: th('2px', { classic: '20px', dark: '20px' }),
    fontSize: '11px',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: '0.04em',
  },
  downloadBtn: {
    background: 'transparent',
    border: `1px solid ${th('#e2e8f0', { dark: '#334155' })}`,
    borderRadius: th('2px', { classic: '7px', dark: '7px' }),
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#7c3aed',
    cursor: 'pointer',
    transition: 'background 0.12s, border-color 0.12s',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  downloadBtnHover: {
    background: th('#f5f3ff', { dark: '#2E1065' }),
    borderColor: '#c4b5fd',
  },

  // Toast/notification
  toast: {
    position: 'fixed',
    bottom: '28px',
    right: '28px',
    background: '#1e293b',
    color: '#fff',
    padding: '12px 22px',
    borderRadius: th('2px', { classic: '10px', dark: '10px' }),
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    animation: 'none',
  },
};

function MetricCard({ label, value, accent }) {
  return (
    <div style={styles.metricCard}>
      <span style={styles.metricLabel}>{label}</span>
      <span style={{ ...styles.metricValue, color: accent || th('#1e293b', { dark: '#F1F5F9' }) }}>{value}</span>
      <div style={{ ...styles.metricAccent, background: accent || '#7c3aed' }} />
    </div>
  );
}

function ReportCardItem({ card, onGenerate, generating }) {
  const [hovered, setHovered] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);
  const isGenerating = generating === card.id;

  return (
    <div
      style={{
        ...styles.reportCard,
        ...(hovered ? styles.reportCardHover : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.cardAccentBar} />
      <div style={styles.reportCardIcon}>{card.icon}</div>
      <p style={styles.reportCardTitle}>{card.title}</p>
      <p style={styles.reportCardDesc}>{card.description}</p>
      <button
        style={{
          ...styles.generateBtn,
          ...(isGenerating ? styles.generateBtnLoading : btnHovered ? styles.generateBtnHover : {}),
        }}
        onMouseEnter={() => setBtnHovered(true)}
        onMouseLeave={() => setBtnHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (!isGenerating) onGenerate(card.id, card.title);
        }}
        disabled={isGenerating}
        aria-label={`Generate ${card.title}`}
      >
        {isGenerating ? '⏳ Generating…' : '⚡ Generate'}
      </button>
    </div>
  );
}

function RecentReportRow({ report, isLast, onDownload }) {
  const [dlHovered, setDlHovered] = useState(false);

  return (
    <div style={{ ...styles.tableRow, ...(isLast ? styles.tableRowLast : {}) }}>
      <span style={styles.reportName}>{report.name}</span>
      <span style={styles.reportDate}>
        {new Date(report.generated).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </span>
      <span>
        <span
          style={{
            ...styles.typeBadge,
            background: report.typeColor,
          }}
        >
          {report.type}
        </span>
      </span>
      <button
        style={{
          ...styles.downloadBtn,
          ...(dlHovered ? styles.downloadBtnHover : {}),
        }}
        onMouseEnter={() => setDlHovered(true)}
        onMouseLeave={() => setDlHovered(false)}
        onClick={() => onDownload(report)}
        aria-label={`Download ${report.name}`}
      >
        ⬇ Download
      </button>
    </div>
  );
}

export default function OwnerPortalReports() {
  const { allClients = [], loading } = useAdminData();
  const { fmt } = useCurrency();

  const [generating, setGenerating] = useState(null);
  const [toast, setToast] = useState(null);

  const metrics = useMemo(() => {
    const total = allClients.length;
    const active = allClients.filter(
      (c) => c.status === 'active' || c.isActive || c.active
    ).length;

    const totalMRR = allClients.reduce((sum, c) => {
      const mrr =
        c.mrr ??
        c.monthlyRecurring ??
        c.monthlyRevenue ??
        (c.annualValue ? c.annualValue / 12 : 0);
      return sum + (Number(mrr) || 0);
    }, 0);

    const totalInvoiced = allClients.reduce((sum, c) => {
      const inv = c.totalInvoiced ?? c.invoiced ?? c.billedTotal ?? 0;
      return sum + (Number(inv) || 0);
    }, 0);

    return { total, active, totalMRR, totalInvoiced };
  }, [allClients]);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  function handleGenerate(id, title) {
    setGenerating(id);
    setTimeout(() => {
      setGenerating(null);
      showToast(`✅ "${title}" generated successfully.`);
    }, 1800);
  }

  function handleDownload(report) {
    showToast(`📥 Downloading "${report.name}"…`);
  }

  if (loading) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader />
      </div>
    );
  }

  const bd = readBillingDetails();

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={styles.headerTitle}>Reports & Analytics</h1>
            <p style={styles.headerSubtitle}>
              Generate, download, and review business reports across your entire client portfolio.
            </p>
          </div>
          {bd.companyName && (
            <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: th('2px', { classic: '12px', dark: '12px' }), padding: '12px 16px', minWidth: '220px', flexShrink: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#7c3aed', marginBottom: '6px' }}>Company Profile</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: th('#0f172a', { dark: '#F1F5F9' }) }}>{bd.companyName}</div>
              {bd.contactPerson && <div style={{ fontSize: '11px', color: th('#64748b', { dark: '#94A3B8' }), marginTop: '2px' }}>{bd.contactPerson}</div>}
              {(bd.gstNumber||bd.panNumber) && <div style={{ fontSize: '11px', color: th('#64748b', { dark: '#94A3B8' }), marginTop: '2px' }}>{[bd.gstNumber&&`GST: ${bd.gstNumber}`,bd.panNumber&&`PAN: ${bd.panNumber}`].filter(Boolean).join(' · ')}</div>}
              {bd.preferredCurrency && <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 600, marginTop: '4px' }}>Currency: {bd.preferredCurrency}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics Snapshot */}
      <section aria-label="Key Metrics Snapshot">
        <h2 style={styles.sectionTitle}>Key Metrics Snapshot</h2>
        <div style={styles.metricsGrid}>
          <MetricCard
            label="Total Clients"
            value={metrics.total}
            accent="#7c3aed"
          />
          <MetricCard
            label="Active Clients"
            value={metrics.active || (metrics.total > 0 ? metrics.total : 0)}
            accent="#059669"
          />
          <MetricCard
            label="Total MRR"
            value={metrics.totalMRR > 0 ? fmt(metrics.totalMRR) : '—'}
            accent="#0891b2"
          />
          <MetricCard
            label="Total Invoiced"
            value={metrics.totalInvoiced > 0 ? fmt(metrics.totalInvoiced) : '—'}
            accent="#d97706"
          />
        </div>
      </section>

      {/* Report Cards */}
      <section aria-label="Available Reports">
        <h2 style={styles.sectionTitle}>Available Reports</h2>
        {allClients.length === 0 ? (
          <Empty message="No client data available to generate reports." />
        ) : (
          <div style={styles.cardsGrid}>
            {REPORT_CARDS.map((card) => (
              <ReportCardItem
                key={card.id}
                card={card}
                onGenerate={handleGenerate}
                generating={generating}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Reports */}
      <section aria-label="Recent Reports">
        <h2 style={styles.sectionTitle}>Recent Reports</h2>
        <div style={styles.recentTable} role="table" aria-label="Recent generated reports">
          <div style={styles.tableHeaderRow} role="row">
            <span style={styles.tableHeaderCell}>Report Name</span>
            <span style={styles.tableHeaderCell}>Generated</span>
            <span style={styles.tableHeaderCell}>Type</span>
            <span style={styles.tableHeaderCell}>Action</span>
          </div>
          {MOCK_RECENT_REPORTS.map((report, idx) => (
            <RecentReportRow
              key={report.id}
              report={report}
              isLast={idx === MOCK_RECENT_REPORTS.length - 1}
              onDownload={handleDownload}
            />
          ))}
        </div>
      </section>

      {/* Toast Notification */}
      {toast && (
        <div style={styles.toast} role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
