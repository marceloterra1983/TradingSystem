'use client';

import { useState } from 'react';
import api from '@/lib/api/fetcher';

export default function ArtifactsPage() {
  const [jobId, setJobId] = useState('job-hotmart-2025-11-08');
  const [artifacts, setArtifacts] = useState<string[]>([]);

  const handleLoad = async () => {
    const { data } = await api.get(`/api/jobs/${jobId}/artifacts`);
    setArtifacts(data.artifacts ?? []);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Artefatos</h2>
      <div className="flex gap-2">
        <input className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={jobId} onChange={(e) => setJobId(e.target.value)} />
        <button onClick={handleLoad} type="button" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">
          Carregar
        </button>
      </div>
      <ul className="space-y-2 text-sm text-slate-300">
        {artifacts.map((artifact) => (
          <li key={artifact} className="rounded border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs">
            {artifact}
          </li>
        ))}
        {!artifacts.length && <li className="text-slate-500">Nenhum artefato listado ainda.</li>}
      </ul>
    </section>
  );
}
