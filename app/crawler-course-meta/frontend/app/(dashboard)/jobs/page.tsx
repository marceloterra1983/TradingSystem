'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { fetcher } from '@/lib/api/fetcher';

export default function JobsPage() {
  const { data, isLoading } = useSWR('/api/jobs', fetcher, { refreshInterval: 5000 });
  const jobs = data?.jobs ?? [];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">Jobs</p>
          <h2 className="text-2xl font-semibold">Gerencie execuções e status</h2>
        </div>
        <Link href="/jobs/new" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">
          Novo job
        </Link>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Plataforma</th>
              <th className="px-4 py-3">URLs</th>
              <th className="px-4 py-3">Output</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-4" colSpan={4}>
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading &&
              jobs.map((job: any) => (
                <tr key={job.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 font-mono text-xs">{job.id}</td>
                  <td className="px-4 py-3 capitalize">{job.platform}</td>
                  <td className="px-4 py-3">{job.start_urls.length}</td>
                  <td className="px-4 py-3">{job.output.format.join(', ')}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
