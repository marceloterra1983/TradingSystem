import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";

class SchemaValidator {
  constructor(schemasDir) {
    this.schemasDir = schemasDir;
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    });
    addFormats(this.ajv);
    this.schemas = new Map();
  }

  async loadSchemas() {
    try {
      const files = await fs.readdir(this.schemasDir);
      const schemaFiles = files.filter(
        (file) => file.endsWith(".json") || file.endsWith(".yaml"),
      );

      for (const file of schemaFiles) {
        const content = await fs.readFile(
          path.join(this.schemasDir, file),
          "utf8",
        );
        const schema = file.endsWith(".yaml")
          ? yaml.load(content)
          : JSON.parse(content);

        if (schema.$id) {
          this.ajv.addSchema(schema, schema.$id);
          this.schemas.set(schema.$id, {
            file,
            schema,
            examples: [],
          });
        }
      }

      await this.loadExamples();

      return {
        loaded: this.schemas.size,
        schemas: Array.from(this.schemas.keys()),
      };
    } catch (error) {
      throw new Error(`Failed to load schemas: ${error.message}`);
    }
  }

  async loadExamples() {
    try {
      const examplesDir = path.join(this.schemasDir, "../examples");
      const files = await fs.readdir(examplesDir);

      for (const file of files) {
        const content = await fs.readFile(path.join(examplesDir, file), "utf8");
        const example = file.endsWith(".yaml")
          ? yaml.load(content)
          : JSON.parse(content);

        if (example.$schema) {
          const schemaInfo = this.schemas.get(example.$schema);
          if (schemaInfo) {
            schemaInfo.examples.push({
              file,
              content: example,
            });
          }
        }
      }
    } catch (error) {
      console.warn("Failed to load examples:", error.message);
    }
  }

  validateAgainstSchema(data, schemaId) {
    const schemaInfo = this.schemas.get(schemaId);
    if (!schemaInfo) {
      throw new Error(`Schema not found: ${schemaId}`);
    }

    const validate = this.ajv.compile(schemaInfo.schema);
    const valid = validate(data);

    return {
      valid,
      errors: validate.errors,
      schema: schemaInfo.file,
    };
  }

  async validateExample(exampleFile) {
    const content = await fs.readFile(exampleFile, "utf8");
    const example = exampleFile.endsWith(".yaml")
      ? yaml.load(content)
      : JSON.parse(content);

    if (!example.$schema) {
      throw new Error(`Example missing $schema: ${exampleFile}`);
    }

    return this.validateAgainstSchema(example, example.$schema);
  }

  async validateAllExamples() {
    const results = {
      total: 0,
      valid: 0,
      invalid: 0,
      details: [],
    };

    for (const [schemaId, schemaInfo] of this.schemas) {
      for (const example of schemaInfo.examples) {
        results.total += 1;

        try {
          const validation = await this.validateExample(
            path.join(this.schemasDir, "../examples", example.file),
          );

          if (validation.valid) {
            results.valid += 1;
          } else {
            results.invalid += 1;
          }

          results.details.push({
            schema: schemaId,
            example: example.file,
            valid: validation.valid,
            errors: validation.errors,
          });
        } catch (error) {
          results.invalid += 1;
          results.details.push({
            schema: schemaId,
            example: example.file,
            valid: false,
            errors: [{ message: error.message }],
          });
        }
      }
    }

    return results;
  }

  getSchemaInfo(schemaId) {
    const info = this.schemas.get(schemaId);
    if (!info) {
      throw new Error(`Schema not found: ${schemaId}`);
    }

    return {
      id: schemaId,
      file: info.file,
      exampleCount: info.examples.length,
      examples: info.examples.map((example) => example.file),
    };
  }

  getAllSchemas() {
    return Array.from(this.schemas.entries()).map(([id, info]) => ({
      id,
      file: info.file,
      exampleCount: info.examples.length,
    }));
  }
}

export default SchemaValidator;
