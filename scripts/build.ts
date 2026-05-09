/**
 * Convert the YAML files under the "projects" folder to a JSON index in the
 * root folder.
 */

import fs from "node:fs";
import { loadProjects } from "./load-projects.ts";
import { convertMarkdown } from "./text.ts";

function convert() {
  const projects = loadProjects();
  for (const project of Object.values(projects)) {
    if (project.description) {
      const { text, html } = convertMarkdown(project.description);
      project.description = text;
      project.description_html = html;
    }
  }

  fs.writeFileSync(
    "index.json",
    JSON.stringify(projects),
    "utf8"
  );
}

convert();
console.log("Indexed list in index.json updated");
