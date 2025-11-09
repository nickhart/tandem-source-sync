/**
 * Type definitions for Tandem Source Sync service
 */

/**
 * Metadata for a stored CSV report
 */
export interface ReportMetadata {
  filename: string;
  url: string;
  size: number;
  uploadedAt: string; // ISO 8601 timestamp
  downloadedAt: string; // ISO 8601 timestamp of when data was scraped
}

/**
 * Service status information
 */
export interface ServiceStatus {
  configured: boolean;
  lastSyncTime: string | null;
  lastSyncSuccess: boolean | null;
  lastSyncError: string | null;
  reportCount: number;
  nextScheduledSync: string | null;
}

/**
 * Sync operation result
 */
export interface SyncResult {
  success: boolean;
  filename?: string;
  error?: string;
  timestamp: string;
  reportDays: number;
}

/**
 * Environment configuration
 */
export interface EnvConfig {
  apiKey: string | undefined;
  tandemUsername: string | undefined;
  tandemPassword: string | undefined;
  reportDays: number;
  blobToken: string | undefined;
}

/**
 * Scraper options
 */
export interface ScraperOptions {
  username: string;
  password: string;
  reportDays: number;
  headless?: boolean;
  timeout?: number;
}

/**
 * Scraper result
 */
export interface ScraperResult {
  success: boolean;
  csvBuffer?: Buffer;
  error?: string;
  metadata?: {
    startDate: string;
    endDate: string;
    downloadedAt: string;
  };
}

/**
 * API Response types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  statusCode?: number;
}
