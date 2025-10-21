import express from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import DocsHealthChecker from '../services/docsHealthChecker.js';

const router = express.Router();
const require = createRequire(import.meta.url);
const archiver = require('archiver');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../../');
const docsRoot = path.join(projectRoot, 'docs');
const specsDir = path.join(docsRoot, 'spec');

const setYamlContentType = (req, res, next) => {
  if (req.path.endsWith('.yaml') || req.path.endsWith('.yml')) {
    res.type('text/yaml');
  }
  next();
};

router.get('/spec/*', setYamlContentType, express.static(docsRoot));

const healthChecker = new DocsHealthChecker(specsDir);

router.get('/status', async (_req, res) => {
  try {
    const health = await healthChecker.checkHealth();
    res.json(health);
  } catch (error) {
    console.error('Error generating docs status:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to generate documentation status',
      lastChecked: new Date().toISOString(),
    });
  }
});

router.get('/check', async (_req, res) => {
  try {
    await healthChecker.checkHealth();
    res.json({ status: 'ok', message: 'Documentation check completed' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/download', async (_req, res) => {
  try {
    const archive = archiver('zip');

    res.attachment('tradingsystem-specs.zip');
    archive.pipe(res);

    const files = [
      { path: 'openapi.yaml', name: 'openapi.yaml' },
      { path: 'asyncapi.yaml', name: 'asyncapi.yaml' },
      { path: 'schemas', name: 'schemas' },
      { path: 'examples', name: 'examples' },
    ];

    for (const file of files) {
      const fullPath = path.join(specsDir, file.path);
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        archive.directory(fullPath, file.name);
      } else {
        archive.file(fullPath, { name: file.name });
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error creating spec archive:', error);
    res.status(500).json({
      error: 'Failed to create specification archive',
    });
  }
});

export default router;
