'use client';

import useSWR from 'swr';
import { fetcher } from '../lib/api/fetcher';

const cards = [
  { title: 'Jobs ativos', metric: (data: any) => data?.jobs?.length ?? 0 },
  { title: 'Execuções concluídas', metric: (data: any) => data?.runsCompleted ?? 0 },
  { title: 'Métricas disponíveis', metric: () => 4 },
];

export default function DashboardPage() {
  const { data, isLoading } = useSWR('/api/jobs', fetcher, { refreshInterval: 5000 });
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-wide text-slate-400">Overview</p>
        <h2 className="text-2xl font-semibold">Controle os crawlers e acompanhe os KPIs</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">{card.title}</p>
            <p className="mt-2 text-3xl font-semibold">
              {isLoading ? '...' : card.metric(data ?? { runsCompleted: 0 })}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
