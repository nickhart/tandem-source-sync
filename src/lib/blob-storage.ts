/**
 * Storage utilities for managing CSV reports
 * Supports both Vercel Blob (production) and local filesystem (development)
 */

import { put, list, del } from '@vercel/blob';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ReportMetadata, SyncResult } from './types';

// Local storage directory
const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'local-storage');
const LOCAL_REPORTS_DIR = path.join(LOCAL_STORAGE_DIR, 'reports');
const LOCAL_SYNC_STATUS_FILE = path.join(LOCAL_STORAGE_DIR, 'sync-status.json');

/**
 * Determines if we should use local filesystem storage
 */
function isLocalMode(): boolean {
  return !process.env.BLOB_READ_WRITE_TOKEN ||
         process.env.BLOB_READ_WRITE_TOKEN === 'your-blob-token-here';
}

/**
 * Generates a filename for a CSV report based on timestamp
 * @param timestamp - ISO timestamp
 * @returns Filename in format: tandem-report-YYYY-MM-DD-HHmmss.csv
 */
export function generateReportFilename(timestamp: Date = new Date()): string {
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getDate()).padStart(2, '0');
  const hours = String(timestamp.getHours()).padStart(2, '0');
  const minutes = String(timestamp.getMinutes()).padStart(2, '0');
  const seconds = String(timestamp.getSeconds()).padStart(2, '0');

  return `tandem-report-${year}-${month}-${day}-${hours}${minutes}${seconds}.csv`;
}

// ============================================================================
// LOCAL FILESYSTEM IMPLEMENTATIONS
// ============================================================================

/**
 * Stores a CSV report to local filesystem
 */
async function storeReportLocal(
  csvBuffer: Buffer,
  filename: string
): Promise<{ url: string; filename: string }> {
  await fs.mkdir(LOCAL_REPORTS_DIR, { recursive: true });
  const filePath = path.join(LOCAL_REPORTS_DIR, filename);
  await fs.writeFile(filePath, csvBuffer);

  console.log(`[Local Storage] Report stored: ${filename}`);

  return {
    url: `file://${filePath}`,
    filename,
  };
}

/**
 * Lists reports from local filesystem
 */
async function listReportsLocal(): Promise<ReportMetadata[]> {
  try {
    await fs.mkdir(LOCAL_REPORTS_DIR, { recursive: true });
    const files = await fs.readdir(LOCAL_REPORTS_DIR);

    const reports: ReportMetadata[] = [];

    for (const filename of files) {
      if (filename.startsWith('tandem-report-') && filename.endsWith('.csv')) {
        const filePath = path.join(LOCAL_REPORTS_DIR, filename);
        const stats = await fs.stat(filePath);

        reports.push({
          filename,
          url: `file://${filePath}`,
          size: stats.size,
          uploadedAt: stats.mtime.toISOString(),
          downloadedAt: stats.mtime.toISOString(),
        });
      }
    }

    // Sort by modified date, newest first
    reports.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    console.log(`[Local Storage] Found ${reports.length} reports`);
    return reports;
  } catch (error) {
    console.error('[Local Storage] Error listing reports:', error);
    return [];
  }
}

/**
 * Stores sync status to local filesystem
 */
async function storeSyncStatusLocal(syncResult: SyncResult): Promise<void> {
  try {
    await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });
    const statusJson = JSON.stringify(syncResult, null, 2);
    await fs.writeFile(LOCAL_SYNC_STATUS_FILE, statusJson, 'utf-8');
    console.log('[Local Storage] Sync status stored');
  } catch (error) {
    console.error('[Local Storage] Error storing sync status:', error);
  }
}

/**
 * Retrieves sync status from local filesystem
 */
async function getSyncStatusLocal(): Promise<SyncResult | null> {
  try {
    const data = await fs.readFile(LOCAL_SYNC_STATUS_FILE, 'utf-8');
    return JSON.parse(data) as SyncResult;
  } catch (error) {
    // File doesn't exist yet
    return null;
  }
}

// ============================================================================
// PUBLIC API (routes to local or production)
// ============================================================================

