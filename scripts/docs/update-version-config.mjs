#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {execSync} from 'child_process';
import {createRequire} from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultDocsDir = path.join(__dirname, '../../docs');
const defaultConfigPath = path.join(defaultDocsDir, 'docusaurus.config.js');
const defaultVersionsPath = path.join(defaultDocsDir, 'versions.json');
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const options = {
  version: null,
  versionsJson: defaultVersionsPath,
  configPath: defaultConfigPath,
  dryRun: false,
};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  switch (arg) {
    case '--version':
      options.version = args[++i];
      break;
    case '--versions-json':
      options.versionsJson = path.resolve(args[++i]);
      break;
    case '--config':
      options.configPath = path.resolve(args[++i]);
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--help':
    case '-h':
      printHelp();
      process.exit(0);
    default:
      if (arg.startsWith('-')) {
        console.error(`Unknown option: ${arg}`);
        printHelp();
        process.exit(1);
      }
  }
}

if (!options.version) {
  console.error('Missing required argument: --version <X.Y.Z>');
  printHelp();
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(options.version)) {
  console.error(`Invalid version '${options.version}'. Expected semantic version X.Y.Z`);
  process.exit(1);
}

if (!fs.existsSync(options.configPath)) {
  console.error(`docusaurus.config.js not found at ${options.configPath}`);
  process.exit(1);
}

if (!fs.existsSync(options.versionsJson)) {
  console.error(`versions.json not found at ${options.versionsJson}`);
  process.exit(1);
}

const configContent = fs.readFileSync(options.configPath, 'utf8');
const versionsContent = fs.readFileSync(options.versionsJson, 'utf8');
let versionsJson;
try {
  versionsJson = JSON.parse(versionsContent);
} catch (error) {
  console.error(`Unable to parse versions.json: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(versionsJson)) {
  console.error('versions.json must contain an array of versions.');
  process.exit(1);
}

let existingConfig = {};
try {
  existingConfig = require(options.configPath);
} catch (error) {
  console.warn('Warning: Unable to import existing docusaurus.config.js. Custom version properties may be reset.');
  console.warn(error.message);
}
const existingVersions = extractExistingVersions(existingConfig);

const versionSet = new Set(versionsJson);
versionSet.add(options.version);
const sortedVersions = Array.from(versionSet).sort(compareSemverDesc);
const withoutCurrent = sortedVersions.filter((ver) => ver !== options.version);
const previousLatest = withoutCurrent[0] ?? null;
const versionType = determineVersionType(options.version, previousLatest);
const configStable = extractStableVersion(configContent);

let latestStable;
if (versionType === 'patch') {
  latestStable = configStable ?? previousLatest ?? options.version;
} else {
  latestStable = options.version;
}

// Ensure stable version is part of the versions list.
if (!sortedVersions.includes(latestStable)) {
  sortedVersions.push(latestStable);
}

const previousVersions = sortedVersions.filter((ver) => ver !== latestStable);

const versionsBlock = buildVersionsBlock({
  latestStable,
  previousVersions,
  existingVersions,
});

const updatedConfig = replaceVersionsBlock(configContent, versionsBlock);

if (options.dryRun) {
  console.log('--- dry-run: updated versions block ---');
  console.log(versionsBlock);
  process.exit(0);
}

fs.writeFileSync(options.configPath, updatedConfig);

try {
  execSync(`node --check "${options.configPath}"`, {stdio: 'ignore'});
} catch (error) {
  console.error('Updated docusaurus.config.js failed syntax check.');
  console.error(error.stderr?.toString() || error.message);
  process.exit(1);
}

console.log(
  `Updated docusaurus.config.js for version ${options.version} (${versionType}). latestStable=${latestStable}`,
);

// -----------------------------------------------------------------------------
// Helper functions
// -----------------------------------------------------------------------------

function printHelp() {
  console.log(`Usage: node update-version-config.mjs --version <X.Y.Z> [options]

Options:
  --versions-json <path>  Path to versions.json (default: ${defaultVersionsPath})
  --config <path>         Path to docusaurus.config.js (default: ${defaultConfigPath})
  --dry-run               Preview changes without writing
  -h, --help              Show this message
`);
}

function parseSemver(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return {major, minor, patch};
}

function compareSemverDesc(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (pa.major !== pb.major) return pb.major - pa.major;
  if (pa.minor !== pb.minor) return pb.minor - pa.minor;
  return pb.patch - pa.patch;
}

function determineVersionType(version, previousLatest) {
  if (!previousLatest) {
    return 'first';
  }
  const current = parseSemver(version);
  const previous = parseSemver(previousLatest);
  if (current.major > previous.major) return 'major';
  if (current.major === previous.major && current.minor > previous.minor) return 'minor';
  if (
    current.major === previous.major &&
    current.minor === previous.minor &&
    current.patch > previous.patch
  ) {
    return 'patch';
  }
  return 'patch';
}

function extractStableVersion(config) {
  const stableRegex = /['"](\d+\.\d+\.\d+)['"]\s*:\s*{\s*[^}]*path:\s*''/m;
  const match = config.match(stableRegex);
  return match ? match[1] : null;
}

function extractExistingVersions(config) {
  if (!config || typeof config !== 'object') {
    return {};
  }

  const presets = Array.isArray(config.presets) ? config.presets : [];
  for (const preset of presets) {
    if (Array.isArray(preset) && preset[0] === 'classic') {
      const presetOptions = preset[1] || {};
      if (presetOptions.docs && typeof presetOptions.docs === 'object') {
        return presetOptions.docs.versions || {};
      }
    }
  }

  return {};
}

function buildVersionsBlock({latestStable, previousVersions, existingVersions}) {
  const indentOuter = '          ';
  const indentInner = '            ';
  const indentDeep = '              ';

  const lines = [];
  lines.push(`${indentOuter}versions: {`);

  const currentDefaults = {
    label: 'Next (Unreleased) 🚧',
    path: 'next',
    banner: 'unreleased',
  };
  const currentEntry = withPreservedFields(currentDefaults, existingVersions.current);
  lines.push(...formatEntry('current', currentEntry, indentInner, indentDeep));
  lines.push(`${indentInner}},`);

  const stableDefaults = {
    label: `${latestStable} (Stable) ✅`,
    path: '',
    banner: 'none',
  };
  const stableEntry = withPreservedFields(stableDefaults, existingVersions[latestStable]);
  lines.push(...formatEntry(`'${latestStable}'`, stableEntry, indentInner, indentDeep));
  lines.push(`${indentInner}},`);

  previousVersions
    .filter((ver) => ver !== latestStable)
    .forEach((ver) => {
      const defaults = {
        label: ver,
        path: `v${ver}`,
        banner: 'none',
      };
      const entry = withPreservedFields(defaults, existingVersions[ver]);
      lines.push(...formatEntry(`'${ver}'`, entry, indentInner, indentDeep));
      lines.push(`${indentInner}},`);
    });

  lines.push(`${indentInner}// Example when multiple versions exist:`);
  lines.push(`${indentInner}// '2.0.0': {`);
  lines.push(`${indentInner}//   label: '2.0.0 (Stable) ✅',`);
  lines.push(`${indentInner}//   path: '',  // Latest stable at root`);
  lines.push(`${indentInner}//   banner: 'none',`);
  lines.push(`${indentInner}// },`);
  lines.push(`${indentInner}// '1.0.0': {`);
  lines.push(`${indentInner}//   label: '1.0.0',`);
  lines.push(`${indentInner}//   path: 'v1.0.0',  // Previous version at versioned path`);
  lines.push(`${indentInner}//   banner: 'none',`);
  lines.push(`${indentInner}// },`);
  lines.push(`${indentOuter}},`);

  return lines.join('\n');
}

