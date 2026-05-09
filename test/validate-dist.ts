import { describe, it } from "node:test";
import assert from "node:assert/strict";
import YAML from "yaml";
import { validate } from "../scripts/validate";

import dist from "../index.json" with { type: "json" };

describe("The index.json file", function () {
  it("follows the schema", function () {
    assert.strictEqual(validate(dist), null);
  });
});
