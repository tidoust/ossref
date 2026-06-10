/**
 * Compute a project ID for the project
 */
export function computeID(project) {
  if (project.repository) {
    const match = project.repository.match(
      /^https:\/\/github\.com\/(.*)\/(.*)\/?$/,
    );
    if (match) {
      return match[2];
    }
  }

  if (project.name) {
    return project.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "");
  }

  return null;
}
