/**
 * The find-projects script checks a number of project sources to report new
 * projects that may be worth including in the list.
 *
 * Command usage:
 * tsx scripts/find-project.ts --help
 *
 * Sources include known repositories that W3C tracks in the w3c/validate-repos
 * project and the https://www.w3.org/Status page.
 *
 * To avoid reporting projects more than once, the script looks at projects
 * already raised through issues in the GitHub repository before it proposes a
 * new one. The script won't propose a project whose URL or name already
 * appears in:
 * - open issues with a "new project" label.
 * - closed issues with an "ignore" label.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Command } from "commander";

import loadJSON from "./load-json";
import fetchJSON from "./fetch-json";
import sendGraphQLQuery from "./graphql";
import splitIssueBodyIntoSections from "./split-issue-body";
import ThrottledQueue from "./throttled-queue";
import { compileProjectInfo } from "./compile-project-info";

import type { ProjectData, ProjectsData } from "./types";

import packageContents from "../package.json" with { type: "json" };
const { version } = packageContents;

const config = await loadJSON("config.json");
const githubToken = config?.GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;

const scriptPath = path.dirname(fileURLToPath(import.meta.url));
const execParams = {
  cwd: path.join(scriptPath, ".."),
  encoding: "utf8" as BufferEncoding,
};

const projects = JSON.parse(
  await fs.readFile(path.join(scriptPath, "..", "index.json"), {
    encoding: "utf-8",
  }),
) as ProjectsData;

/**
 * The list of projects that are already known is derived from open and closed
 * issues in the underlying repository.
 */
const OSS_W3C_REPO = {
  type: "user",
  owner: "tidoust",
  name: "oss-w3c",
};

/**
 * A few helper functions
 */
const trimSlash = (url) => (url.endsWith("/") ? url.slice(0, -1) : url);
const eitherFilter =
  (...filters) =>
  (value) =>
    filters.some((filter) => filter(value));
const hasRepoType = (type) => (r) =>
  r.w3c &&
  r.w3c["repo-type"] &&
  (r.w3c["repo-type"] === type || r.w3c["repo-type"].includes(type));

/**
 * Return true if the given would-be project object already exists in the list.
 *
 * URLs are compared case-insentively as we sometimes end up with different
 * casing (and difference is usually not significant).
 */
function findProjectInTheList(project: Partial<ProjectData>): ProjectData {
  for (const url of [project.homepage, project.repository]) {
    if (!url) {
      continue;
    }
    const lurl = trimSlash(url.toLowerCase());
    const known = Object.values(projects).find(
      (project) =>
        trimSlash(project.repository.toLowerCase()) === lurl ||
        trimSlash(project.homepage.toLowerCase()) === lurl,
    );
    if (known) {
      return known;
    }
  }
  return null;
}

/**
 * Retrieve the list of W3C open-source projects of interest from GitHub,
 * leveraging the w3c/validate-repos project.
 *
 * The list includes tools developed by Working Groups, Interest Groups, and
 * Community Groups, as well as people in the Team.
 *
 * The source used is the w3c/validate-repos project, which tracks a number of
 * GitHub organizations associated with W3C and analyzes their repositories.
 * We typically want the repositories that have a `w3c.json` file with a
 * `repo-type` property set to `tests` or `tool`.
 */
async function fetchW3CGitHubProjects() {
  // Retrieve the full list of known W3C groups and repositories
  // from the w3c/validate-repos project.
  const { groups, repos } = await fetchJSON(
    "https://w3c.github.io/validate-repos/report.json",
  );

  // Only keep repositories that should contain content of interest for us
  return repos
    .filter(eitherFilter(hasRepoType("tests"), hasRepoType("tool")))
    .map((repo) => {
      const project: Partial<ProjectData> = {
        repository: `https://github.com/${repo.owner.login}/${repo.name}`,
      };
      return project;
    });
}

/**
 * Retrieve the list of projects that should not be reported because we're
 * already aware of them and their treatment is still pending or we explicitly
 * don't want to add them to the list.
 */
async function fetchKnownCandidates(): Promise<Partial<ProjectData>[]> {
  const list = [];

  // Retrieve the list of open issues that have a "new project" label
  let hasNextPage = true;
  let endCursor = "";
  while (hasNextPage) {
    const response = await sendGraphQLQuery(
      `query {
      ${OSS_W3C_REPO.type}(login: "${OSS_W3C_REPO.owner}") {
        repository(name: "${OSS_W3C_REPO.name}") {
          issues(
            states: OPEN,
            labels: "new project",
            first: 100
            ${endCursor ? ', after: "' + endCursor + '"' : ""}
          ) {
            pageInfo {
              endCursor
              hasNextPage
            }
            nodes {
              number
              body
            }
          }
        }
      }
    }`,
      githubToken,
    );
    const issues = response.data[OSS_W3C_REPO.type].repository.issues;
    list.push(...issues.nodes);
    hasNextPage = issues.pageInfo.hasNextPage;
    endCursor = issues.pageInfo.endCursor;
  }

  // Complete with the list of closed issues that have an ignore label
  hasNextPage = true;
  endCursor = "";
  while (hasNextPage) {
    const response = await sendGraphQLQuery(
      `query {
      ${OSS_W3C_REPO.type}(login: "${OSS_W3C_REPO.owner}") {
        repository(name: "${OSS_W3C_REPO.name}") {
          issues(
            states: CLOSED,
            labels: "ignore",
            first: 100
            ${endCursor ? ', after: "' + endCursor + '"' : ""}
          ) {
            pageInfo {
              endCursor
              hasNextPage
            }
            nodes {
              number
              body
              state
            }
          }
        }
      }
    }`,
      githubToken,
    );
    const issues = response.data[OSS_W3C_REPO.type].repository.issues;
    list.push(...issues.nodes);
    hasNextPage = issues.pageInfo.hasNextPage;
    endCursor = issues.pageInfo.endCursor;
  }

  // Convert issues to project objects, in other words extract the project's
  // main URL from the issue.
  return list
    .map((issue) => {
      const sections = splitIssueBodyIntoSections(issue.body);
      const urlSection = sections.find((section) => section.title === "URL");
      if (!urlSection) {
        // Issue does not follow the expected format
        return null;
      }
      const project = {
        repository: urlSection.value.trim(),
      };

      return project;
    })
    .filter((project) => project);
}

