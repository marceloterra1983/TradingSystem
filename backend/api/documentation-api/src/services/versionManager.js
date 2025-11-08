import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";
import semver from "semver";

class VersionManager {
  constructor(specsDir) {
    this.specsDir = specsDir;
    this.versionsDir = path.join(specsDir, "versions");
    this.baseVersion = "0.0.0";
    this.baseMajor = 0;
    this.cache = {
      all: [],
      latest: "0.0.0",
      stable: "0.0.0",
    };
  }

  async initialize() {
    await fs.mkdir(this.specsDir, { recursive: true });
    await fs.mkdir(this.versionsDir, { recursive: true });

    const version = await this.readSpecVersion(
      path.join(this.specsDir, "openapi.yaml"),
    );
    if (version && semver.valid(version)) {
      this.baseVersion = version;
      this.baseMajor = semver.major(version);
    }

    await this.refreshCache();
  }

  async listVersions() {
    await this.refreshCache();
    return {
      base: this.baseVersion,
      latest: this.cache.latest,
      stable: this.cache.stable,
      all: [...this.cache.all],
    };
  }

  async getVersion(identifier) {
    await this.refreshCache();
    const resolved = this.resolveVersionId(identifier);

    const isBase = resolved === this.baseVersion;
    const versionPath = isBase
      ? this.specsDir
      : path.join(this.versionsDir, resolved);
    const exists = await this.pathExists(versionPath);
    if (!exists) {
      throw new Error(`Version ${identifier} not found`);
    }

    const specs = {
      openapi: isBase
        ? path.join(this.specsDir, "openapi.yaml")
        : path.join(versionPath, "openapi.yaml"),
      asyncapi: isBase
        ? path.join(this.specsDir, "asyncapi.yaml")
        : path.join(versionPath, "asyncapi.yaml"),
    };

    const lastUpdated =
      (await this.fileTimestamp(specs.openapi)) ||
      (await this.fileTimestamp(specs.asyncapi));

    return {
      version: resolved,
      path: versionPath,
      specs,
      lastUpdated,
    };
  }

  async createVersion(type = "minor") {
    await this.refreshCache();

    const bumpType = ["major", "minor", "patch"].includes(type)
      ? type
      : "minor";
    const sourceVersion = this.cache.latest;
    const source = await this.getVersion(sourceVersion);
    const sourceVersionValue = semver.valid(source.version)
      ? source.version
      : this.baseVersion;

    const newVersion = semver.inc(sourceVersionValue, bumpType);
    if (!newVersion) {
      throw new Error(
        `Unable to compute ${bumpType} version from ${sourceVersionValue}`,
      );
    }

    const targetDir = path.join(this.versionsDir, newVersion);
    await fs.mkdir(targetDir, { recursive: true });

    await this.copySpecWithVersion(
      source.specs.openapi,
      path.join(targetDir, "openapi.yaml"),
      newVersion,
    );
    await this.copySpecWithVersion(
      source.specs.asyncapi,
      path.join(targetDir, "asyncapi.yaml"),
      newVersion,
    );

    await this.copySchemas(source.path, targetDir);

    await this.refreshCache();

    return {
      version: newVersion,
      type: bumpType,
      path: targetDir,
      specs: {
        openapi: path.join(targetDir, "openapi.yaml"),
        asyncapi: path.join(targetDir, "asyncapi.yaml"),
      },
    };
  }

  async compareVersions(v1, v2) {
    const [version1, version2] = await Promise.all([
      this.getVersion(v1),
      this.getVersion(v2),
    ]);

    const [openApi1, openApi2] = await Promise.all([
      this.readYaml(version1.specs.openapi),
      this.readYaml(version2.specs.openapi),
    ]);
    const [asyncApi1, asyncApi2] = await Promise.all([
      this.readYaml(version1.specs.asyncapi),
      this.readYaml(version2.specs.asyncapi),
    ]);

    return {
      v1: version1.version,
      v2: version2.version,
      changes: {
        paths: this.diffObject(openApi1.paths || {}, openApi2.paths || {}),
        components: this.diffObject(
          (openApi1.components && openApi1.components.schemas) || {},
          (openApi2.components && openApi2.components.schemas) || {},
        ),
        channels: this.diffObject(
          asyncApi1.channels || {},
          asyncApi2.channels || {},
        ),
      },
    };
  }

