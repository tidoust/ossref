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
import { loadProject } from "./load-projects";
import splitIssueBodyIntoSections from "./split-issue-body";
import { validateProjectData, validatePartialProjectData } from "./validate";
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
  process.exit(1);
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
    process.exit(1);
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
          .replace(/^```yaml\s+/, "{")
          .replace(/\s+```$/, "}")
          .trim();
        const suggestion = YAML.parse(yaml);
        for (const [key, value] of suggestion) {
          if (key === "name") {
            console.log(
              'The "Additional properties" section must not have a `name` field. That field is extracted from the issue title.',
            );
            process.exit(1);
          }
          if (key === "homepage") {
            console.log(
              'The "Additional properties" section must not have a `homepage` field. That URL must be given in the "Home page" section.',
            );
            process.exit(1);
          }
          project[key] = value;
        }
      } catch {
        console.log(
          'The "Additional properties" section does not contain valid YAML.',
        );
        process.exit(1);
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
  process.exit(1);
}
if (!project.homepage && !project.repository) {
  console.log(
    "Missing required home page (or link to repository) for the project.",
  );
  process.exit(1);
}
if (!project.id) {
  project.id = project.name.toLowerCase().replace(/\s+/g, "-");
}

const partialErrors = validatePartialProjectData(project);
if (partialErrors) {
  // TODO: pretty print ajv validation errors
  console.log("Invalid information found. Schema validation errors follow.");
  console.log();
  console.log("```json");
  console.log(JSON.stringify(partialErrors, null, 2));
  console.log("```");
  process.exit(1);
}

// TODO: fetch automatic information to complete information
// TODO: handle project ID somehow (not part of the schema for now)

const validationErrors = validateProjectData(project);
if (validationErrors) {
  // TODO: pretty print ajv validation errors
  console.log("Not enough information. Schema validation errors follow.");
  console.log();
  console.log("```json");
  console.log(JSON.stringify(validationErrors, null, 2));
  console.log("```");
  process.exit(1);
}
