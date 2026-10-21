import React, { useEffect, useState, useRef } from 'react';

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const TAG_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700', 'bg-red-100 text-red-700', 'bg-yellow-100 text-yellow-700',
  'bg-teal-100 text-teal-700', 'bg-pink-100 text-pink-700',
];
let tagColorMap = {};
let colorIdx = 0;
function tagColor(tag) {
  if (!tagColorMap[tag]) { tagColorMap[tag] = TAG_COLORS[colorIdx++ % TAG_COLORS.length]; }
  return tagColorMap[tag];
}

export default function EvidenceUpload({ activeClient }) {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lastUpload, setLastUpload] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef();

  const fetchEvidence = () => {
    const url = activeClient ? `/api/evidence?client_id=${activeClient.id}` : '/api/evidence';
    fetch(url)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setEvidence(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchEvidence(); }, [activeClient]);

  const uploadFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    setLastUpload(null);
    setUploadError('');
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('files', f));
    if (activeClient) fd.append('client_id', activeClient.id);
    try {
      const res = await fetch('/api/evidence/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`Upload failed (HTTP ${res.status})`);
      const data = await res.json();
      setLastUpload(Array.isArray(data.uploaded) ? data.uploaded : []);
      fetchEvidence();
    } catch (e) {
      setUploadError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Evidence Upload</h1>
        <p className="text-gray-500 mt-1">
          {activeClient ? `Uploading evidence for ${activeClient.name}` : 'Upload security evidence files — auto-tagging enabled'}
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all mb-6 ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input ref={fileRef} type="file" multiple className="hidden" onChange={e => uploadFiles(e.target.files)} />
        <div className="text-5xl mb-3">{uploading ? '⏳' : '📁'}</div>
        <div className="font-semibold text-gray-700 text-base">
          {uploading ? 'Uploading & auto-tagging...' : 'Drop files here or click to browse'}
        </div>
        <div className="text-sm text-gray-400 mt-1">Supports PDF, Word, Excel, images, CSV — up to 50MB per file</div>
      </div>

      {/* Last upload result */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
          ⚠ {uploadError}
        </div>
      )}

      {lastUpload && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
          <div className="font-semibold text-green-800 mb-3">✓ Uploaded {lastUpload.length} file(s) — auto-tags applied:</div>
          {lastUpload.map(f => (
            <div key={f.id} className="flex items-start gap-3 mb-2">
              <span className="text-sm font-medium text-gray-700 w-48 truncate flex-shrink-0">{f.original_name}</span>
              <div className="flex flex-wrap gap-1">
                {f.tags.length > 0
                  ? f.tags.map(tag => <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagColor(tag)}`}>{tag}</span>)
                  : <span className="text-xs text-gray-400">No tags detected</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Evidence list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Evidence Library</h2>
          <span className="text-sm text-gray-400">{evidence.length} files</span>
        </div>
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading...</div>
        ) : evidence.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📂</div>
            <div className="text-gray-400 font-medium">No evidence uploaded yet</div>
            <div className="text-gray-400 text-sm mt-1">Upload files above to get started</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {evidence.map(f => (
              <div key={f.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition">
                <div className="text-2xl flex-shrink-0">{fileIcon(f.mimetype, f.original_name)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">{f.original_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{formatSize(f.size)} · {new Date(f.uploaded_at).toLocaleDateString()}</div>
                </div>
                <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                  {(f.tags || []).map(tag => (
                    <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagColor(tag)}`}>{tag}</span>
                  ))}
                  {(!f.tags || f.tags.length === 0) && (
                    <span className="text-xs text-gray-300">untagged</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function fileIcon(mime, name) {
  if (!mime) return '📄';
  if (mime === 'application/pdf') return '📕';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.includes('spreadsheet') || mime.includes('excel') || name?.endsWith('.csv')) return '📊';
  if (mime.includes('word') || name?.endsWith('.docx')) return '📝';
  return '📄';
}