/**
 * Stores a CSV report
 * @param csvBuffer - The CSV file content as a Buffer
 * @param filename - Optional custom filename (will be auto-generated if not provided)
 * @returns The blob URL and metadata
 */
export async function storeReport(
  csvBuffer: Buffer,
  filename?: string
): Promise<{ url: string; filename: string }> {
  const reportFilename = filename || generateReportFilename();

  if (isLocalMode()) {
    return storeReportLocal(csvBuffer, reportFilename);
  }

  try {
    const blob = await put(reportFilename, csvBuffer, {
      access: 'public',
      contentType: 'text/csv',
    });

    console.log(`[Blob Storage] Report stored successfully: ${reportFilename}`);

    return {
      url: blob.url,
      filename: reportFilename,
    };
  } catch (error) {
    console.error('[Blob Storage] Error storing report:', error);
    throw new Error(`Failed to store report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Lists all stored reports with metadata
 * @returns Array of report metadata objects
 */
export async function listReports(): Promise<ReportMetadata[]> {
  if (isLocalMode()) {
    return listReportsLocal();
  }

  try {
    const { blobs } = await list({
      prefix: 'tandem-report-',
    });

    const reports: ReportMetadata[] = blobs.map((blob) => ({
      filename: blob.pathname,
      url: blob.url,
      size: blob.size,
      uploadedAt: blob.uploadedAt.toISOString(),
      downloadedAt: blob.uploadedAt.toISOString(), // Using upload time as proxy for download time
    }));

    // Sort by upload date, newest first
    reports.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    return reports;
  } catch (error) {
    console.error('[Blob Storage] Error listing reports:', error);
    throw new Error(`Failed to list reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deletes a report from blob storage
 * @param filename - The filename to delete
 */
export async function deleteReport(filename: string): Promise<void> {
  try {
    await del(filename);
    console.log(`[Blob Storage] Report deleted: ${filename}`);
  } catch (error) {
    console.error('[Blob Storage] Error deleting report:', error);
    throw new Error(`Failed to delete report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stores sync status information
 * This is a simple JSON file to track the last sync operation
 * @param syncResult - The sync result to store
 */
export async function storeSyncStatus(syncResult: SyncResult): Promise<void> {
  if (isLocalMode()) {
    return storeSyncStatusLocal(syncResult);
  }

  try {
    const statusJson = JSON.stringify(syncResult, null, 2);
    await put('sync-status.json', statusJson, {
      access: 'public',
      contentType: 'application/json',
    });

    console.log('[Blob Storage] Sync status stored successfully');
  } catch (error) {
    console.error('[Blob Storage] Error storing sync status:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Retrieves the last sync status
 * @returns The last sync result, or null if not found
 */
export async function getSyncStatus(): Promise<SyncResult | null> {
  if (isLocalMode()) {
    return getSyncStatusLocal();
  }

  try {
    const { blobs } = await list({
      prefix: 'sync-status.json',
      limit: 1,
    });

    if (blobs.length === 0) {
      return null;
    }

    const response = await fetch(blobs[0].url);
    const syncResult = await response.json() as SyncResult;

    return syncResult;
  } catch (error) {
    console.error('[Blob Storage] Error retrieving sync status:', error);
    return null;
  }
}

/**
 * Cleans up old reports, keeping only the most recent N reports
 * @param keepCount - Number of reports to keep (default: 30)
 */
export async function cleanupOldReports(keepCount: number = 30): Promise<number> {
  try {
    const reports = await listReports();

    if (reports.length <= keepCount) {
      return 0;
    }

    const reportsToDelete = reports.slice(keepCount);
    let deletedCount = 0;

    for (const report of reportsToDelete) {
      try {
        await deleteReport(report.filename);
        deletedCount++;
      } catch (error) {
        console.error(`[Blob Storage] Failed to delete ${report.filename}:`, error);
      }
    }

    console.log(`[Blob Storage] Cleaned up ${deletedCount} old reports`);
    return deletedCount;
  } catch (error) {
    console.error('[Blob Storage] Error during cleanup:', error);
    return 0;
  }
}
