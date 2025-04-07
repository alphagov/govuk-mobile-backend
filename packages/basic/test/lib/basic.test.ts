import { expect, describe, it } from "vitest";
import { basic } from "../../src/lib/basic";

describe('Basic test suite', () => {
    it('should return the word basic', () => {
	const result = basic();
	expect(result).to.equal("basic");
    });
});
