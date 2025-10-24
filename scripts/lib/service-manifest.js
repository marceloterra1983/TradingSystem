#!/usr/bin/env node
/**
 * Utility for interacting with config/services-manifest.json.
 *
 * Usage:
 *   node scripts/service-manifest.js list
 *   node scripts/service-manifest.js get <service-id>
 *   node scripts/service-manifest.js get <service-id> --field port
 */

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const MANIFEST_PATH = resolve(process.cwd(), 'config/services-manifest.json');

function loadManifest() {
  try {
    const raw = readFileSync(MANIFEST_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to load manifest at ${MANIFEST_PATH}`);
    console.error(err.message);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`Usage:
  node scripts/service-manifest.js list
  node scripts/service-manifest.js get <service-id> [--field <name>]

Commands:
  list             Print summary of all services.
  get <id>         Print full JSON for a service. Use --field to extract a single value.`);
}

function listServices(manifest) {
  const rows = manifest.services.map((svc) => ({
    id: svc.id,
    type: svc.type,
    path: svc.path,
    port: svc.port ?? '',
    workspace: Boolean(svc.workspace),
    managed: svc.managed ?? 'internal'
  }));

  const headers = ['ID', 'Type', 'Path', 'Port', 'Workspace', 'Managed'];
  const output = [headers.join('\t')];
  rows.forEach((row) => {
    output.push([row.id, row.type, row.path, row.port, row.workspace, row.managed].join('\t'));
  });
  console.log(output.join('\n'));
}

function getService(manifest, id, field) {
  const svc = manifest.services.find((item) => item.id === id);
  if (!svc) {
    console.error(`Service '${id}' not found in manifest.`);
    process.exit(1);
  }

  if (field) {
    if (!(field in svc)) {
      console.error(`Field '${field}' not present on service '${id}'.`);
      process.exit(1);
    }
    const value = svc[field];
    if (typeof value === 'object') {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(value ?? '');
    }
  } else {
    console.log(JSON.stringify(svc, null, 2));
  }
}

function main(argv) {
  const [, , cmd, ...rest] = argv;
  if (!cmd || ['-h', '--help'].includes(cmd)) {
    printHelp();
    process.exit(0);
  }

  const manifest = loadManifest();

  switch (cmd) {
    case 'list':
      listServices(manifest);
      break;
    case 'get': {
      const id = rest[0];
      if (!id) {
        console.error('Missing service id for get command.');
        process.exit(1);
      }
      let field;
      const fieldIdx = rest.indexOf('--field');
      if (fieldIdx !== -1) {
        field = rest[fieldIdx + 1];
        if (!field) {
          console.error('Missing value for --field option.');
          process.exit(1);
        }
      }
      getService(manifest, id, field);
      break;
    }
    default:
      console.error(`Unknown command '${cmd}'.`);
      printHelp();
      process.exit(1);
  }
}

main(process.argv);
