'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api/fetcher';

export default function MetricsPage() {
  const { data, isLoading } = useSWR('/api/jobs', fetcher, { refreshInterval: 4000 });
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Métricas Prometheus</h2>
      <p className="text-sm text-slate-400">Consuma `/api/metrics` ou configure Prometheus apontando para {process.env.NEXT_PUBLIC_API_URL}/api/metrics.</p>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <pre className="text-xs text-slate-300">{isLoading ? 'Carregando...' : JSON.stringify(data, null, 2)}</pre>
      </div>
    </section>
  );
}
