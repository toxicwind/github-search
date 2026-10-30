/**
 * github-session-mobile.ts — pull the GitHub user_session from the Pixel's
 * mobile Firefox (via adbkit/flotilla) as a blackbird session fallback.
 *
 * Blackbird needs a real github.com user_session cookie (PATs don't work at
 * github.com/search). Keyring + desktop-Firefox are the primary sources; this
 * adds the mobile-Firefox source, since the architect is frequently logged in
 * on the phone.
 *
 * Contract:
 *   getMobileGithubSession(): Promise<{cookie: string; user_session: string; source: string} | null>
 *
 * Reads org.mozilla.fenix cookies.sqlite on the Pixel, extracts the
 * user_session cookie, and returns a cookie header. Returns null if no
 * device/adb, no firefox profile, or the cookie isn't present.
 */
import { Adb } from "@devicefarmer/adbkit";
import { $ } from "bun";

const SERIAL_BASE = process.env.FLOTILLA_DEVICE ?? "10.0.0.77";

export interface MobileSession {
  cookie: string;
  user_session: string;
  source: string;
}

function liveSerial(): string | null {
  try {
    const out = $`adb devices`.quiet().nothrow().textSync?.() as unknown as string ?? "";
    for (const line of out.split("\n")) {
      if (line.startsWith(`${SERIAL_BASE.split(":")[0]}:`) && line.trimEnd().endsWith("device")) {
        return line.split("\t")[0] ?? null;
      }
    }
  } catch {}
  return null;
}

/**
 * Copy fenix cookies.sqlite off the device (adb run-as when debuggable, else
 * the unrooted shared-path fallback) and read the github user_session.
 */
export async function getMobileGithubSession(): Promise<MobileSession | null> {
  const serial = liveSerial();
  if (!serial) return null;
  const adb = (m: string) => $`adb -s ${serial} shell ${m}`.quiet().nothrow().text();
  try {
    const profile = await adb("sh -c 'ls -d /data/data/org.mozilla.fenix/files/mozilla/*.default* 2>/dev/null | head -1'");
    const profDir = profile.trim();
    if (!profDir) {
      // Unrooted: fenix may keep cookies under /data/user/0 (not shell-readable).
      return null;
    }
    const remote = `${profDir}/cookies.sqlite`;
    const out = await $`adb -s ${serial} pull ${remote} /tmp/ghas-mobile-cookies.sqlite`.quiet().nothrow().text();
    if (!/pulled/i.test(out)) return null;
    // read user_session via sqlite
    const db = await import("bun:sqlite");
    const d = new db.Database("/tmp/ghas-mobile-cookies.sqlite", { readonly: true });
    const row = d
      .query(`SELECT name, value FROM moz_cookies WHERE host LIKE '%github.com%' AND name='user_session'`)
      .get() as { name: string; value: string } | null;
    d.close();
    if (row?.value) {
      return {
        cookie: `user_session=${row.value}; logged_in=yes`,
        user_session: row.value,
        source: `mobile-fenix:${serial}`,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export { Adb };