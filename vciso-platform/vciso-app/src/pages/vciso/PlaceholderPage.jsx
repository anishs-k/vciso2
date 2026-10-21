import React from 'react';

export default function PlaceholderPage({ title, desc, icon = '🚧' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-24 px-8 text-center font-sans bg-slate-50 text-slate-900">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-3xl mb-5 shadow-sm">
        {icon}
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">{title}</h1>
      <p className="text-slate-500 text-sm max-w-md leading-relaxed mb-6">{desc}</p>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 shadow-sm">
        <span>🔨</span> Coming soon — in active development
      </div>
    </div>
  );
}
