/**
 * Shared sync logic used by both manual sync and cron job
 */

import { scrapeTandemSource, validateScraperConfig } from './tandem-scraper';
import { storeReport, storeSyncStatus } from './blob-storage';
import type { SyncResult } from './types';

/**
 * Performs a sync operation - scrapes Tandem Source and stores the report
 * @returns SyncResult with success status and details
 */
export async function performSync(): Promise<SyncResult> {
  const timestamp = new Date().toISOString();

  try {
    console.log('[Sync] Starting sync operation...');

    // Validate configuration
    const configValidation = validateScraperConfig();
    if (!configValidation.valid) {
      const error = `Missing required configuration: ${configValidation.missing.join(', ')}`;
      console.error('[Sync]', error);

      const result: SyncResult = {
        success: false,
        error,
        timestamp,
        reportDays: parseInt(process.env.REPORT_DAYS || '2', 10),
      };

      await storeSyncStatus(result);
      return result;
    }

    // Get configuration from environment
    const username = process.env.TANDEM_USERNAME!;
    const password = process.env.TANDEM_PASSWORD!;
    const reportDays = parseInt(process.env.REPORT_DAYS || '2', 10);

    console.log('[Sync] Configuration validated, starting scraper...');

    // Run the scraper
    const scraperResult = await scrapeTandemSource({
      username,
      password,
      reportDays,
      timeout: 180000, // 3 minutes
    });

    if (!scraperResult.success || !scraperResult.csvBuffer) {
      console.error('[Sync] Scraper failed:', scraperResult.error);

      const result: SyncResult = {
        success: false,
        error: scraperResult.error || 'Scraper failed without error message',
        timestamp,
        reportDays,
      };

      await storeSyncStatus(result);
      return result;
    }

    console.log('[Sync] Scraper successful, storing report...');

    // Store the report
    const { filename } = await storeReport(scraperResult.csvBuffer);

    console.log(`[Sync] Report stored successfully: ${filename}`);

    const result: SyncResult = {
      success: true,
      filename,
      timestamp,
      reportDays,
    };

    // Store sync status
    await storeSyncStatus(result);

    return result;
  } catch (error) {
    console.error('[Sync] Unexpected error during sync:', error);

    const result: SyncResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during sync',
      timestamp,
      reportDays: parseInt(process.env.REPORT_DAYS || '2', 10),
    };

    await storeSyncStatus(result);
    return result;
  }
}
