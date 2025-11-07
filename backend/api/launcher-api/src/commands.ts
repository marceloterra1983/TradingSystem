import path from 'node:path';

export type ToolCommand = {
  id: string;
  label: string;
  command: string;
  description: string;
};

const REPO_ROOT = path.resolve(process.cwd(), '../../..');

const composePath = (relative: string) => path.resolve(REPO_ROOT, relative);

export const TOOL_COMMANDS: Record<string, ToolCommand> = {
  pgadmin: {
    id: 'pgadmin',
    label: 'pgAdmin',
    command: `docker compose -f "${composePath(
      'tools/compose/docker-compose.database-ui.yml',
    )}" up -d dbui-pgadmin`,
    description: 'Inicia o container pgAdmin (porta 5050).',
  },
  pgweb: {
    id: 'pgweb',
    label: 'pgweb',
    command: `docker compose -f "${composePath(
      'tools/compose/docker-compose.database-ui.yml',
    )}" up -d dbui-pgweb`,
    description: 'Inicia o container pgweb (porta 8081).',
  },
  adminer: {
    id: 'adminer',
    label: 'Adminer',
    command: `docker compose -f "${composePath(
      'tools/compose/docker-compose.database-ui.yml',
    )}" up -d dbui-adminer`,
    description: 'Inicia o container Adminer (porta 8082).',
  },
  questdb: {
    id: 'questdb',
    label: 'QuestDB',
    command: `docker compose -f "${composePath(
      'tools/compose/docker-compose.database-ui.yml',
    )}" up -d dbui-questdb`,
    description: 'Inicia o serviço QuestDB (porta 9002).',
  },
  'dashboard-rebuild': {
    id: 'dashboard-rebuild',
    label: 'Rebuild dashboard',
    command: `bash "${path.resolve(REPO_ROOT, 'scripts/dashboard/dashboard-docker.sh')}" restart`,
    description:
      'Rebuilda a imagem do dashboard e reinicia o container com as variáveis atuais do .env.',
  },
  'docker-prune': {
    id: 'docker-prune',
    label: 'Limpeza de imagens antigas',
    command:
      'docker image prune -a -f && docker builder prune -af && docker volume prune -f',
    description:
      'Executa limpeza de imagens, cache de build e volumes órfãos para liberar espaço.',
  },
};
