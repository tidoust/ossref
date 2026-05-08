import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";

import schema from "../schemas/data.schema.json" with { type: "json" };

describe("The YAML files", async function () {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const yamlFiles = [];
  const files = await fs.readdir("projects");
  for (const file of files) {
    if (file.endsWith(".yaml")) {
      const text = await fs.readFile(path.join("projects", file), "utf8");
      yamlFiles.push({ file, text });
    }
  }

  for (const yamlFile of yamlFiles) {
    describe(`The ${yamlFile.file} file`, function () {
      it("follows the schema", function () {
        const projectId = yamlFile.file.replace(/\.yaml$/, "");
        const project = YAML.parse(yamlFile.text);
        // Note: the schema is for an indexed object of project entries
        const list = {};
        list[projectId] = project;
        validate(list);
        console.log(validate.errors);
        assert.strictEqual(validate.errors, null);
      });
    });
  }
});
