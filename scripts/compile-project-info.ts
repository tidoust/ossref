/**
 * Compile information about the project that can be determined automatically.
 */

import fetchJSON from "./fetch-json";
import { convertMarkdown } from "./text";
import type { ProjectData } from "./types";

let report;

const w3cGitHubOrganizations = ["w3c"];

export async function compileProjectInfo(
  project: Partial<ProjectData>,
): Promise<Partial<ProjectData>> {
  const res: Partial<ProjectData> = {};

  if (!report) {
    report = await fetchJSON(
      "https://w3c.github.io/validate-repos/report.json",
    );
  }
  const repo = report.repos.find(
    (repo) =>
      project.repository ===
      `https://github.com/${repo.owner.login}/${repo.name}`,
  );

  if (repo) {
    // Get information from the validate-repos report
    if (repo.readme?.text) {
      const lines = repo.readme.text.split("\n");
      const title = lines.find(
        (line, idx) =>
          line.trim().startsWith("#") ||
          lines[idx + 1]?.trim()?.startsWith("=="),
      );
      if (title) {
        res.name = convertMarkdown(title).text.trim();
        res.id = res.name.toLowerCase().replace(/\s+/g, "-");
      }
    }
    if (!res.name) {
      res.name = `${repo.owner.login}/${repo.name}`;
    }
    res.id =
      res.id ?? (project.name ?? res.name).toLowerCase().replace(/\s+/g, "-");
    if (repo.homepageUrl) {
      res.homepage = repo.homepageUrl;
    }
    if (repo.description) {
      res.description = repo.description;
    }
    res.owner = w3cGitHubOrganizations.includes(repo.owner.login)
      ? "W3C"
      : repo.owner.login;
    if (repo.w3c["repo-type"][0] === "tests") {
      res.purposes = ["tests"];
    }
  } else if (project.repository.match(/^https:\/\/github\.com\//)) {
    // Gather information from the repository itself
  }

  return res;
}
