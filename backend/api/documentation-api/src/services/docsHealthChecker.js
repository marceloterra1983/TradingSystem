import yaml from "js-yaml";
import { promises as fs } from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const SwaggerParser = require("@apidevtools/swagger-parser");
const { Parser: AsyncAPIParser } = require("@asyncapi/parser");

class DocsHealthChecker {
  constructor(specsDir) {
    this.specsDir = specsDir;
    this.openApiPath = path.join(specsDir, "openapi.yaml");
    this.asyncApiPath = path.join(specsDir, "asyncapi.yaml");
    this.symbolsPath = path.join(specsDir, "../ingest/assets/symbols.yaml");
  }

  async checkHealth() {
    try {
      const results = {
        openapi: await this.validateOpenApi(),
        asyncapi: await this.validateAsyncApi(),
        symbols: await this.validateSymbols(),
        lastChecked: new Date().toISOString(),
        issues: [],
      };

      return {
        ...results,
        status: this.determineOverallStatus(results),
      };
    } catch (error) {
      console.error("Health check failed:", error);
      return {
        status: "error",
        error: error.message,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  async validateOpenApi() {
    try {
      const content = await fs.readFile(this.openApiPath, "utf8");
      const spec = yaml.load(content);

      await SwaggerParser.validate(spec);

      const validations = [
        this.validateInfo(spec.info),
        this.validateServers(spec.servers),
        this.validateComponents(spec.components),
        this.validatePaths(spec.paths),
      ];

      const issues = validations
        .filter((validation) => !validation.valid)
        .map((validation) => validation.message);

      return {
        valid: issues.length === 0,
        version: spec.info.version,
        endpoints: Object.keys(spec.paths || {}).length,
        issues,
      };
    } catch (error) {
      return {
        valid: false,
        issues: [error.message],
      };
    }
  }

  async validateAsyncApi() {
    try {
      const content = await fs.readFile(this.asyncApiPath, "utf8");
      const spec = yaml.load(content);

      const parser = new AsyncAPIParser();
      const parseResult = await parser.parse(spec);

      const issues = [];
      if (parseResult.diagnostics.length > 0) {
        const allowlist = ["The latest version of AsyncAPi is not used"];
        for (const d of parseResult.diagnostics) {
          const msg = String(d.message || "");
          if (!allowlist.some((s) => msg.includes(s))) {
            issues.push(msg);
          }
        }
      }

      return {
        valid: issues.length === 0,
        version: spec.info.version,
        channels: Object.keys(spec.channels || {}).length,
        issues,
      };
    } catch (error) {
      return {
        valid: false,
        issues: [error.message],
      };
    }
  }

  async validateSymbols() {
    try {
      const content = await fs.readFile(this.symbolsPath, "utf8");
      const symbols = yaml.load(content);

      const issues = [];

      if (!symbols.markets) {
        issues.push("Missing markets section");
      }

      if (!symbols.conventions) {
        issues.push("Missing conventions section");
      }

      for (const [market, entries] of Object.entries(symbols.markets || {})) {
        if (!Array.isArray(entries)) {
          issues.push(`Invalid format for market ${market}`);
          continue;
        }

        entries.forEach((entry, index) => {
          if (!entry.symbol) {
            issues.push(`Missing symbol in ${market} entry ${index}`);
          }
          if (!entry.desc) {
            issues.push(`Missing description in ${market} entry ${index}`);
          }
        });
      }

      return {
        valid: issues.length === 0,
        symbolCount: Object.values(symbols.markets || {}).flat().length,
        issues,
      };
    } catch (error) {
      return {
        valid: false,
        issues: [error.message],
      };
    }
  }

  validateInfo(info) {
    if (!info) {
      return { valid: false, message: "Missing info section" };
    }

    const required = ["title", "version", "description"];
    const missing = required.filter((field) => !info[field]);

    return {
      valid: missing.length === 0,
      message:
        missing.length > 0
          ? `Missing required info fields: ${missing.join(", ")}`
          : null,
    };
  }

  validateServers(servers) {
    if (!servers || !Array.isArray(servers) || servers.length === 0) {
      return { valid: false, message: "No servers defined" };
    }

    const invalid = servers.filter(
      (server) => !server.url || !server.description,
    );
    return {
      valid: invalid.length === 0,
      message: invalid.length > 0 ? "Invalid server entries found" : null,
    };
  }

  validateComponents(components) {
    if (!components) {
      return { valid: false, message: "Missing components section" };
    }

    const required = ["schemas", "responses"];
    const missing = required.filter((field) => !components[field]);

    return {
      valid: missing.length === 0,
      message:
        missing.length > 0
          ? `Missing component sections: ${missing.join(", ")}`
          : null,
    };
  }

  validatePaths(paths) {
    if (!paths || Object.keys(paths).length === 0) {
      return { valid: false, message: "No paths defined" };
    }

    const issues = [];
    for (const [specPath, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (!operation.responses) {
          issues.push(
            `No responses defined for ${method.toUpperCase()} ${specPath}`,
          );
        }
        if (!operation.summary && !operation.description) {
          issues.push(
            `No summary/description for ${method.toUpperCase()} ${specPath}`,
          );
        }
      }
    }

    return {
      valid: issues.length === 0,
      message: issues.length > 0 ? issues.join("; ") : null,
    };
  }

  determineOverallStatus(results) {
    const checks = [results.openapi, results.asyncapi, results.symbols];
    if (checks.some((check) => !check.valid)) {
      return "error";
    }
    return "ok";
  }
}

export default DocsHealthChecker;
