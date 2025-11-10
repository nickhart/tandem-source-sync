/**
 * Puppeteer-based web scraper for Tandem Source
 * Automates login and CSV report download
 * Using @sparticuz/chromium (full package with all dependencies)
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import type { ScraperOptions, ScraperResult } from './types';
import type { Browser, Page } from 'puppeteer-core';

// Determine if we're running in a serverless environment
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

/**
 * Creates a browser instance with appropriate settings
 */
async function createBrowser(): Promise<Browser> {
  console.log('[Scraper] Launching browser...', { isServerless });

  if (isServerless) {
    // Full chromium package includes binaries and all dependencies
    const executablePath = await chromium.executablePath();

    console.log('[Scraper] Chromium executable path:', executablePath);

    return await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    });
  } else {
    // Use local Chrome for development
    return await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
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
  console.log('[Scraper] Navigating to Tandem Source...');

  // Navigate to the main page
  await page.goto('https://source.tandemdiabetes.com/', {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });

  console.log('[Scraper] Waiting for SSO redirect...');

  // Wait for redirect to SSO login page
  await page.waitForNavigation({
    waitUntil: 'networkidle0',
    timeout: 30000,
  });

  // Verify we're on SSO page
  const url = page.url();
  if (!url.includes('sso.tandemdiabetes.com')) {
    throw new Error('Did not redirect to SSO login page');
  }

  console.log('[Scraper] On SSO login page, filling credentials...');

  // Find and fill username field
  const usernameSelector = 'input[name="username"], input[type="email"], input#username';
  await page.waitForSelector(usernameSelector, { visible: true, timeout: 10000 });
  await page.type(usernameSelector, username);

  // Find and fill password field
  const passwordSelector = 'input[name="password"], input[type="password"], input#password';
  await page.waitForSelector(passwordSelector, { visible: true, timeout: 10000 });
  await page.type(passwordSelector, password);

  console.log('[Scraper] Submitting login form...');

  // Click submit and wait for navigation
  const submitSelector = 'button[type="submit"], input[type="submit"]';
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }),
    page.click(submitSelector),
  ]);

  // Verify we're back on source.tandemdiabetes.com
  const newUrl = page.url();
  if (!newUrl.includes('source.tandemdiabetes.com')) {
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

  console.log(`[Scraper] Configuring time range for ${reportDays} days...`);

  // Try to configure time range (may need adjustment based on actual page)
  try {
    const selectSelector = 'select[name*="range"], select[name*="days"]';
    const selectExists = await page.$(selectSelector);

    if (selectExists) {
      await page.select(selectSelector, String(reportDays));
      console.log('[Scraper] Time range configured');
    } else {
      console.warn('[Scraper] Could not find time range selector, using default');
    }
  } catch (error) {
    console.warn('[Scraper] Could not configure time range:', error);
  }

  // Wait for data to load
  await page.waitForTimeout(3000);

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
      downloadedFile = event;
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
  await page.waitForTimeout(1000);

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
  const startTime = Date.now();
  while (!downloadedFile && Date.now() - startTime < 60000) {
    await page.waitForTimeout(500);
  }

  if (!downloadedFile) {
    throw new Error('Download did not complete within 60 seconds');
  }

  console.log('[Scraper] Reading downloaded file...');

  // Read the file from /tmp
  const fs = await import('fs/promises');
  const path = await import('path');
  // Type assertion needed because downloadedFile is modified in callback
  const filename = (downloadedFile as { guid: string; suggestedFilename: string }).suggestedFilename;
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
