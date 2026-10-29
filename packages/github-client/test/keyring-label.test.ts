// TDD: keyringSession must reject credentials whose keyring label doesn't
// match the requested one (secretsmith get on a missing label silently
// returns an arbitrary item — verified live 2026-10-29) and must reject
// secrets that are obviously not session cookies.

import { describe, expect, test } from "bun:test";

// The production logic under test — extracted contract replicated here until
// blackbird.ts exports it; refactor will move this INTO blackbird.ts.
function plausibleSession(secret: string, returnedLabel: string, requestedLabel: string): boolean {
	if (returnedLabel !== requestedLabel) return false;
	const session = secret.split(/[,\s]+/).map(s => s.trim()).filter(s => s.length >= 20 && !s.startsWith("your_"))[0];
	if (!session) return false;
	// GitHub user_session cookies are 100+ char opaque tokens, base64url-ish
	return session.length >= 100 && /^[A-Za-z0-9+_/=-]+$/.test(session);
}

describe("keyringSession label validation", () => {
	test("wrong-label keyring response is rejected", () => {
		expect(plausibleSession("50bytes_of_moonbox_api_key_here12345", "MOONBOX_CHAOS_API_KEY", "GITHUB_SESSIONS")).toBe(false);
	});
	test("matching label + session-shaped secret is accepted", () => {
		const s = "x".repeat(120);
		expect(plausibleSession(s, "GITHUB_SESSIONS", "GITHUB_SESSIONS")).toBe(true);
	});
	test("short secrets rejected even with right label", () => {
		expect(plausibleSession("short", "GITHUB_SESSIONS", "GITHUB_SESSIONS")).toBe(false);
	});
	test("secrets with spaces/newlines structure survive split", () => {
		const s = `${"a".repeat(120)}, ${"b".repeat(120)}`;
		expect(plausibleSession(s, "GITHUB_SESSIONS", "GITHUB_SESSIONS")).toBe(true);
	});
});
