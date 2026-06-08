/**
 * Convert the YAML files under the "projects" folder to a JSON index in the
 * root folder.
 */

import fs from "node:fs";
import { loadProjects } from "./load-projects";
import { convertMarkdown } from "./text";
import { ProjectsData } from "./types";

import schema from "../schemas/data.schema.json" with { type: "json" };

function convert() {
  const projects: ProjectsData = loadProjects();
  for (const project of Object.values(projects)) {
    if (project.description) {
      const { text, html } = convertMarkdown(project.description);
      project.description = text;
      project.description_html = html;
    }
  }

  // To ease updates and reduce arbitrary diffs, we're going to impose the
  // order of the keys in the index.json file. This order needs to be
  // revisited when a new key is created and when a key is removed.
  let keyOrder = [
    "name",
    "description",
    "description_html",
    "homepage",
    "repository",
    "logo",
    "owner",
    "licenses",
    "status",
    "purposes",
    "categories",
  ];
  const allKeys = Object.keys(schema.definitions.ProjectData.properties).filter(
    (k) => k !== "id",
  );
  const missingKeys = allKeys.filter((k) => !keyOrder.includes(k));
  if (missingKeys.length) {
    throw new Error(
      `Add ${missingKeys.join(", ")} to key order in build script`,
    );
  }
  const droppedKeys = keyOrder.filter((k) => !allKeys.includes(k));
  if (droppedKeys.length) {
    throw new Error(
      `Drop ${droppedKeys.join(", ")} from key order in build script`,
    );
  }

  // Note: there may be a way to serialize things with one JSON.stringify call
  // instead of going through entries and semi-serializing things on our own,
  // but it works.
  const res =
    '{ "projects": {' +
    Object.entries(projects)
      .map(
        ([id, project]) =>
          JSON.stringify(id) + ": " + JSON.stringify(project, keyOrder),
      )
      .join(",") +
    "}}";
  fs.writeFileSync("index.json", res, "utf8");
}

convert();
console.log("Indexed list in index.json updated");
