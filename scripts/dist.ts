/**
 * Convert the YAML files under the "projects" folder to a JSON index in the
 * "dist" folder.
 */

import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { convertMarkdown } from "./text.ts";
import type { ProjectData } from "./types.quicktype.ts";

async function convert() {
  const dist = {};

  const files = await fs.readdir("projects");
  for (const file of files) {
    if (file.endsWith(".yaml")) {
      const projectId = file.replace(/\.yaml$/, "");

      const contents = await fs.readFile(path.join("projects", file), "utf8");
      const project: ProjectData = YAML.parse(contents);

      if (project.description) {
        const { text, html } = convertMarkdown(project.description);
        project.description = text;
        project.description_html = html;
      }
      dist[projectId] = project;
    }
  }

  await fs.writeFile(
    path.join("dist", "data.json"),
    JSON.stringify(dist),
    "utf8",
  );
}

convert().then((_) => console.log("Indexed list in dist/data.json updated"));
