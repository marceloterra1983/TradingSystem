const API_BASE =
  import.meta.env.VITE_LAUNCHER_API_URL || 'http://localhost:3909';
const API_TOKEN = import.meta.env.VITE_LAUNCHER_API_TOKEN || '';

export type LauncherToolId =
  | 'pgadmin'
  | 'pgweb'
  | 'adminer'
  | 'questdb'
  | 'dashboard-rebuild'
  | 'docker-prune';

export async function startLauncherTool(toolId: LauncherToolId) {
  if (!API_BASE) {
    throw new Error('Launcher API não está configurada (VITE_LAUNCHER_API_URL)');
  }

  const response = await fetch(`${API_BASE}/api/launcher/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(API_TOKEN ? { 'X-LAUNCHER-TOKEN': API_TOKEN } : {}),
    },
    body: JSON.stringify({ toolId }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || 'Falha ao executar comando');
  }

  return response.json();
}
