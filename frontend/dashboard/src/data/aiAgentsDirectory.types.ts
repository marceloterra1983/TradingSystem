// Type definitions for AI Agents Directory
// This file is kept in TypeScript for type safety

export const AGENT_CATALOG_SCHEMA_VERSION = "1.1.0";

export type AgentCategory =
  | "Arquitetura & Plataforma"
  | "Backend & Serviços"
  | "Frontend & UX"
  | "Dados & Analytics"
  | "IA, ML & RAG"
  | "Documentação & Conteúdo"
  | "Pesquisa & Estratégia"
  | "QA & Observabilidade"
  | "MCP & Automação";

export interface AgentDirectoryEntry {
  id: string;
  name: string;
  category: AgentCategory;
  capabilities: string;
  usage: string;
  example: string;
  shortExample?: string;
  outputType: string;
  tags: string[];
  filePath: string;
  fileContent: string;
}

export interface AgentDirectory {
  schemaVersion: string;
  categoryOrder: AgentCategory[];
  agents: AgentDirectoryEntry[];
}
