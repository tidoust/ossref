import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { validatePartialProjectData } from "../scripts/validate";

describe("Individual YAML files", async function () {
  const yamlFiles = [];
  const files = await fs.readdir("projects");
  for (const file of files) {
    if (file.endsWith(".yml")) {
      const text = await fs.readFile(path.join("projects", file), "utf8");
      yamlFiles.push({ file, text });
    }
  }

  for (const yamlFile of yamlFiles) {
    describe(`The ${yamlFile.file} file`, function () {
      it("follows the schema", function () {
        const project = YAML.parse(yamlFile.text);
        assert.deepEqual(validatePartialProjectData(project), null);
      });
    });
  }
});
