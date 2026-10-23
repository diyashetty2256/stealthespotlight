import test from "node:test";
import assert from "node:assert/strict";

import { generateAudienceRoundToken, validateAudienceScore } from "./audienceVote.js";

test("round tokens are unique and properly formatted", () => {
  const tokenOne = generateAudienceRoundToken();
  const tokenTwo = generateAudienceRoundToken();

  assert.match(tokenOne, /^[a-z0-9]{24}$/);
  assert.notEqual(tokenOne, tokenTwo);
});

test("audience scores are bounded to the event range", () => {
  assert.equal(validateAudienceScore(7, 0, 10), true);
  assert.equal(validateAudienceScore(-1, 0, 10), false);
  assert.equal(validateAudienceScore(11, 0, 10), false);
  assert.equal(validateAudienceScore(10, 0, 10), true);
});
