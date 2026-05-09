import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadProjects } from "../scripts/load-projects.ts";
import Ajv from "ajv";
import addFormats from "ajv-formats";

import schema from "../schemas/data.schema.json" with { type: "json" };

describe("Projects", async function () {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const projects = loadProjects();

  for (const [projectId, project] of Object.entries(projects)) {
    describe(`The ${projectId} project`, function () {
      it("follows the schema", function () {
        // Note: the schema is for an indexed object of project entries
        const list = {};
        list[projectId] = project;
        validate(list);
        assert.deepEqual(validate.errors, null);
      });
    });
  }
});
