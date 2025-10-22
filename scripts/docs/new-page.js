import {promises as fs} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const docsRoot = path.join(repoRoot, 'docs', 'context');

const TEMPLATE_MAP = {
  prd: path.join(docsRoot, 'prd', 'templates', 'feature-template.mdx'),
  frontend: path.join(docsRoot, 'frontend', 'templates', 'frontend-page-template.mdx'),
};

const TYPE_METADATA = {
  prd: {
    tags: ['prd', 'product'],
    descriptionPrefix: 'Product requirements for ',
  },
  frontend: {
    tags: ['frontend'],
    descriptionPrefix: 'Frontend documentation for ',
  },
};

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) {
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${key}`);
    }
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function titleCase(input) {
  return input
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildFrontmatter(type, slug, title) {
  const metadata = TYPE_METADATA[type] ?? {tags: [type]};
  const description = `${metadata.descriptionPrefix ?? ''}${title}.`.trim();
  const tagList = metadata.tags ?? [type];
  const frontmatterLines = [
    '---',
    `id: ${slug}`,
    `title: ${title}`,
    `description: ${description}`,
    `tags: [${tagList.join(', ')}]`,
    `sidebar_label: ${title}`,
    'last_update:',
    '  author: docs',
    `  date: ${new Date().toISOString().slice(0, 10)}`,
    '---',
    '',
  ];
  return frontmatterLines.join('\n');
}

function stripFrontmatter(content) {
  if (!content.startsWith('---')) {
    return content;
  }
  const end = content.indexOf('\n---', 3);
  if (end === -1) {
    return content;
  }
  return content.slice(end + 4);
}

function ensureWithinDocs(destination) {
  const resolved = path.resolve(destination);
  if (!resolved.startsWith(docsRoot)) {
    throw new Error('Target path escapes documentation root');
  }
  return resolved;
}

function slugify(target) {
  return target
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .join('-')
    .toLowerCase();
}

async function scaffoldFromTemplate({type, target}) {
  const templatePath = TEMPLATE_MAP[type];
  if (!templatePath) {
    throw new Error(`Unknown template type: ${type}`);
  }

  const destination = ensureWithinDocs(path.join(docsRoot, `${target}.mdx`));
  await fs.mkdir(path.dirname(destination), {recursive: true});

  try {
    await fs.access(destination);
    throw new Error(`File already exists: ${destination}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const template = await fs.readFile(templatePath, 'utf8');
  const slug = slugify(target);
  const title = titleCase(path.basename(target));
  const frontmatter = buildFrontmatter(type, slug, title);
  const body = stripFrontmatter(template);
  await fs.writeFile(destination, `${frontmatter}${body}`, 'utf8');
  console.log(`✅ Created ${path.relative(repoRoot, destination)}`);
}

async function main() {
  try {
    const args = parseArgs(process.argv);
    const type = args.type;
    const target = args.path;

    if (!type || !target) {
      console.error('Usage: node scripts/docs/new-page.js --type <prd|frontend> --path <relative/path>');
      process.exit(1);
      return;
    }

    await scaffoldFromTemplate({type, target});
  } catch (error) {
    console.error(`❌ Failed to scaffold page: ${error.message}`);
    process.exit(1);
  }
}

await main();
