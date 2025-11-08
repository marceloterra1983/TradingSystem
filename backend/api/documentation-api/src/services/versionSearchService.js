import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";
import { createRequire } from "module";
import VersionManager from "./versionManager.js";

const require = createRequire(import.meta.url);
const { Document } = require("flexsearch");

class VersionSearchService {
  constructor(specsDir) {
    this.specsDir = specsDir;
    this.versionManager = new VersionManager(specsDir);
    this.indices = new Map();
  }

  async initialize() {
    try {
      await this.versionManager.initialize();
      const versions = await this.versionManager.listVersions();

      await Promise.all(
        versions.all.map((version) => this.createIndexForVersion(version)),
      );

      return {
        versions: versions.all.length,
        indices: this.indices.size,
      };
    } catch (error) {
      throw new Error(`Failed to initialize version search: ${error.message}`);
    }
  }

  async createIndexForVersion(version) {
    const index = new Document({
      document: {
        id: "id",
        index: ["title", "description", "path", "method", "content"],
        store: [
          "type",
          "title",
          "description",
          "path",
          "method",
          "source",
          "version",
        ],
      },
      tokenize: "forward",
      resolution: 9,
      cache: 100,
    });

    try {
      const versionPath = await this.versionManager.getVersion(version);

      const openApiPath = path.join(versionPath.path, "openapi.yaml");
      const openApiContent = await fs.readFile(openApiPath, "utf8");
      const openApi = yaml.load(openApiContent);
      await this.indexOpenApi(index, openApi, version);

      const asyncApiPath = path.join(versionPath.path, "asyncapi.yaml");
      const asyncApiContent = await fs.readFile(asyncApiPath, "utf8");
      const asyncApi = yaml.load(asyncApiContent);
      await this.indexAsyncApi(index, asyncApi, version);

      const schemasDir = path.join(versionPath.path, "schemas");
      await this.indexSchemas(index, schemasDir, version);

      this.indices.set(version, index);
      return index;
    } catch (error) {
      throw new Error(
        `Failed to create index for version ${version}: ${error.message}`,
      );
    }
  }

  async indexOpenApi(index, spec, version) {
    index.add({
      id: `api-info-${version}`,
      type: "api-info",
      title: spec.info.title,
      description: spec.info.description,
      content: JSON.stringify(spec.info),
      source: "openapi",
      version,
    });

    for (const [specPath, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (typeof operation === "object") {
          index.add({
            id: `path-${specPath}-${method}-${version}`,
            type: "endpoint",
            title:
              operation.summary ||
              operation.operationId ||
              `${method.toUpperCase()} ${specPath}`,
            description: operation.description || "",
            path: specPath,
            method: method.toUpperCase(),
            content: JSON.stringify(operation),
            source: "openapi",
            version,
          });
        }
      }
    }

    if (spec.components?.schemas) {
      for (const [name, schema] of Object.entries(spec.components.schemas)) {
        index.add({
          id: `schema-${name}-${version}`,
          type: "schema",
          title: name,
          description: schema.description || "",
          content: JSON.stringify(schema),
          source: "openapi",
          version,
        });
      }
    }
  }

  async indexAsyncApi(index, spec, version) {
    index.add({
      id: `async-api-info-${version}`,
      type: "api-info",
      title: spec.info.title,
      description: spec.info.description,
      content: JSON.stringify(spec.info),
      source: "asyncapi",
      version,
    });

    for (const [channelName, channel] of Object.entries(spec.channels)) {
      index.add({
        id: `channel-${channelName}-${version}`,
        type: "channel",
        title: channel.title || channelName,
        description: channel.description || "",
        path: channelName,
        content: JSON.stringify(channel),
        source: "asyncapi",
        version,
      });
    }

    if (spec.components?.messages) {
      for (const [name, message] of Object.entries(spec.components.messages)) {
        index.add({
          id: `message-${name}-${version}`,
          type: "message",
          title: message.title || name,
          description: message.summary || message.description || "",
          content: JSON.stringify(message),
          source: "asyncapi",
          version,
        });
      }
    }
  }

  async indexSchemas(index, schemasDir, version) {
    try {
      const files = await fs.readdir(schemasDir);
      for (const file of files) {
        if (file.endsWith(".json") || file.endsWith(".yaml")) {
          const content = await fs.readFile(
            path.join(schemasDir, file),
            "utf8",
          );
          const schema = file.endsWith(".yaml")
            ? yaml.load(content)
            : JSON.parse(content);

          index.add({
            id: `schema-file-${file}-${version}`,
            type: "schema",
            title: schema.title || file,
            description: schema.description || "",
            path: `schemas/${file}`,
            content: JSON.stringify(schema),
            source: "schema",
            version,
          });
        }
      }
    } catch (error) {
      console.warn(
        `Failed to index schemas for version ${version}:`,
        error.message,
      );
    }
  }

  async search(searchQuery, options = {}) {
    const { version = "latest", type, source, limit = 10 } = options;

    try {
      const resolvedVersion =
        version === "latest" || version === "stable"
          ? (await this.versionManager.listVersions())[version]
          : version;

      const index = this.indices.get(resolvedVersion);
      if (!index) {
        throw new Error(`No index found for version ${resolvedVersion}`);
      }

      const results = index.search(searchQuery, {
        limit: limit * 2,
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
          version: item.version,
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

      filtered.sort((a, b) => b.score - a.score);
      filtered = filtered.slice(0, limit);

      return {
        total: filtered.length,
        version: resolvedVersion,
        results: filtered,
      };
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async suggest(searchQuery, options = {}) {
    const { version = "latest", limit = 5 } = options;

    const results = await this.search(searchQuery, {
      version,
      limit: limit * 2,
    });

    const suggestions = results.results.map((result) => ({
      text: result.title,
      type: result.type,
      source: result.source,
      version: result.version,
    }));

    return Array.from(
      new Map(suggestions.map((item) => [item.text, item])).values(),
    ).slice(0, limit);
  }

  async addVersion(version) {
    try {
      await this.createIndexForVersion(version);
      return {
        version,
        indexed: true,
      };
    } catch (error) {
      throw new Error(`Failed to add version ${version}: ${error.message}`);
    }
  }

  async removeVersion(version) {
    try {
      this.indices.delete(version);
      return {
        version,
        removed: true,
      };
    } catch (error) {
      throw new Error(`Failed to remove version ${version}: ${error.message}`);
    }
  }

  async reindexVersion(version) {
    try {
      await this.removeVersion(version);
      return this.addVersion(version);
    } catch (error) {
      throw new Error(`Failed to reindex version ${version}: ${error.message}`);
    }
  }
}

export default VersionSearchService;
