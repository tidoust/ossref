import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadProjects } from "../scripts/load-projects";
import { validateProjectData } from "../scripts/validate";

describe("Projects", async function () {
  const projects = loadProjects();

  for (const [projectId, project] of Object.entries(projects)) {
    describe(`The ${projectId} project`, function () {
      it("follows the schema", function () {
        assert.deepEqual(validateProjectData(project), null);
      });
    });
  }
});
