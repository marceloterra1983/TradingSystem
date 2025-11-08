export default function SettingsPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Configurações</h2>
      <p className="text-sm text-slate-400">Configure chaves de API, consentimento e opções de sessão dentro do `.env` raiz. Esta página funciona como checklist de validação.</p>
      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm">
        <p>✅ Gebruik um único `.env` na raiz do repositório.</p>
        <p>✅ Defina `SESSION_ENCRYPTION_KEY` para criptografar stores.</p>
        <p>✅ Ajuste `CCM_OUTPUT_ROOT` se precisar escrever em outro diretório.</p>
        <p>⚠️ Sempre colete consentimento explícito ao crawler conteúdo privado.</p>
      </div>
    </section>
  );
}
