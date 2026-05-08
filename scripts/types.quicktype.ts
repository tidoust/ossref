/**
 * An open-source project data entry
 */
export interface ProjectData {
  /**
   * Main categories for the project within W3C
   */
  categories: Category[];
  /**
   * Short description of the project, as a plain text string
   */
  description: string;
  /**
   * Short description of the project, as an HTML string
   */
  description_html?: string;
  /**
   * URL of the project's home page
   */
  homepage: string;
  /**
   * Open-source license for the project, using an SPDX license ID. Use an SPDX license
   * expression syntax version 2.0 string if the project is licensed under multiple common
   * licenses. Use "SEE LICENSE IN <url>" if the project uses a custom license.
   */
  license: string;
  /**
   * URL of the project's logo, when one exists
   */
  logo?: string;
  /**
   * Project name
   */
  name: string;
  /**
   * Name of the organization that hosts the project when there is one (e.g., "W3C"), the
   * username of the owner for projects that are hosted on GitHub or other source forges
   * (e.g., "tobie"), or the name of the copyright owner
   */
  owner: string;
  /**
   * Main purposes that the project addresses
   */
  purposes: Purpose[];
  /**
   * URL of the repository that contains the source code
   */
  source: string;
  status: Status;
}

/**
 * Project category within W3C
 */
export type Category = "adoption" | "implementation" | "incubation" | "tool";

/**
 * Project purpose
 */
export type Purpose =
  | "authoring"
  | "data"
  | "library"
  | "meeting tool"
  | "backend"
  | "frontend"
  | "test suite"
  | "validation";

export type Status = "active" | "maintained" | "dormant";
