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
import { loadProject, loadProjects } from "./load-projects.ts";
import splitIssueBodyIntoSections from "./split-issue-body.ts";
import { validateProjectData, validatePartialProjectData } from "./validate.ts";
import { compileProjectInfo } from "./compile-project-info.ts";
import { printValidationErrors } from "./print-validation-errors.ts";
import { KeyOrder } from "./key-order.ts";
import YAML from "yaml";

import type { ProjectData } from "./types";

const scriptPath = path.dirname(fileURLToPath(import.meta.url));

/**
 * Command-line execution parameters for calls to `execSync`
 */
const execParams = { cwd: path.join(scriptPath, "..") };

let pendingLog = "";
function log(msg?: string) {
  pendingLog += (msg ?? "") + "\n";
}
function reportLogAndExit() {
  console.log(pendingLog);
  process.exit(0);
}

function convertNameToID(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "");
}

let project: Partial<ProjectData> = {};
const what = process.argv[2];
if (!what) {
  log(
    "Project to check (GitHub issue number, existing project ID, or path to YAML file) needs to be given as argument.",
  );
  reportLogAndExit();
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
    log(`Could not retrieve issue #${what}.`);
    reportLogAndExit();
  }

  log("### Validation of the suggested data");
  log();
  const issue = JSON.parse(issueStr);
  project.name = issue.title.trim().replace(/^Add new project:\s*/i, "");
  const sections = splitIssueBodyIntoSections(issue.body);
  for (const section of sections) {
    if (section.title === "URL") {
      // Consider that the URL is the repository URL if it is a GitHub URL.
      // It may be that we'll use that URL for the home page as well, but
      // that's fine.
      const url = section.value.trim();
      if (url.match(/^https:\/\/github\.com\//)) {
        project.repository = url;
      } else {
        project.homepage = url;
        const match = url.match(/^https:\/\/([^\.]+)\.github\.io\/([^\/]+)/);
        if (match) {
          project.repository = `https://github.com/${match[1]}/${match[2]}`;
        }
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
              log(
                'The "Additional properties" section must not have a `name` field. Specify the name in the issue title instead.',
              );
              reportLogAndExit();
            }
            project[key] = value;
          }
        }
      } catch {
        log('The "Additional properties" section does not contain valid YAML.');
        reportLogAndExit();
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
if (!project.homepage && !project.repository) {
  log("Missing required URL for the project.");
  reportLogAndExit();
}

const partialErrors = validatePartialProjectData(project);
if (partialErrors) {
  log("Data is invalid. Schema validation errors follow.");
  log();
  log(printValidationErrors(partialErrors));
  reportLogAndExit();
}
log("Data looks valid.");
log();

const autoInfo = await compileProjectInfo(project);
log("### Information that would be computed automatically");
log();
log("```yaml");
log(YAML.stringify(autoInfo, KeyOrder));
log("```");
log();

if (!project.id) {
  project.id = project.name ? convertNameToID(project.name) : autoInfo.id;
}

const projects = loadProjects();
if (projects[project.id]) {
  log(
    `Project ID ${project.id} would clash with existing project ${projects[project.id].name}`,
  );
  reportLogAndExit();
}

// In the case of a GitHub issue, suggestion includes a project name. If that
// name matches the one we manage to compute, we don't need to keep the
// suggestion. Similarly, if the suggested project name looks like
// `[owner]/[name]`, we probably want to drop the suggested name as well if we
// can find a better name.
if (what.match(/^\d+$/)) {
  if (project.name === autoInfo.name) {
    log(`- Project name (${project.name}) would be computed automatically.`);
    delete project.name;
  } else if (project.name.match(/^[^\/\s]+\/[^\/\s]+$/)) {
    if (autoInfo.name) {
      log(
        `- The project name computed automatically (${autoInfo.name}) would be used as it seems better than the suggested one ("${project.name}")`,
      );
      delete project.name;
    } else {
      log(
        `- The suggested project name (${project.name}) seems so-so but no better name could be found. Consider providing one.`,
      );
    }
  }
}

const info = {};
let canBeSimplified = false;
for (const [key, value] of Object.entries(autoInfo)) {
  if (key === "id") {
    continue;
  }
  if (project[key]) {
    if (Array.isArray(project[key])) {
      if (
        project[key].length === value.length &&
        project[key].every((v, i) => value[i] === v)
      ) {
        canBeSimplified = true;
        log(`- Drop key \`${key}\` since it can be computed automatically.`);
      }
    } else if (project[key].trim() === value) {
      canBeSimplified = true;
      log(`- Drop key \`${key}\` since it can be computed automatically.`);
    }
  } else {
    info[key] = value;
  }
}

const fullProject = Object.assign({}, info, project);

log("### How the full project would look like");
log();
log("```yaml");
log(YAML.stringify(fullProject, KeyOrder));
log("```");
log();

const validationErrors = validateProjectData(fullProject);
log("### Validation of the full project");
log();
if (validationErrors) {
  log(
    "Not enough information to add the project as-is. Schema validation errors follow.",
  );
  log();
  log(printValidationErrors(validationErrors));
} else if (canBeSimplified) {
  log("See above, drop data that can be computed automatically.");
}
if (validationErrors || canBeSimplified) {
  reportLogAndExit();
} else if (process.argv[3] !== "--add") {
  log("The suggested project looks good! 😎");
  reportLogAndExit();
}

// Still running? That means the suggested project looks good and the request
// is to create a YAML file under the "projects" folder for it, and report a
// possible commit message.
const id = project.id;
delete project.id;
fs.writeFileSync(
  path.join("projects", `${id}.yml`),
  YAML.stringify(project, KeyOrder),
  "utf8",
);
console.log(`Add project ${fullProject.name}`);
console.log();
console.log(
  `This adds the project "${fullProject.name}" with ID ${id} to the list.`,
);
if (what.match(/^\d+$/)) {
  console.log();
  console.log(`Close #${what}`);
}
