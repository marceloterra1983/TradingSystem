import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Crawler Course Meta',
  description: 'Dashboard para orquestrar jobs de metadados de cursos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-slate-50">
        <div className="min-h-screen">
          <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              <h1 className="text-lg font-semibold">Crawler Course Meta</h1>
              <nav className="flex gap-4 text-sm text-slate-300">
                <a href="/" className="hover:text-white">
                  Dashboard
                </a>
                <a href="/jobs" className="hover:text-white">
                  Jobs
                </a>
                <a href="/metrics" className="hover:text-white">
                  Métricas
                </a>
                <a href="/artifacts" className="hover:text-white">
                  Artefatos
                </a>
                <a href="/settings" className="hover:text-white">
                  Settings
                </a>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
