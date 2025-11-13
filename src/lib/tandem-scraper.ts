/**
 * Puppeteer-based web scraper for Tandem Source
 * Automates login and CSV report download
 * Using @sparticuz/chromium (full package with all dependencies)
 */

import puppeteerCore from 'puppeteer-core';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import type { ScraperOptions, ScraperResult } from './types';
import type { Browser, Page } from 'puppeteer-core';

// Determine if we're running in a serverless environment (production)
const isServerless = process.env.VERCEL_ENV === 'production' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

/**
 * Helper function to delay execution (replaces deprecated page.waitForTimeout)
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Debug helper: Save screenshot and HTML to disk
 */
async function debugCapture(page: Page, stepName: string): Promise<void> {
  if (process.env.DEBUG_BROWSER !== 'true') return;

  try {
    const timestamp = Date.now();
    const fs = await import('fs/promises');
    const path = await import('path');
    const debugDir = path.join(process.cwd(), 'debug-captures');

    await fs.mkdir(debugDir, { recursive: true });

    // Screenshot
    const screenshotPath = path.join(debugDir, `${timestamp}-${stepName}.png`) as `${string}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // HTML
    const html = await page.content();
    const htmlPath = path.join(debugDir, `${timestamp}-${stepName}.html`);
    await fs.writeFile(htmlPath, html, 'utf-8');

    // Page info
    const url = page.url();
    const title = await page.title();
    const infoPath = path.join(debugDir, `${timestamp}-${stepName}.txt`);
    await fs.writeFile(infoPath, `URL: ${url}\nTitle: ${title}\n`, 'utf-8');

    console.log(`[Debug] Captured: ${stepName} → debug-captures/${timestamp}-${stepName}.*`);
  } catch (error) {
    console.error('[Debug] Failed to capture:', error);
  }
}

/**
 * Creates a browser instance with appropriate settings
 */
async function createBrowser(): Promise<Browser> {
  console.log('[Scraper] Launching browser...', { isServerless });

  // Enable debug mode logging
  if (process.env.DEBUG_BROWSER === 'true') {
    console.log('[Debug] Debug mode enabled - captures will be saved to debug-captures/');
  }

  if (isServerless) {
    // Serverless: Use puppeteer-core with @sparticuz/chromium
    const executablePath = await chromium.executablePath();

    console.log('[Scraper] Chromium executable path:', executablePath);

    return await puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: {
        width: 1280,
        height: 720,
      },
      executablePath,
      headless: "shell",
    });
  } else {
    // Local dev: Use full puppeteer with bundled Chromium
    // DEBUG_BROWSER=true shows visible browser for debugging
    const headless = process.env.DEBUG_BROWSER !== 'true';

    console.log('[Scraper] Using local Chromium (puppeteer)');
    console.log('[Scraper] Headless mode:', headless);

    return await puppeteer.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      defaultViewport: {
        width: 1280,
        height: 720,
      },
    });
  }
}

/**
 * Performs login to Tandem Source
 */
async function performLogin(
  page: Page,
  username: string,
  password: string
): Promise<void> {
  // Capture browser console logs
  page.on('console', (msg) => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  console.log('[Scraper] Navigating to Tandem Source...');

  // Navigate to the main page
  await page.goto('https://source.tandemdiabetes.com/', {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });

  const url = page.url();
  const title = await page.title();
  console.log(`[Scraper] Page loaded: ${title} (${url})`);

  await debugCapture(page, '01-initial-page');

  // Check for cookie modal first (it's an overlay that may block other interactions)
  const cookieButtonClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const cookieBtn = buttons.find(btn =>
      btn.textContent?.toLowerCase().includes('accept') ||
      btn.textContent?.toLowerCase().includes('agree') ||
      btn.textContent?.toLowerCase().includes('cookie')
    ) as HTMLElement | undefined;

    if (cookieBtn) {
      cookieBtn.click();
      return true;
    }
    return false;
  });

  if (cookieButtonClicked) {
    console.log('[Scraper] Cookie modal detected, clicking accept...');
    await delay(1000);
    await debugCapture(page, '02-after-cookie-accept');
  }

  // Check for country/language selector page
  const countrySelectorExists = await page.evaluate(() => {
    // Material-UI uses divs with typography classes, not actual h1-h6 tags
    const pageText = document.body.textContent || '';
    return pageText.includes('Select your country');
  });

  if (countrySelectorExists) {
    console.log('[Scraper] Country/language selector page detected!');
    await debugCapture(page, '03-country-selector');

    // Material-UI select requires clicking to open, then clicking the option
    // We'll use page.evaluate to interact with the React components directly

    console.log('[Scraper] Selecting country (United States)...');

    // Click the country dropdown to open it
    await page.click('#country');
    await delay(1000);
    await debugCapture(page, '03b-country-dropdown-opened');

    // Select "United States" from the dropdown
    // MUI renders options in a popup menu, so we need to find and click the option
    const countrySelected = await page.evaluate(() => {
      // Look for the option in the popup menu
      const options = Array.from(document.querySelectorAll('[role="option"]'));
      const usOption = options.find(opt =>
        opt.textContent?.includes('United States') ||
        opt.textContent?.includes('USA')
      ) as HTMLElement | undefined;

      if (usOption) {
        usOption.click();
        return true;
      }
      return false;
    });

    if (!countrySelected) {
      console.warn('[Scraper] Could not find United States option, trying first option...');
      await page.evaluate(() => {
        const firstOption = document.querySelector('[role="option"]') as HTMLElement | null;
        if (firstOption) firstOption.click();
      });
    }

    await delay(1000);
    await debugCapture(page, '03c-after-country-selection');

    console.log('[Scraper] Selecting language (English)...');

    // Click the language dropdown to open it (now enabled after country selection)
    await page.click('#preferredLanguage');
    await delay(1000);
    await debugCapture(page, '03d-language-dropdown-opened');

    // Select "English" from the dropdown
    const languageSelected = await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('[role="option"]'));
      const englishOption = options.find(opt =>
        opt.textContent?.includes('English')
      ) as HTMLElement | undefined;

      if (englishOption) {
        englishOption.click();
        return true;
      }
      return false;
    });

    if (!languageSelected) {
      console.warn('[Scraper] Could not find English option, trying first option...');
      await page.evaluate(() => {
        const firstOption = document.querySelector('[role="option"]') as HTMLElement | null;
        if (firstOption) firstOption.click();
      });
    }

    await delay(1000);
    await debugCapture(page, '03e-after-language-selection');

    // Click the Continue button
    console.log('[Scraper] Clicking Continue button...');
    const continueClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const continueBtn = buttons.find(btn =>
        btn.textContent?.includes('Continue')
      ) as HTMLElement | undefined;

      if (continueBtn) {
        continueBtn.click();
        return true;
      }
      return false;
    });

    if (!continueClicked) {
      throw new Error('Could not find Continue button');
    }

    await delay(2000);
    await debugCapture(page, '03f-after-continue-click');

    console.log('[Scraper] Country/language selection completed');
  }

  console.log('[Scraper] Checking for SSO login page...');

  // The page might have already navigated (React SPA routing), or might still need to navigate
  // Check if we're already on the login page
  const isOnLoginPage = await page.evaluate(() => {
    const pageText = document.body.textContent || '';
    return pageText.includes('Account Login') ||
           document.querySelector('input[name="username"], input[type="email"]') !== null;
  });

  if (!isOnLoginPage) {
    console.log('[Scraper] Not on login page yet, waiting for navigation...');
    // Wait for redirect to SSO login page
    await page.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
  } else {
    console.log('[Scraper] Already on login page (client-side navigation)');
  }

  await debugCapture(page, '04-on-login-page');

  // Verify we're on SSO page
  let currentUrl = page.url();
  if (!currentUrl.includes('sso.tandemdiabetes.com')) {
    console.error(`[Scraper] ❌ Expected SSO page, got: ${currentUrl}`);
    await debugCapture(page, '04-NOT-on-sso-page');
    throw new Error('Did not redirect to SSO login page');
  }

  console.log('[Scraper] On SSO login page, filling credentials...');
  await debugCapture(page, '05-on-sso-page');

  // Step 1: Find and fill username/email field
  const usernameSelector = 'input[name="username"], input[type="email"], input#email';
  await page.waitForSelector(usernameSelector, { visible: true, timeout: 10000 });
  await page.type(usernameSelector, username);
  console.log('[Scraper] Email filled');

  await debugCapture(page, '05a-email-filled');

  // Step 2: Click "Next" button to proceed to password step
  console.log('[Scraper] Clicking Next button...');
  const nextButtonClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const nextBtn = buttons.find(btn =>
      btn.textContent?.toLowerCase().includes('next') ||
      btn.getAttribute('aria-label')?.toLowerCase().includes('next')
    ) as HTMLElement | undefined;

    if (nextBtn) {
      nextBtn.click();
      return true;
    }
    return false;
  });

  if (!nextButtonClicked) {
    throw new Error('Could not find Next button');
  }

  await delay(2000);
  await debugCapture(page, '05b-after-next-click');

  // Step 3: Wait for password field to appear and fill it
  console.log('[Scraper] Waiting for password field...');
  const passwordSelector = 'input[name="password"], input[type="password"], input#password';
  await page.waitForSelector(passwordSelector, { visible: true, timeout: 10000 });
  await page.type(passwordSelector, password);
  console.log('[Scraper] Password filled');

  await debugCapture(page, '06-credentials-filled');

  // Step 4: Click submit button (might be "Next", "Continue", "Sign In", etc.)
  console.log('[Scraper] Submitting login form...');

  const submitClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const submitBtn = buttons.find(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
      return text.includes('sign in') ||
             text.includes('log in') ||
             text.includes('login') ||
             text.includes('submit') ||
             text.includes('next') ||
             text.includes('continue') ||
             ariaLabel.includes('sign in') ||
             ariaLabel.includes('log in') ||
             ariaLabel.includes('login') ||
             btn.getAttribute('type') === 'submit';
    }) as HTMLElement | undefined;

    if (submitBtn) {
      submitBtn.click();
      return true;
    }
    return false;
  });

  if (!submitClicked) {
    // Fallback: try clicking any submit button
    const submitSelector = 'button[type="submit"], input[type="submit"]';
    await page.click(submitSelector);
  }

  // Wait for navigation back to Tandem Source
  await delay(2000);
  console.log('[Scraper] Waiting for redirect after login...');

  // Check if already redirected (client-side navigation)
  const isRedirected = await page.evaluate(() => {
    return window.location.href.includes('source.tandemdiabetes.com');
  });

  if (!isRedirected) {
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
  }

  await debugCapture(page, '07-after-login-submit');

  // Verify we're back on source.tandemdiabetes.com
  const newUrl = page.url();
  if (!newUrl.includes('source.tandemdiabetes.com')) {
    console.error(`[Scraper] ❌ Login failed, still on: ${newUrl}`);
    await debugCapture(page, '07-login-failed');
    throw new Error('Login failed - did not redirect back to source.tandemdiabetes.com');
  }

  console.log('[Scraper] Login successful!');
}

/**
 * Navigates to reports section and downloads CSV
 */
async function downloadReport(
  page: Page,
  reportDays: number
): Promise<Buffer> {
  console.log('[Scraper] Navigating to reports section...');

  // Navigate to the Daily Timeline tab
  await page.goto('https://source.tandemdiabetes.com/reports/timeline', {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });

  await debugCapture(page, '08-reports-page');

  console.log(`[Scraper] Configuring time range for ${reportDays} days...`);

  // Find and click the date range dropdown
  try {
    const dateRangeSelector = '[aria-labelledby="date-range-label"]';
    const dateRangeExists = await page.$(dateRangeSelector);

    if (dateRangeExists) {
      console.log('[Scraper] Found date range dropdown, clicking to open...');
      await page.click(dateRangeSelector);
      await delay(1000);

      // Select "1 Week" option (for now, hardcoded to 1 week)
      // TODO: Use reportDays to select appropriate option
      const optionSelected = await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('[role="option"]'));
        const oneWeekOption = options.find(opt =>
          opt.textContent?.includes('1 Week')
        ) as HTMLElement | undefined;

        if (oneWeekOption) {
          oneWeekOption.click();
          return true;
        }
        return false;
      });

      if (optionSelected) {
        console.log('[Scraper] Selected 1 Week time range');
        await delay(1000);
      } else {
        console.warn('[Scraper] Could not find 1 Week option, using default');
      }
    } else {
      console.warn('[Scraper] Could not find date range dropdown, using default');
    }
  } catch (error) {
    console.warn('[Scraper] Could not configure time range:', error);
  }

  // Wait for data to load
  await delay(2000);

  console.log('[Scraper] Looking for Export CSV button...');

  // Set up download handling using Chrome DevTools Protocol
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: '/tmp',
  });

  // Track download
  let downloadedFile: { guid: string; suggestedFilename: string } | null = null;

  client.on('Page.downloadProgress', (event: any) => {
    if (event.state === 'completed') {
      downloadedFile = event as { guid: string; suggestedFilename: string };
      console.log('[Scraper] Download completed:', event.suggestedFilename);
    }
  });

  // Find and click Export button by text content
  const exportButtonClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const exportBtn = buttons.find(btn =>
      btn.textContent?.includes('Export CSV') ||
      btn.textContent?.includes('Export')
    ) as HTMLElement | undefined;

    if (exportBtn) {
      exportBtn.click();
      return true;
    }
    return false;
  });

  if (!exportButtonClicked) {
    throw new Error('Could not find Export button');
  }

  console.log('[Scraper] Clicked Export button...');

  // Check for modal confirmation
  await delay(1000);

  const modalButtonClicked = await page.evaluate(() => {
    const modals = Array.from(document.querySelectorAll('div[role="dialog"], div.modal, div.modal-content'));
    for (const modal of modals) {
      const buttons = Array.from(modal.querySelectorAll('button'));
      const exportBtn = buttons.find(btn => btn.textContent?.includes('Export')) as HTMLElement | undefined;
      if (exportBtn) {
        exportBtn.click();
        return true;
      }
    }
    return false;
  });

  if (modalButtonClicked) {
    console.log('[Scraper] Modal detected, clicked confirmation...');
  }

  console.log('[Scraper] Waiting for download to complete...');

  // Wait for download to complete (up to 60 seconds)
  // Try both CDP event and file system polling for reliability
  const fs = await import('fs/promises');
  const path = await import('path');

  let filename: string | null = null;
  const startTime = Date.now();

  while (!filename && Date.now() - startTime < 60000) {
    // Check if CDP event fired
    if (downloadedFile) {
      const file = downloadedFile as { guid: string; suggestedFilename: string };
      filename = file.suggestedFilename;
      console.log('[Scraper] Download completed via CDP event:', filename);
      break;
    }

    // Fallback: Check /tmp directory for CSV files
    try {
      const files = await fs.readdir('/tmp');
      const csvFiles = files.filter(f => f.startsWith('CSV_') && f.endsWith('.csv'));

      // Find CSV files created recently (within last 2 minutes)
      const recentFiles = [];
      for (const csvFile of csvFiles) {
        const stat = await fs.stat(path.join('/tmp', csvFile));
        if (Date.now() - stat.mtimeMs < 120000) {
          recentFiles.push({ name: csvFile, mtime: stat.mtimeMs });
        }
      }

      if (recentFiles.length > 0) {
        // Get the most recent CSV file
        recentFiles.sort((a, b) => b.mtime - a.mtime);
        filename = recentFiles[0].name;
        console.log('[Scraper] Download completed via file system check:', filename);
        break;
      }
    } catch (error) {
      // Ignore errors from readdir
    }

    await delay(500);
  }

  if (!filename) {
    throw new Error('Download did not complete within 60 seconds');
  }

  console.log('[Scraper] Reading downloaded file...');
  const filePath = path.join('/tmp', filename);

  const buffer = await fs.readFile(filePath);

  // Clean up
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.warn('[Scraper] Could not delete temp file:', error);
  }

  console.log(`[Scraper] CSV downloaded successfully (${buffer.length} bytes)`);

  return buffer;
}

/**
 * Main scraper function that orchestrates the entire process
 */
export async function scrapeTandemSource(
  options: ScraperOptions
): Promise<ScraperResult> {
  let browser: Browser | null = null;

  try {
    const {
      username,
      password,
      reportDays,
      timeout = 180000, // 3 minutes default
    } = options;

    console.log('[Scraper] Starting Tandem Source scraper...', {
      username: username.substring(0, 3) + '***',
      reportDays,
      isServerless,
    });

    // Create browser
    browser = await createBrowser();
    const page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Set timeouts
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    // Perform login
    await performLogin(page, username, password);

    // Download report
    const csvBuffer = await downloadReport(page, reportDays);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - reportDays);

    await browser.close();
    browser = null;

    console.log('[Scraper] Scraping completed successfully!');

    return {
      success: true,
      csvBuffer,
      metadata: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        downloadedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('[Scraper] Error during scraping:', error);

    // Clean up browser if still open
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('[Scraper] Error closing browser:', closeError);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown scraping error',
    };
  }
}

/**
 * Validates that required environment variables are set
 */
export function validateScraperConfig(): {
  valid: boolean;
  missing: string[];
} {
  const required = ['TANDEM_USERNAME', 'TANDEM_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}
