#!/usr/bin/env node

/**
 * Convert npm audit JSON output to SARIF v2.1.0
 *
 * Usage:
 *   node scripts/security/npm-audit-to-sarif.mjs --input audit-report.json --output audit-report.sarif
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const options = args.reduce((acc, current, index) => {
  if (current.startsWith('--')) {
    const key = current.replace(/^--/, '');
    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      acc[key] = true;
    } else {
      acc[key] = next;
    }
  }
  return acc;
}, {});

if (!options.input || !options.output) {
  console.error('Usage: node scripts/security/npm-audit-to-sarif.mjs --input <audit.json> --output <report.sarif>');
  process.exit(1);
}

const severityToLevel = (severity = 'info') => {
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'error';
    case 'moderate':
      return 'warning';
    default:
      return 'note';
  }
};

const readAuditFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read audit file at ${filePath}:`, error.message);
    process.exit(1);
  }
};

const buildSarif = (auditJson) => {
  const vulnerabilities = auditJson.vulnerabilities ?? {};
  const rules = new Map();
  const results = [];

  Object.values(vulnerabilities).forEach((vuln) => {
    const advisoryId = vuln.id ?? vuln.name ?? vuln.source ?? `${vuln.module_name}-${vuln.severity}`;
    const ruleId = `npm-audit-${advisoryId}`;

    if (!rules.has(ruleId)) {
      const shortDescription = vuln.title || vuln.name || `Vulnerabilidade ${advisoryId}`;
      const recommendation = Array.isArray(vuln.via)
        ? vuln.via
            .filter((entry) => typeof entry === 'object' && entry !== null)
            .map((entry) => entry.url ?? entry.title ?? '')
            .filter(Boolean)
            .join('\n')
        : '';

      rules.set(ruleId, {
        id: ruleId,
        name: shortDescription,
        shortDescription: {
          text: shortDescription,
        },
        fullDescription: {
          text: vuln.overview || shortDescription,
        },
        properties: {
          precision: 'very-high',
          tags: ['security', 'npm', `severity:${vuln.severity}`],
          recommendation,
        },
        defaultConfiguration: {
          level: severityToLevel(vuln.severity),
        },
        helpUri: vuln.url ?? '',
      });
    }

    results.push({
      ruleId,
      level: severityToLevel(vuln.severity),
      message: {
        text: vuln.title || vuln.name || `Pacote vulnerável: ${vuln.module_name}`,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: `package-lock.json#${vuln.name ?? vuln.module_name}`,
            },
          },
        },
      ],
      properties: {
        package: vuln.name ?? vuln.module_name,
        severity: vuln.severity,
        range: vuln.range ?? '',
        fixAvailable: vuln.fixAvailable ?? false,
      },
    });
  });

  return {
    version: '2.1.0',
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'npm audit',
            semanticVersion: auditJson.metadata?.npm_version ?? process.version.replace(/^v/, ''),
            informationUri: 'https://docs.npmjs.com/cli/v10/commands/npm-audit',
            rules: Array.from(rules.values()),
          },
        },
        results,
        properties: {
          summary: {
            total: results.length,
            critical: auditJson.metadata?.vulnerabilities?.critical ?? 0,
            high: auditJson.metadata?.vulnerabilities?.high ?? 0,
            moderate: auditJson.metadata?.vulnerabilities?.moderate ?? 0,
            low: auditJson.metadata?.vulnerabilities?.low ?? 0,
          },
        },
      },
    ],
  };
};

const auditJson = readAuditFile(path.resolve(options.input));
const sarif = buildSarif(auditJson);

try {
  fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
  fs.writeFileSync(options.output, JSON.stringify(sarif, null, 2));
} catch (error) {
  console.error(`Failed to write SARIF report to ${options.output}:`, error.message);
  process.exit(1);
}

