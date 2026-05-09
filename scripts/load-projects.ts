import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export function loadProjects() {
  const projects = {};
  const files = fs.readdirSync("projects");
  for (const file of files) {
    if (file.endsWith(".yaml") && !file.endsWith(".auto.yaml")) {
      const projectId = file.replace(/\.yaml$/, "");
      projects[projectId] = loadProject(projectId);
    }
  }
  return projects;
}

export function loadProject(id) {
  const contents = fs.readFileSync(path.join("projects", `${id}.yaml`), "utf8");
  const project: Partial<ProjectData> = YAML.parse(contents);

  try {
    const autoContents = fs.readFileSync(path.join("projects", `${id}.auto.yaml`), "utf8");
    const autoData: Partial<ProjectData> = YAML.parse(autoContents);
    for (const [key, value] of Object.entries(autoData)) {
      // Automatically generated data should not contain properties that are
      // already set in the source entry, but the file may be out-of-sync.
      if (!project.hasOwnProperty(key)) {
        project[key] = value;
      }
    }
  }
  catch (err) {
    // There may not be any automatically generated file, e.g., because the
    // input file contains all needed information already
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
  return project;
}