import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { Document } = require('flexsearch');

class DocumentationSearchService {
  constructor(specsDir) {
    this.specsDir = specsDir;
    this.index = new Document({
      document: {
        id: 'id',
        index: ['title', 'description', 'path', 'method', 'content'],
        store: ['type', 'title', 'description', 'path', 'method', 'source'],
      },
      tokenize: 'forward',
      resolution: 9,
    });
  }

  async indexDocumentation() {
    try {
      const openApiPath = path.join(this.specsDir, 'openapi.yaml');
      const openApiContent = await fs.readFile(openApiPath, 'utf8');
      const openApi = yaml.load(openApiContent);
      await this.indexOpenApi(openApi);

      const asyncApiPath = path.join(this.specsDir, 'asyncapi.yaml');
      const asyncApiContent = await fs.readFile(asyncApiPath, 'utf8');
      const asyncApi = yaml.load(asyncApiContent);
      await this.indexAsyncApi(asyncApi);

      const schemasDir = path.join(this.specsDir, 'schemas');
      await this.indexSchemas(schemasDir);

      return {
        status: 'success',
        indexed: this.index.info(),
      };
    } catch (error) {
      throw new Error(`Failed to index documentation: ${error.message}`);
    }
  }

  async indexOpenApi(spec) {
    this.index.add({
      id: 'api-info',
      type: 'api-info',
      title: spec.info.title,
      description: spec.info.description,
      content: JSON.stringify(spec.info),
      source: 'openapi',
    });

    for (const [specPath, methods] of Object.entries(spec.paths || {})) {
      for (const [method, operation] of Object.entries(methods)) {
        if (typeof operation === 'object') {
          this.index.add({
            id: `path-${specPath}-${method}`,
            type: 'endpoint',
            title: operation.summary || operation.operationId || `${method.toUpperCase()} ${specPath}`,
            description: operation.description || '',
            path: specPath,
            method: method.toUpperCase(),
            content: JSON.stringify(operation),
            source: 'openapi',
          });
        }
      }
    }

    if (spec.components?.schemas) {
      for (const [name, schema] of Object.entries(spec.components.schemas)) {
        this.index.add({
          id: `schema-${name}`,
          type: 'schema',
          title: name,
          description: schema.description || '',
          content: JSON.stringify(schema),
          source: 'openapi',
        });
      }
    }
  }

  async indexAsyncApi(spec) {
    this.index.add({
      id: 'async-api-info',
      type: 'api-info',
      title: spec.info.title,
      description: spec.info.description,
      content: JSON.stringify(spec.info),
      source: 'asyncapi',
    });

    for (const [channelName, channel] of Object.entries(spec.channels || {})) {
      this.index.add({
        id: `channel-${channelName}`,
        type: 'channel',
        title: channel.title || channelName,
        description: channel.description || '',
        path: channelName,
        content: JSON.stringify(channel),
        source: 'asyncapi',
      });
    }

    if (spec.components?.messages) {
      for (const [name, message] of Object.entries(spec.components.messages)) {
        this.index.add({
          id: `message-${name}`,
          type: 'message',
          title: message.title || name,
          description: message.summary || message.description || '',
          content: JSON.stringify(message),
          source: 'asyncapi',
        });
      }
    }
  }

  async indexSchemas(schemasDir) {
    try {
      const files = await fs.readdir(schemasDir);
      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.yaml')) {
          const content = await fs.readFile(path.join(schemasDir, file), 'utf8');
          const schema = file.endsWith('.yaml') ? yaml.load(content) : JSON.parse(content);

          this.index.add({
            id: `schema-file-${file}`,
            type: 'schema',
            title: schema.title || file,
            description: schema.description || '',
            path: `schemas/${file}`,
            content: JSON.stringify(schema),
            source: 'schema',
          });
        }
      }
    } catch (error) {
      console.warn('Failed to index schemas:', error.message);
    }
  }

  search(query, options = {}) {
    const { limit = 10, type, source } = options;

    const results = this.index.search(query, {
      limit,
      enrich: true,
    });

    const formatted = results.flatMap((result) =>
      result.result.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        path: item.path,
        method: item.method,
        source: item.source,
        score: result.score,
      })),
    );

    let filtered = formatted;
    if (type) {
      filtered = filtered.filter((item) => item.type === type);
    }
    if (source) {
      filtered = filtered.filter((item) => item.source === source);
    }

    return {
      total: filtered.length,
      results: filtered,
    };
  }

  suggest(query, limit = 5) {
    const results = this.search(query, { limit: limit * 2 });

    const suggestions = results.results.map((result) => ({
      text: result.title,
      type: result.type,
      source: result.source,
    }));

    return Array.from(new Map(suggestions.map((suggestion) => [suggestion.text, suggestion])).values()).slice(
      0,
      limit,
    );
  }
}

export default DocumentationSearchService;