function withPreservedFields(defaults, existing) {
  if (!existing || typeof existing !== 'object') {
    return {...defaults};
  }
  const preserved = omit(existing, ['label', 'path']);
  return {...defaults, ...preserved};
}

function formatEntry(key, data, indentInner, indentDeep) {
  const lines = [];
  lines.push(`${indentInner}${key}: {`);

  const prioritizedKeys = ['label', 'path', 'banner'];
  const handled = new Set();

  prioritizedKeys.forEach((prop) => {
    if (prop in data) {
      lines.push(...formatProperty(prop, data[prop], indentDeep));
      handled.add(prop);
    }
  });

  const extraKeys = Object.keys(data)
    .filter((prop) => !handled.has(prop))
    .sort();

  extraKeys.forEach((prop) => {
    lines.push(...formatProperty(prop, data[prop], indentDeep));
  });

  return lines;
}

function formatProperty(prop, value, indentDeep) {
  const formattedValue = formatValue(value, indentDeep);
  if (formattedValue.includes('\n')) {
    const segments = formattedValue.split('\n');
    const lines = [`${indentDeep}${prop}: ${segments[0]}`];
    for (let i = 1; i < segments.length; i += 1) {
      lines.push(`${indentDeep}  ${segments[i]}`);
    }
    const lastIndex = lines.length - 1;
    lines[lastIndex] = `${lines[lastIndex]},`;
    return lines;
  }
  return [`${indentDeep}${prop}: ${formattedValue},`];
}

function formatValue(value, indentDeep) {
  if (typeof value === 'string') {
    const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `'${escaped}'`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    const jsonValue = JSON.stringify(value, null, 2);
    return jsonValue
      .split('\n')
      .map((line, index) => (index === 0 ? line : `${indentDeep}  ${line}`))
      .join('\n');
  }
  return JSON.stringify(value);
}

function omit(obj, keysToOmit) {
  if (!obj || typeof obj !== 'object') {
    return {};
  }
  const result = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (!keysToOmit.includes(key)) {
      result[key] = value;
    }
  });
  return result;
}

function replaceVersionsBlock(config, block) {
  const regex = /^\s*versions:\s*{[\s\S]*?^\s*},/m;
  if (!regex.test(config)) {
    console.error('Unable to locate versions block in docusaurus.config.js');
    process.exit(1);
  }
  return config.replace(regex, block);
}