/**
 * Loops through well-known sources that list projects to report candidate
 * projects to consider.
 */
async function findProjects(): Promise<Partial<ProjectData>[]> {
  // Collect the list of candidate projects that we're already aware of.
  const knownCandidates = await fetchKnownCandidates();

  // Gather all possible candidate projects, keeping those that are not yet in
  // the list and for which we don't have an issue already for the exact same
  // URL.
  const candidates = []
    .concat(await fetchW3CGitHubProjects())
    .map((project) => {
      // Entry may already have been reported in an issue
      let known = knownCandidates.find((k) =>
        [project.homepage, project.repository].includes(k.homepage),
      );
      if (known) {
        return null;
      }

      // No known issue for now, but the project may already be in the list
      known = findProjectInTheList(project);
      if (known) {
        return null;
      }

      // This seems like a good candidate
      return project;
    })
    .filter((project) => project);

  return candidates;
}

function parseMaxOption(value) {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new Error("The `--max` option value must be a number.");
  }
  return parsedValue;
}

/*****************************************************************************
 * Main loop, create the CLI using Commander.
 *****************************************************************************/
const program = new Command();
program
  .name("find-projects")
  .version(version)
  .description("Find candidate specs that could be worth adding to the list.")
  .option(
    "-g, --github",
    "report candidates to the GitHub repository. The command will create one issue per candidate spec.",
  )
  .option(
    "-m, --max <number>",
    "set the maximum number of issues to create. The option is only meaningful when the `--github` option is set. Default value is 5. Set the option to 0 to report all candidate specs.",
    parseMaxOption,
    5,
  )
  .addHelpText(
    "after",
    `
Output:
  - The command reports a list of candidates for addition.
  - Additionally, if the \`--github\` option is set, the command also reports these candidates as issues opened against the tool's core repository.

Notes:
  - The command only creates an issue if there is no open issue that already suggests adding the project.

Examples:
  $ find-projects
  $ find-projects --github --max 3
`,
  )
  .action(async (options) => {
    let candidates = await findProjects();
    if (candidates.length === 0) {
      console.log("No candidate projects found");
      return;
    }

    if (options.max > 0) {
      candidates = candidates.slice(0, options.max);
    }

    const candidatesInfo = [];
    for (const candidate of candidates) {
      candidatesInfo.push(await compileProjectInfo(candidate));
    }

    console.log(
      `${candidates.length} candidate projects that may be worth adding:`,
    );
    for (let idx = 0; idx < candidates.length; idx++) {
      const candidate = candidates[idx];
      const autoInfo = candidatesInfo[idx];
      const project = Object.assign({}, autoInfo, candidate);
      const homepageStr = project.homepage
        ? `, home page: ${project.homepage}`
        : "";
      console.log(
        `- [${project.name}](${project.repository}) (would-be ID: ${project.id})${homepageStr}`,
      );
    }

    if (options.github && candidates.length > 0) {
      console.log();
      console.log("Report updates to GitHub:");
      for (let idx = 0; idx < candidates.length; idx++) {
        const candidate = candidates[idx];
        const autoInfo = candidatesInfo[idx];
        const project = Object.assign({}, autoInfo, candidate);
        if (!project.homepage) {
          project.homepage = project.repository;
        }
        const title = `Add new project: ${project.name ?? project.id}`;
        const bodyFile = path.join(scriptPath, "..", "__issue.md");
        const comments = [
          project.id ? `- Would-be ID: \`${project.id}\`` : null,
          project.homepage && project.homepage !== project.repository
            ? `- Home page: ${project.homepage}`
            : null,
        ].filter((comment) => !!comment);
        await fs.writeFile(
          bodyFile,
          `### URL

${project.repository || project.homepage}

### Rationale

${comments.join("\n")}

### Additional properties

\`\`\`yaml
\`\`\`
`,
          "utf8",
        );
        const res = execSync(
          `gh issue create --label "new project,review" --title "${title}" --body-file "__issue.md"`,
          execParams,
        );
        const createdIssue = res
          .trim()
          .replace(/^http:\/\/github\.com\/.*?\/(\d+)$/, "$1");
        console.log(
          `- created issue #${createdIssue.trim()} for ${candidate.name ?? candidate.id}`,
        );
        await fs.rm(bodyFile, { force: true });
      }
    }
  });

program.parseAsync(process.argv);
