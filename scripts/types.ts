/**
 * Quicktype produces a type for ProjectData, but does not create one for the
 * indexed list. Let's add it.
 */

import type { ProjectData } from "./types.quicktype.ts";
export type { ProjectData };

export interface ProjectsData {
  [key: string]: ProjectData;
}

export interface ProjectsIndex {
  projects: ProjectsData;
}
