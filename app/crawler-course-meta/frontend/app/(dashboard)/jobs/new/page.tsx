'use client';

import { useState } from 'react';
import api from '@/lib/api/fetcher';

const defaultJob = {
  id: 'job-hotmart-2025-11-08',
  platform: 'hotmart',
  start_urls: ['https://hotmart.com/course/meu-curso'],
  auth: {
    method: 'form',
    owner_login: true,
    credentials_env: {
      username: 'OWNER_USERNAME',
      password: 'OWNER_PASSWORD',
    },
    session_store: {
      enabled: true,
      path: './sessions/hotmart.session.enc',
      encrypt_with_env: 'SESSION_KEY',
    },
  },
  selectors: {
    course: {
      title: 'css:h1.course-title',
    },
  },
  output: {
    format: ['json', 'md'],
    directory: './outputs/hotmart',
  },
};

export default function NewJobPage() {
  const [job, setJob] = useState(JSON.stringify(defaultJob, null, 2));
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      const payload = JSON.parse(job);
      await api.post('/api/jobs', payload);
      setMessage('Job criado com sucesso!');
    } catch (error) {
      setMessage('Falha ao criar job. Verifique o JSON.');
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Criar job (JSON)</h2>
        <p className="text-sm text-slate-400">Cole/edite o conteúdo do job e envie para a API.</p>
      </div>
      <textarea
        className="h-96 w-full rounded-xl border border-slate-800 bg-slate-950 font-mono text-sm text-slate-100"
        value={job}
        onChange={(e) => setJob(e.target.value)}
      />
      <button
        onClick={handleSubmit}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
        type="button"
      >
        Salvar job
      </button>
      {message && <p className="text-sm text-emerald-400">{message}</p>}
    </section>
  );
}
