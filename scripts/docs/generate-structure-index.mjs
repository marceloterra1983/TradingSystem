#!/usr/bin/env node

/**
 * Gera um índice resumido da estrutura de documentação em docs/content.
 * Produz um JSON em docs/reports/documentation-structure.json com diretórios,
 * contagem de arquivos e subpastas relevantes.
 */

import fs from "fs";
import path from "path";

const DOCS_ROOT = path.resolve("docs/content");
const OUTPUT = path.resolve("docs/reports/documentation-structure.json");
const DASHBOARD_TARGET = path.resolve(
  "frontend/dashboard/public/data/structure/documentation-structure.json",
);

const MAX_DEPTH = 2;

function listDirectory(currentPath, depth = 0) {
  const stats = fs.statSync(currentPath);
  if (!stats.isDirectory()) {
    return null;
  }

  const entries = fs.readdirSync(currentPath, { withFileTypes: true });
  const summary = {
    name: path.basename(currentPath),
    path: path.relative(DOCS_ROOT, currentPath) || ".",
    directories: [],
    files: [],
  };

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const entryPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      if (depth < MAX_DEPTH) {
        const child = listDirectory(entryPath, depth + 1);
        if (child) {
          summary.directories.push(child);
        }
      } else {
        summary.directories.push({
          name: entry.name,
          path: path.relative(DOCS_ROOT, entryPath),
        });
      }
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      summary.files.push(entry.name);
    }
  }

  summary.directories.sort((a, b) => a.name.localeCompare(b.name));
  summary.files.sort((a, b) => a.localeCompare(b));
  return summary;
}

const tree = listDirectory(DOCS_ROOT);

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(tree, null, 2), "utf8");

fs.mkdirSync(path.dirname(DASHBOARD_TARGET), { recursive: true });
fs.writeFileSync(DASHBOARD_TARGET, JSON.stringify(tree, null, 2), "utf8");

console.log(`Documentation structure exported to ${OUTPUT}`);
console.log(`Dashboard copy written to ${DASHBOARD_TARGET}`);

