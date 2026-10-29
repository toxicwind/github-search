// TDD: bare /regex/ queries must route to Blackbird (the only engine with
// regex semantics). REST /search/code silently returns 0 for them — the bug
// observed live on :25113 (regex 0 results vs substring 10, 2026-10-29).
import { describe, expect, test } from "bun:test";
import { needsBlackbirdEngine } from "../src/blackbird";

describe("needsBlackbirdEngine — bare regex queries", () => {
	test("bare /regex/ without qualifiers routes to Blackbird", () => {
		expect(needsBlackbirdEngine("/nzbhydr(a|)2?d?/i")).toBe(true);
	});

	test("bare /regex/ with flags (gimsu) routes to Blackbird", () => {
		expect(needsBlackbirdEngine("/sab.*nzbd/gi")).toBe(true);
	});

	test("path:/…/ regex already routes to Blackbird (existing behavior)", () => {
		expect(needsBlackbirdEngine("path:/(^|\\/)zshrc$/")).toBe(true);
	});

	test("plain substring query does NOT force Blackbird when no session", () => {
		// preserve current behavior: no session → not forced
		expect(needsBlackbirdEngine("sabnzbd config")).toBe(false);
	});

	test("GHAS_CODE_ENGINE=rest override still wins for bare regex", () => {
		process.env.GHAS_CODE_ENGINE = "rest";
		try {
			expect(needsBlackbirdEngine("/nzb/i")).toBe(false);
		} finally {
			delete process.env.GHAS_CODE_ENGINE;
		}
	});

	test("filename: pure query stays REST (Blackbird rejects qualifier)", () => {
		expect(needsBlackbirdEngine("filename:.zshrc")).toBe(false);
	});

	test("regex that contains qualifier-like text is not fooled", () => {
		// regex body mentions path: but is a regex — should route Blackbird
		expect(needsBlackbirdEngine("/path:\\s*src/i")).toBe(true);
	});

	test("quoted slash regex routes to Blackbird", () => {
		expect(needsBlackbirdEngine('"/sab.*nzbd/"')).toBe(true);
	});
});
