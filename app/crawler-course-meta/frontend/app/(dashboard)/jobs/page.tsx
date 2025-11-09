'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import api, { fetcher } from '@/lib/api/fetcher';

type Job = {
  id: string;
  platform: string;
  start_urls: string[];
  auth: Record<string, unknown>;
  selectors: Record<string, unknown>;
  output: { format: string[]; directory: string };
};

export default function JobsPage() {
  const { data, isLoading, mutate } = useSWR<{ jobs: Job[] }>('/api/jobs', fetcher, { refreshInterval: 8000 });
  const jobs = data?.jobs ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorValue, setEditorValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleEdit = (job: Job) => {
    setEditingId(job.id);
    setEditorValue(JSON.stringify(job, null, 2));
    setMessage(null);
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm(`Remover job ${jobId}?`)) return;
    try {
      await api.delete(`/api/jobs/${jobId}`);
      if (editingId === jobId) {
        setEditingId(null);
        setEditorValue('');
      }
      setMessage('Job removido.');
      mutate();
    } catch (error) {
      setMessage('Erro ao remover job.');
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!editingId) {
      setMessage('Selecione um job para editar.');
      return;
    }
    setSaving(true);
    try {
      const payload = JSON.parse(editorValue);
      if (payload.id !== editingId) {
        setMessage('O campo id do JSON deve permanecer igual.');
        setSaving(false);
        return;
      }
      await api.put(`/api/jobs/${editingId}`, payload);
      setMessage('Job atualizado com sucesso!');
      mutate();
    } catch (error) {
      console.error(error);
      setMessage('Falha ao salvar. Verifique o JSON.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">Jobs</p>
          <h2 className="text-2xl font-semibold">Gerencie execuções e edite rapidamente</h2>
        </div>
        <Link href="/jobs/new" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">
          Novo job
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Plataforma</th>
                <th className="px-4 py-3">URLs</th>
                <th className="px-4 py-3">Output</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading && (
                <tr>
                  <td className="px-4 py-5 text-center text-slate-400" colSpan={5}>
                    Carregando...
                  </td>
                </tr>
              )}
              {!isLoading &&
                jobs.map((job) => (
                  <tr key={job.id} className={editingId === job.id ? 'bg-slate-800/50' : ''}>
                    <td className="px-4 py-3 font-mono text-xs">{job.id}</td>
                    <td className="px-4 py-3 capitalize">{job.platform}</td>
                    <td className="px-4 py-3">{job.start_urls.length}</td>
                    <td className="px-4 py-3">{job.output.format.join(', ')}</td>
                    <td className="px-4 py-3 text-right text-xs">
                      <button
                        type="button"
                        onClick={() => handleEdit(job)}
                        className="rounded border border-emerald-500 px-3 py-1 text-emerald-400 transition hover:bg-emerald-500 hover:text-slate-900"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(job.id)}
                        className="ml-2 rounded border border-red-500 px-3 py-1 text-red-400 transition hover:bg-red-500 hover:text-white"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-lg font-semibold text-white">Editor JSON</h3>
          <p className="text-sm text-slate-400">Selecione um job na tabela para editar. Todos os campos podem ser alterados.</p>
          <textarea
            className="mt-4 h-80 w-full rounded-lg border border-slate-800 bg-slate-950 font-mono text-xs text-slate-100"
            placeholder="Selecione um job para editar..."
            value={editorValue}
            onChange={(e) => setEditorValue(e.target.value)}
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !editingId}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
            {editingId && (
              <span className="text-xs text-slate-500">
                Editando: <span className="font-mono">{editingId}</span>
              </span>
            )}
          </div>
          {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}
        </div>
      </div>
    </section>
  );
}
