# Open source software at W3C

This repository contains a machine-readable list of open-source software (OSS) developed at W3C, or commonly used by the W3C community to progress incubation and standardization work.

The list is an object where keys are project IDs and values are [OSS objects](#oss-object).

## OSS object

Each open-source software entry in the list comes with the following properties. Unless otherwise specified below, these properties are always set.

<!-- SCHEMA: start -->

### `name`

The project's name, as a plain text string. The name should remain short. It is intended for use as a heading, or in a sentence in prose.

### `description`

A short description of the project, as a plain text string.

### `description_html`

A short description of the project, as an HTML string. The text should match the plain text version.

### `logo`

URL of the project's logo, when one exists. Whenever possible, the logo should be a square image, minimum 512x512 in size, using a common image format (SVG, JPEG, PNG, GIF).

The property may not be set.

### `owner`

Name of the organization that hosts the project when there is one (e.g., \"W3C\"), the username of the owner for projects that are hosted on GitHub or other source forges (e.g., \"tobie\"), or the name of the copyright owner.

### `homepage`

Absolute URL of the project's home page. The URL may match the [repository URL](#repository) in the absence of a more dedicated home page.

### `repository`

Absolute URL of the repository that contains the source code of the project.

### `licenses`

Open-source licenses for the project, using an [SPDX license ID](https://spdx.org/licenses/). Use \"other\" if the project uses a custom license.

Common SPDX License IDs used in W3C projects include:

- `"Apache-2.0"` for the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
- `"BSD-3-Clause` for the [BSD 3-Clause "New" or "Revised" License](https://opensource.org/license/BSD-3-Clause).
- `"CC0-1.0"` for the [Creative Commons Zero v1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/legalcode).
- `"MIT"` for the [MIT License](https://mit-license.org/).
- `"W3C-20150513"` for the [W3C Software Notice and Document License](https://www.w3.org/copyright/software-license-2023/). Despite the date, this SPDX license ID also targets the 1 January 2023 version.
- `"W3C-Test-Suite"` for the [W3C test suite license](https://www.w3.org/copyright/test-suite-license-2023/). Note that this is not an official SPDX license ID (this license is not an open-source license since it purposedly does not grant rights to create modifications or derivatives. It may appear in the list because test suites at W3C are usually also licensed under the terms of a BSD 3-Clause license).

### `purposes`

Main purposes that the project addresses. Possible individual values are:

- `"authoring"`: An authoring tool. For example, a spec authoring tool or a slides authoring tool.
- `"dashboard"`: A dashboard. Often used in combination with `"data"` when the project also exports the data in a machine-readable way.
- `"data"`: Machine-readable data. For example, the OSSref project exposes a list of open-source projects in a JSON file.
- `"library"`: Library that other projects may depend on.
- `"group tool"`: Tooling for W3C groups. For example, a meeting helper tool, an IRC bot that eases tracking of group discussions.
- `"backend"`: Tool intended for use as a backend component in a server.
- `"frontend"`: Tool intended for use as a frontend component in a Web or native application.
- `"samples"`: Code samples. For example, samples that illustrate usage of technologies that a W3C group develops.
- `"tests"`: Test suites.
- `"validation"`: A checker or validation tool.

Projects may have different purposes. Only main purposes should be listed. For example, while it is common for an OSS project to include code tests, these tests are not the main purpose of the project and `"tests"` should not appear in the list of purposes.

### `categories`

Main categories for the project within W3C. Possible individual values are:

- `"adoption"`: An adoption enabler. For example, projects targeted at CMS, IDE, framework, quality assurance, documentation integrations to favor adoption of web technologies.
- `"implementation`: A reference implementation of some specification (or part of a specification) being standardized, including polyfills.
- `"incubation"`: OSS projects that precede or inspire specifications.
- `"tool"`: Internal standardization tools, e.g., to support planning, publication, and operations within W3C, but in some cases used by other organizations or useful for broader purposes.

### `status`

Project status. Value may be one of:

- `"active"`: The project is actively being developed.
- `"maintained"`: The project is stable or no longer actively being developed, but the code is maintained.
- `"dormant"`: The project is no longer being developed and the code is not maintained.

A project may transition between statuses at any time. For example, a dormant project may become active again.

<!-- SCHEMA: end -->

## License

This software, associated documentation, and the list (the `index.json` file) are licensed under the terms of the [CC0 License](LICENSE.txt).

## Guarantees

- The list follows the [JSON schema](schemas/data.schema.json)
- A major release will be made if a project ID disappears from the list, e.g., because a new ID gets minted for a project, or because two projects merge into one.
