#!/usr/bin/env node

/**
 * Compares Vitest coverage summary with the targets defined em config/quality.
 * Currently opera em modo warnOnly (não falha pipeline), mas registra gaps.
 */

import fs from "fs";
import path from "path";

const COVERAGE_FILE =
  process.env.COVERAGE_SUMMARY_PATH ||
  path.resolve("frontend/dashboard/coverage/coverage-summary.json");

const TARGET_FILE =
  process.env.COVERAGE_TARGETS_PATH ||
  path.resolve("config/quality/coverage-targets.json");

const readJson = (filePath) => {
  if (!fs.existsSync(filePath)) {
    console.error(`Coverage gate: arquivo não encontrado (${filePath})`);
    process.exit(0);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const summary = readJson(COVERAGE_FILE);
const targets = readJson(TARGET_FILE);

const metrics = ["lines", "branches", "functions", "statements"];
const results = [];

metrics.forEach((metric) => {
  const current = summary.total?.[metric]?.pct ?? 0;
  const target = targets.targets?.[metric];
  if (target === undefined) {
    return;
  }
  const delta = current - target;
  results.push({ metric, current, target, delta });
});

const pad = (value) => value.toFixed(2).padStart(6, " ");

console.log("📊 Coverage Gate (plan phase:", targets.phase ?? "n/a", ")");
console.log("| Métrica    | Atual | Target | Δ |");
console.log("|------------|-------|--------|----|");
results.forEach(({ metric, current, target, delta }) => {
  const label = metric.padEnd(10, " ");
  const formattedDelta = `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`;
  console.log(
    `| ${label} | ${pad(current)}% | ${pad(target)}% | ${formattedDelta}% |`,
  );
});

const unmet = results.filter(({ delta }) => delta < 0);

if (unmet.length === 0) {
  console.log("✅ Cobertura atende ou supera todas as metas configuradas.");
  process.exit(0);
}

const warnOnly = Boolean(targets.warnOnly);
const message = unmet
  .map(
    ({ metric, delta }) =>
      ` - ${metric}: faltam ${Math.abs(delta).toFixed(
        2,
      )} p.p. para atingir o alvo`,
  )
  .join("\n");

if (warnOnly) {
  console.warn("⚠️ Cobertura abaixo da meta:\n" + message);
  process.exit(0);
}

console.error("❌ Cobertura abaixo da meta:\n" + message);
process.exit(1);

