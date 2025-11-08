import { promises as fs } from "fs";
import path from "path";

class RedocManager {
  constructor(specsDir, templatePath) {
    this.specsDir = specsDir;
    this.templatePath = templatePath;
  }

  async generateRedocHtml(version, outputDir) {
    try {
      const template = await fs.readFile(this.templatePath, "utf8");

      const versionedTemplate = template.replace(
        /\/docs\/spec\//g,
        `/docs/spec/${version}/`,
      );

      await fs.mkdir(outputDir, { recursive: true });

      await fs.writeFile(path.join(outputDir, "redoc.html"), versionedTemplate);
    } catch (error) {
      throw new Error(`Failed to generate Redoc HTML: ${error.message}`);
    }
  }
}

export default RedocManager;
