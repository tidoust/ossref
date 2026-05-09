import { describe, it } from "node:test";
import assert from "node:assert/strict";
import YAML from "yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";

import schema from "../schemas/data.schema.json" with { type: "json" };
import dist from "../index.json" with { type: "json" };

describe("The index.json file", function () {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  it("follows the schema", function () {
    console.log(dist);
    validate(dist);
    assert.strictEqual(validate.errors, null);
  });
});
