/**
 * Pretty print schema validation errors so that they make sense to readers.
 *
 * The function returns markdown.
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import splitIssueBodyIntoSections from "./split-issue-body.ts";

const scriptPath = path.dirname(fileURLToPath(import.meta.url));

// Extract schema documentation from README
const readme = await fs.readFileSync(
  path.join(scriptPath, "..", "README.md"),
  "utf8",
);
const schemaStart = "<!-- SCHEMA: start -->";
const schemaEnd = "<!-- SCHEMA: end -->";
const [startPos, endPos] = [
  readme.indexOf(schemaStart),
  readme.indexOf(schemaEnd),
];
const schemaDoc = readme.substring(startPos + schemaStart.length, endPos);
const propertiesDoc = {};
const sections = splitIssueBodyIntoSections(schemaDoc);
for (const section of sections) {
  const match = section.title.match(/^`(.*)`$/);
  if (!match) {
    continue;
  }
  propertiesDoc[match[1]] = section.value;
}

export function printValidationErrors(errors) {
  let report = "";
  function log(msg?: string) {
    report += (msg ?? "") + "\n";
  }

  if (!errors) {
    return report;
  }

  const missingErrors = errors.filter((err) => err.keyword === "required");
  for (const missingError of missingErrors) {
    const property = missingError.params.missingProperty;
    log(`#### Add a \`${property}\` property`);
    log();
    log(propertiesDoc[property]);
    log();
  }
  const invalidErrors = errors.filter((err) => err.keyword === "enum");
  for (const invalidError of invalidErrors) {
    const property = invalidError.instancePath.split("/")[1];
    log(`#### Fix the \`${property}\` property value`);
    log();
    log(propertiesDoc[property]);
    log();
  }

  const remainingErrors = errors.filter(
    (err) => !missingErrors.includes(err) && !invalidErrors.includes(err),
  );
  if (remainingErrors.length) {
    log("#### Fix miscellaneous schema errors");
    log();
    log("```json");
    log(JSON.stringify(remainingErrors, null, 2));
    log("```");
    log();
  }

  return report;
}
