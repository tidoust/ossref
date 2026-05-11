/**
 * CLI tool to check addition of a suggested project.
 *
 * The suggested project may be identified by an issue number, in which case
 * the code will fetch the issue from the underlying GitHub repository using
 * the `gh` CLI utility.
 *
 * It may also be a link to a local YAML file, in which case the code will
 * load and analyze that file instead.
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { loadProject, loadProjects } from "./load-projects";
import splitIssueBodyIntoSections from "./split-issue-body";
import { validateProjectData, validatePartialProjectData } from "./validate";
import { compileProjectInfo } from "./compile-project-info";
import YAML from "yaml";

import type { ProjectData } from "./types";

const scriptPath = path.dirname(fileURLToPath(import.meta.url));

/**
 * Command-line execution parameters for calls to `execSync`
 */
const execParams = { cwd: path.join(scriptPath, "..") };

let project: Partial<ProjectData> = {};
const what = process.argv[2];
if (!what) {
  console.log(
    "Project to check (GitHub issue number, existing project ID, or path to YAML file) needs to be given as argument.",
  );
  process.exit(0);
}
if (what.match(/^\d+$/)) {
  // Retrieve project information from GitHub issue
  let issueStr = null;
  try {
    issueStr = execSync(
      `gh issue view ${what} --json body,state,title`,
      execParams,
    );
  } catch (err) {
    console.log(`Could not retrieve issue #${what}.`);
    process.exit(0);
  }

  const issue = JSON.parse(issueStr);
  project.name = issue.title.trim().replace(/^Add new project:\s*/i, "");
  const sections = splitIssueBodyIntoSections(issue.body);
  for (const section of sections) {
    if (section.title === "Home page") {
      // Consider that the "home page" is the repository URL if it is a GitHub
      // URL. It may be that we'll use that URL for the home page as well, but
      // that's fine.
      const url = section.value.trim();
      if (url.match(/^https:\/\/github\.com\//)) {
        project.repository = url;
      } else {
        project.homepage = url;
      }
    } else if (section.title === "Additional properties") {
      try {
        const yaml = section.value
          .replace(/^```yaml\s*/, "")
          .replace(/\s*```$/, "")
          .trim();
        if (yaml) {
          const suggestion = YAML.parse(yaml);
          for (const [key, value] of Object.entries(suggestion)) {
            if (key === "name") {
              console.log(
                'The "Additional properties" section must not have a `name` field. That field is extracted from the issue title.',
              );
              process.exit(0);
            }
            if (key === "homepage") {
              console.log(
                'The "Additional properties" section must not have a `homepage` field. That URL must be given in the "Home page" section.',
              );
              process.exit(0);
            }
            project[key] = value;
          }
        }
      } catch {
        console.log(
          'The "Additional properties" section does not contain valid YAML.',
        );
        process.exit(0);
      }
    }
  }
} else {
  // Retrieve project information from the given filename
  project = loadProject(what);
  if (!project.id) {
    const match = what.match(/([^/]+)\.yml$/);
    if (match) {
      project.id = match[1];
    }
  }
}

// Make sure that we have the minimum amount of information that we need
if (!project.name) {
  console.log("Missing required project name.");
  process.exit(0);
}
if (!project.homepage && !project.repository) {
  console.log(
    "Missing required home page (or link to repository) for the project.",
  );
  process.exit(0);
}
if (!project.id) {
  project.id = project.name.toLowerCase().replace(/\s+/g, "-");
}

const projects = loadProjects();
if (projects[project.id]) {
  console.log(
    `Project ID ${project.id} would clash with existing project ${projects[project.id].name}`,
  );
  process.exit(0);
}

const partialErrors = validatePartialProjectData(project);
if (partialErrors) {
  // TODO: pretty print ajv validation errors
  console.log("Invalid information found. Schema validation errors follow.");
  console.log();
  console.log("```json");
  console.log(JSON.stringify(partialErrors, null, 2));
  console.log("```");
  process.exit(0);
}

const autoInfo = await compileProjectInfo(project);
if (process.argv[3] !== "--add") {
  console.log("Information that can be computed automatically:");
  console.log("```yaml");
  console.log(YAML.stringify(autoInfo));
  console.log("```");
  console.log();
}

const info = {};
let canBeSimplified = false;
for (const [key, value] of Object.entries(autoInfo)) {
  if (key === "id") {
    continue;
  }
  if (project[key]) {
    if (project[key].trim() === value) {
      console.log(
        `- Drop key \`${key}\`, as it can be computed automatically.`,
      );
      canBeSimplified = true;
    }
  } else {
    info[key] = value;
  }
}

const fullProject = Object.assign({}, autoInfo, project);
const validationErrors = validateProjectData(fullProject);
if (validationErrors) {
  // TODO: pretty print ajv validation errors
  console.log("Not enough information. Schema validation errors follow.");
  console.log();
  console.log("```json");
  console.log(JSON.stringify(validationErrors, null, 2));
  console.log("```");
  process.exit(0);
}
if (canBeSimplified) {
  process.exit(0);
}

if (process.argv[3] === "--add") {
  const id = project.id;
  delete project.id;
  fs.writeFileSync(
    path.join("projects", `${id}.yml`),
    YAML.stringify(project),
    "utf8",
  );
  console.log(`Add project ${project.name}`);
  console.log();
  console.log(`This adds "${project.name}" with ID ${id} to the list.`);
  if (what.match(/^\d+$/)) {
    console.log();
    console.log(`Close #${what}`);
  }
} else {
  console.log("That all looks good to me!");
}
