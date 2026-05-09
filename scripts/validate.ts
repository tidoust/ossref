/**
 * A few custom schema validation functions to validate data
 */

import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "../schemas/data.schema.json" with { type: "json" };

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
ajv.addSchema(schema);

export function getValidationFunction(part?: string) {
  if (part) {
    return ajv.getSchema(`#/definitions/${part}`);
  } else {
    return ajv.getSchema("");
  }
}

export function validate(data) {
  const validate = getValidationFunction();
  validate(data);
  return validate.errors;
}

export function validateProjectData(data) {
  const validate = getValidationFunction("ProjectData");
  validate(data);
  return validate.errors;
}

export function validatePartialProjectData(data) {
  const errors = validateProjectData(data);
  if (!errors) {
    return errors;
  }
  const filteredErrors = errors.filter((err) => err.keyword !== "required");
  if (filteredErrors.length === 0) {
    return null;
  }
  return filteredErrors;
}
