const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Collect console errors
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
            console.log(`PAGE ERROR: ${msg.text()}`);
        }
    });

    page.on('pageerror', err => {
        errors.push(err.message);
        console.log(`PAGE EXCEPTION: ${err.message}`);
    });

    try {
        console.log('Navigating to http://localhost:16100/ ...');
        await page.goto('http://localhost:16100/', { waitUntil: 'networkidle', timeout: 30000 });

        console.log('Page loaded. Checking for ReferenceError...');

        // Check if the page contains the error message or remains blank
        const content = await page.content();
        if (content.includes('ReferenceError') || content.includes('useMemo is not defined')) {
            console.log('CRITICAL: useMemo ReferenceError detected in page content!');
        } else {
            console.log('No ReferenceError detected in page content.');
        }

        // Try to perform a search to trigger hooks
        console.log('Attempting to trigger search...');
        // Assuming there is an input field for search
        const searchInput = await page.$('input[placeholder*="Search"]');
        if (searchInput) {
            await searchInput.fill('rust parallel');
            await page.waitForTimeout(2000); // Wait for debounce and results
            console.log('Search triggered.');
        } else {
            console.log('Search input not found.');
        }

        if (errors.length > 0) {
            console.log(`Found ${errors.length} console errors.`);
        } else {
            console.log('No console errors found.');
        }

    } catch (e) {
        console.error(`Verification failed: ${e.message}`);
    } finally {
        await browser.close();
    }
})();
