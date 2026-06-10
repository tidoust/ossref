/**
 * Compile information about the project that can be determined automatically.
 */

import { execSync } from "node:child_process";
import fetchJSON from "./fetch-json.ts";
import { convertMarkdown } from "./text.ts";
import type { ProjectData } from "./types.ts";
import { computeID } from "./compute-id.ts";

const w3cGitHubOrganizations = ["w3c"];

/**
 * For some reason, GitHub returns license keys in lowercase. Let's use
 * better-looking SPDX IDs for common licenses.
 */
const license2Spdx = {
  "apache-2.0": "Apache-2.0",
  "bsd-2-clause": "BSD-2-Clause",
  "bsd-3-clause": "BSD-3-Clause",
  "cc0-1.0": "CC0-1.0",
  mit: "MIT",
  w3c: "W3C-20150513",
};

let report;

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
      `https://github.com/${repo.owner.login}/${repo.name}` ===
      project.repository,
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
      }
    }
    if (!res.name) {
      res.name = `${repo.owner.login}/${repo.name}`;
    }
    if (repo.homepageUrl?.trim()) {
      res.homepage = repo.homepageUrl.trim();
    }
    if (repo.description?.trim()) {
      res.description = repo.description.trim();
    }
    res.owner = w3cGitHubOrganizations.includes(repo.owner.login)
      ? "W3C"
      : repo.owner.login;
    if (repo.w3c["repo-type"][0] === "tests") {
      res.purposes = ["tests"];
    }
    if (repo.isArchived) {
      res.status = "dormant";
    }
  }

  if (project.repository.match(/^https:\/\/github\.com\//)) {
    // Gather information about the GitHub repository from the GH CLI tool
    const repoCmd = [
      "gh repo view",
      "--json",
      [
        "description",
        "homepageUrl",
        "isArchived",
        "licenseInfo",
        "owner",
        "nameWithOwner",
      ].join(","),
      project.repository,
    ].join(" ");
    const ghRepo = JSON.parse(execSync(repoCmd, { encoding: "utf-8" }));

    if (!res.name) {
      res.name = ghRepo.nameWithOwner;
    }
    if (ghRepo.homepageUrl?.trim() && !res.homepage) {
      res.homepage = ghRepo.homepageUrl.trim();
    }
    if (ghRepo.description?.trim() && !res.description) {
      res.description = ghRepo.description.trim();
    }
    if (!res.owner) {
      res.owner = w3cGitHubOrganizations.includes(repo.owner.login)
        ? "W3C"
        : repo.owner.login;
    }
    if (
      ghRepo.licenseInfo &&
      ghRepo.licenseInfo.key !== "other" &&
      (!res.licenses || !res.licenses.length)
    ) {
      const key = ghRepo.licenseInfo.key;
      res.licenses = [license2Spdx[key] ?? key];
    }
    if (ghRepo.isArchived) {
      res.status = "dormant";
    }
  }

  // Compute project ID
  res.id = computeID(res);

  // Projects are active by default
  if (!res.status) {
    res.status = "active";
  }

  // Still no homepage? We'll use the repository URL
  if (!res.homepage) {
    res.homepage = project.repository;
  }

  return res;
}
