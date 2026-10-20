#!/usr/bin/env node
/**
 * Launch a headed Firefox instance that the estate-scripts playwright-mcp can attach to
 * via --remote-endpoint (Playwright remote protocol) or BiDi.
 *
 * This gives you "live control my running Firefox" experience similar to Chromium CDP attach.
 *
 * Usage:
 *   node launch-firefox-remote.js
 *
 * Then in another terminal / your MCP config:
 *   node estate-scripts-launch.js --browser firefox --remote-endpoint <the ws url printed here>
 *
 * Or set env:
 *   PLAYWRIGHT_MCP_BROWSER=firefox PLAYWRIGHT_MCP_REMOTE_ENDPOINT=ws://...  node estate-scripts-launch.js
 *
 * The Firefox window will stay open until you Ctrl-C this script.
 * You can log into GitHub, your tools, etc. in that window and the agent will see the live state.
 *
 * Tips:
 * - Use a dedicated profile dir for agent work (avoids clobbering your daily driver).
 * - Combine with persistent userDataDir in the MCP side if you want the logins to survive restarts.
 */

const { firefox } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function main() {
  const profileDir = process.env.FIREFOX_AGENT_PROFILE ||
    path.join(os.homedir(), '.cache', 'ms-playwright', 'estate-scripts-firefox-agent-profile');

  await fs.promises.mkdir(profileDir, { recursive: true });

  console.error('=== estate-scripts Firefox Remote Launcher ===');
  console.error(`Profile: ${profileDir}`);
  console.error('Launching headed Firefox with remote server...');
  console.error('Log into whatever you need (GitHub etc). The agent will control this exact window.');
  console.error('Press Ctrl-C here to close the browser when done.\n');

  const server = await firefox.launchServer({
    headless: false,
    // Use a real-looking viewport or null for native window size
    args: [
      // You can add more Firefox args here, e.g. for extensions or prefs
    ],
    // If you want to reuse a specific existing profile dir that you pre-logged into:
    // userDataDir: '/path/to/your/real/firefox/profile',
  });

  const wsEndpoint = server.wsEndpoint();
  console.log('\n' + '='.repeat(70));
  console.log('FIREFOX REMOTE ENDPOINT (copy this):');
  console.log(wsEndpoint);
  console.log('='.repeat(70) + '\n');

  console.error('[estate-scripts] Firefox is now controllable.');
  console.error('[estate-scripts] Start the MCP server with:');
  console.error(`    PLAYWRIGHT_MCP_BROWSER=firefox PLAYWRIGHT_MCP_REMOTE_ENDPOINT=${wsEndpoint} \\`);
  console.error('      node estate-scripts-launch.js');
  console.error('\nOr via CLI flags:');
  console.error(`    node estate-scripts-launch.js --browser firefox --remote-endpoint "${wsEndpoint}"`);
  console.error('\nKeep this process running to keep the browser alive for the agent.');

  // Keep alive
  process.on('SIGINT', async () => {
    console.error('\n[estate-scripts] Shutting down Firefox remote server...');
    await server.close();
    process.exit(0);
  });

  // Also handle if the browser itself closes
  const browser = await firefox.connect(wsEndpoint);
  browser.on('disconnected', async () => {
    console.error('[estate-scripts] Firefox browser disconnected. Exiting launcher.');
    await server.close().catch(() => {});
    process.exit(0);
  });

  // Block forever
  await new Promise(() => {});
}

main().catch(err => {
  console.error('[launch-firefox-remote] Fatal error:', err);
  process.exit(1);
});