  async getVersionStats(identifier) {
    const version = await this.getVersion(identifier);
    const [openApi, asyncApi] = await Promise.all([
      this.readYaml(version.specs.openapi),
      this.readYaml(version.specs.asyncapi),
    ]);

    const endpoints = Object.entries(openApi.paths || {}).reduce(
      (total, [, methods]) => total + Object.keys(methods || {}).length,
      0,
    );
    const channels = Object.keys(asyncApi.channels || {}).length;

    return {
      endpoints,
      channels,
    };
  }

  async removeVersion(version) {
    if (version === this.baseVersion) {
      return;
    }
    const versionPath = path.join(this.versionsDir, version);
    if (await this.pathExists(versionPath)) {
      await fs.rm(versionPath, { recursive: true, force: true });
      await this.refreshCache();
    }
  }

  async reindexVersion(version) {
    const resolved = this.resolveVersionId(version);
    this.cache.all = this.cache.all.filter((entry) => entry !== resolved);
    this.cache.latest =
      this.cache.all[this.cache.all.length - 1] || this.baseVersion;
    return this.getVersion(resolved);
  }

  async addVersion(version) {
    if (!this.cache.all.includes(version)) {
      this.cache.all.push(version);
      this.cache.all.sort((a, b) => semver.compare(a, b));
      this.cache.latest = this.cache.all[this.cache.all.length - 1];
    }
    return this.getVersion(version);
  }

  async refreshCache() {
    const entries = await fs.readdir(this.versionsDir).catch(() => []);
    const versions = entries
      .filter((entry) => semver.valid(entry))
      .sort(semver.compare);

    const all = [];
    if (semver.valid(this.baseVersion)) {
      all.push(this.baseVersion);
    }
    for (const version of versions) {
      if (!all.includes(version)) {
        all.push(version);
      }
    }

    const latest = all.length ? all[all.length - 1] : this.baseVersion;
    const stableCandidate =
      [...all]
        .reverse()
        .find((version) => semver.major(version) === this.baseMajor) || latest;

    this.cache = {
      all,
      latest,
      stable: stableCandidate,
    };
  }

  resolveVersionId(identifier) {
    if (!identifier || identifier === "current") {
      return this.cache.latest;
    }
    if (identifier === "latest") {
      return this.cache.latest;
    }
    if (identifier === "stable") {
      return this.cache.stable;
    }
    if (identifier === "base") {
      return this.baseVersion;
    }
    if (!this.cache.all.includes(identifier)) {
      throw new Error(`Version ${identifier} not found`);
    }
    return identifier;
  }

  async readSpecVersion(specPath) {
    try {
      const data = await this.readYaml(specPath);
      return data?.info?.version || null;
    } catch {
      return null;
    }
  }

  async readYaml(filePath) {
    const raw = await fs.readFile(filePath, "utf8");
    return yaml.load(raw);
  }

  async copySpecWithVersion(sourcePath, targetPath, version) {
    const spec = await this.readYaml(sourcePath);
    if (!spec.info) {
      spec.info = {};
    }
    spec.info.version = version;
    const serialized = yaml.dump(spec, { noRefs: true, lineWidth: 120 });
    await fs.writeFile(targetPath, serialized, "utf8");
  }

  async copySchemas(sourcePath, targetPath) {
    const sourceDir = path.join(sourcePath, "schemas");
    const targetDir = path.join(targetPath, "schemas");
    if (!(await this.pathExists(sourceDir))) {
      return;
    }
    await fs.rm(targetDir, { recursive: true, force: true });
    await fs.mkdir(targetDir, { recursive: true });
    await fs.cp(sourceDir, targetDir, { recursive: true });
  }

  diffObject(a, b) {
    const keysA = new Set(Object.keys(a));
    const keysB = new Set(Object.keys(b));
    const added = [...keysB].filter((key) => !keysA.has(key));
    const removed = [...keysA].filter((key) => !keysB.has(key));
    const modified = [...keysA]
      .filter((key) => keysB.has(key))
      .filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]));

    return { added, removed, modified };
  }

  async pathExists(targetPath) {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  async fileTimestamp(filePath) {
    try {
      const stat = await fs.stat(filePath);
      return stat.mtime.toISOString();
    } catch {
      return null;
    }
  }
}

export default VersionManager;
