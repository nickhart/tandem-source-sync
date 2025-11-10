/**
 * Playwright-based web scraper for Tandem Source
 * Automates login and CSV report download
 * Using stable versions: @sparticuz/chromium@123 + playwright-core@1.40
 */

import { chromium, type Browser, type Page } from 'playwright-core';
import chromiumPkg from '@sparticuz/chromium';
import type { ScraperOptions, ScraperResult } from './types';

// Determine if we're running in a serverless environment
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

/**
 * Gets the appropriate Chromium executable path
 */
async function getChromiumPath(): Promise<string> {
  if (isServerless) {
    // Use @sparticuz/chromium for serverless environments
    return await chromiumPkg.executablePath();
  } else {
    // Use system Chromium for local development
    // Playwright will use bundled browser or system browser
    return '';
  }
}

/**
 * Creates a browser instance with appropriate settings
 */
async function createBrowser(): Promise<Browser> {
  const executablePath = await getChromiumPath();

  const launchOptions: Parameters<typeof chromium.launch>[0] = {
    headless: true,
    args: isServerless ? chromiumPkg.args : [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  };

  // Only set executablePath if we have one (serverless)
  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  console.log('[Scraper] Launching browser...', { isServerless });
  return await chromium.launch(launchOptions);
}

/**
 * Performs login to Tandem Source
 */
async function performLogin(
  page: Page,
  username: string,
  password: string
): Promise<void> {
  console.log('[Scraper] Navigating to Tandem Source...');

  // Navigate to the main page
  await page.goto('https://source.tandemdiabetes.com/', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  console.log('[Scraper] Waiting for SSO redirect...');

  // Wait for redirect to SSO login page
  await page.waitForURL('https://sso.tandemdiabetes.com/**', {
    timeout: 30000,
  });

  console.log('[Scraper] On SSO login page, filling credentials...');

  // Fill in username
  const usernameField = page.locator('input[name="username"], input[type="email"], input#username');
  await usernameField.waitFor({ state: 'visible', timeout: 10000 });
  await usernameField.fill(username);

  // Fill in password
  const passwordField = page.locator('input[name="password"], input[type="password"], input#password');
  await passwordField.waitFor({ state: 'visible', timeout: 10000 });
  await passwordField.fill(password);

  console.log('[Scraper] Submitting login form...');

  // Submit the form
  const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');
  await submitButton.click();

  console.log('[Scraper] Waiting for authentication...');

  // Wait for redirect back to source.tandemdiabetes.com
  await page.waitForURL('https://source.tandemdiabetes.com/**', {
    timeout: 60000,
  });

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

  // Navigate to the reports overview page
  await page.goto('https://source.tandemdiabetes.com/reports/overview', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  console.log('[Scraper] Navigating to Daily Timeline tab...');

  // Navigate to the Daily Timeline tab
  await page.goto('https://source.tandemdiabetes.com/reports/timeline', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  console.log(`[Scraper] Configuring time range for ${reportDays} days...`);

  // Find and click the time range dropdown
  // This selector may need adjustment based on actual page structure
  const timeRangeDropdown = page.locator(
    'select[name*="range"], select[name*="days"], button:has-text("Last"), [data-testid*="date"], [data-testid*="range"]'
  ).first();

  try {
    await timeRangeDropdown.waitFor({ state: 'visible', timeout: 10000 });

    // If it's a select element, choose the appropriate option
    if (await timeRangeDropdown.evaluate(el => el.tagName === 'SELECT')) {
      // Try to find an option that matches our desired days
      const options = await page.locator(`${timeRangeDropdown} option`).all();
      let optionFound = false;

      for (const option of options) {
        const text = await option.textContent();
        if (text?.includes(String(reportDays)) || text?.includes(`${reportDays} day`)) {
          await timeRangeDropdown.selectOption({ label: text });
          optionFound = true;
          break;
        }
      }

      if (!optionFound) {
        console.warn(`[Scraper] Could not find option for ${reportDays} days, using default`);
      }
    } else {
      // If it's a button or custom dropdown, click it
      await timeRangeDropdown.click();
      await page.waitForTimeout(1000);

      // Try to find and click the option for desired days
      const dayOption = page.locator(`text="${reportDays} day", text="${reportDays} Day"`).first();
      if (await dayOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dayOption.click();
      }
    }
  } catch (error) {
    console.warn('[Scraper] Could not configure time range, proceeding with default:', error);
  }

  // Wait for any data to load
  await page.waitForTimeout(3000);

  console.log('[Scraper] Looking for Export CSV button...');

  // Find and click the "Export CSV" button
  const exportButton = page.locator(
    'button:has-text("Export CSV"), button:has-text("Export"), a:has-text("Export CSV"), [data-testid*="export"]'
  ).first();

  await exportButton.waitFor({ state: 'visible', timeout: 15000 });

  // Set up download listener BEFORE clicking
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

  await exportButton.click();

  console.log('[Scraper] Export button clicked, checking for modal...');

  // Check if there's a modal with a confirmation button
  const modalExportButton = page.locator(
    'div[role="dialog"] button:has-text("Export"), div.modal button:has-text("Export"), div.modal-content button:has-text("Export")'
  ).first();

  const isModalVisible = await modalExportButton.isVisible({ timeout: 3000 }).catch(() => false);

  if (isModalVisible) {
    console.log('[Scraper] Modal detected, clicking Export button in modal...');
    await modalExportButton.click();
  }

  console.log('[Scraper] Waiting for download to start...');

  // Wait for the download
  const download = await downloadPromise;

  console.log('[Scraper] Download started, reading file...');

  // Get the download as a buffer
  const buffer = await download.createReadStream().then(async (stream) => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  });

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
      username: username.substring(0, 3) + '***', // Partially mask for privacy
      reportDays,
    });

    // Create browser
    browser = await createBrowser();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // Set a global timeout
    page.setDefaultTimeout(timeout);

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
