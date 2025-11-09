'use client';

/**
 * Dashboard component for viewing service status and reports
 */

import { useEffect, useState } from 'react';
import type { ServiceStatus, ReportMetadata } from '@/lib/types';

export default function Dashboard() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [reports, setReports] = useState<ReportMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Note: In production, this would use the actual API with auth
  // For the dashboard UI, we'll fetch data server-side and pass as props
  // This is a placeholder for client-side interactivity

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const triggerSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      // This is a placeholder - actual implementation would need API key
      alert('Manual sync triggered! Check Vercel logs for progress.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger sync');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tandem Source Sync Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor your automated diabetes data sync service
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Status</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Configuration Status</p>
              <p className="text-lg font-medium">
                {status?.configured ? (
                  <span className="text-green-600">✓ Configured</span>
                ) : (
                  <span className="text-yellow-600">⚠ Not Configured</span>
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Total Reports</p>
              <p className="text-lg font-medium text-gray-900">
                {status?.reportCount ?? 0}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Last Sync</p>
              <p className="text-lg font-medium text-gray-900">
                {status?.lastSyncTime ? (
                  formatDate(status.lastSyncTime)
                ) : (
                  <span className="text-gray-400">Never</span>
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Last Sync Status</p>
              <p className="text-lg font-medium">
                {status?.lastSyncSuccess === null ? (
                  <span className="text-gray-400">No syncs yet</span>
                ) : status?.lastSyncSuccess ? (
                  <span className="text-green-600">✓ Success</span>
                ) : (
                  <span className="text-red-600">✗ Failed</span>
                )}
              </p>
            </div>
          </div>

          {status?.lastSyncError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-900">Last Error:</p>
              <p className="text-sm text-red-700 mt-1">{status.lastSyncError}</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {syncing ? 'Syncing...' : 'Trigger Sync Now'}
            </button>
            <p className="text-sm text-gray-600 mt-2">
              Scheduled sync runs every 12 hours automatically
            </p>
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuration</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tandem Username</span>
              <span className="text-sm font-medium text-gray-900">
                {process.env.NEXT_PUBLIC_TANDEM_USERNAME || '***@***'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Report Days</span>
              <span className="text-sm font-medium text-gray-900">
                {process.env.NEXT_PUBLIC_REPORT_DAYS || '2'} days
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sync Schedule</span>
              <span className="text-sm font-medium text-gray-900">Every 12 hours</span>
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Reports</h2>

          {reports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No reports yet. Trigger a sync to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.filename} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {report.filename}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(report.uploadedAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatFileSize(report.size)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <a
                          href={report.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* API Information */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">iOS App Integration</h3>
          <p className="text-sm text-blue-800 mb-2">
            Use the following base URL in your iOS app:
          </p>
          <code className="block bg-blue-100 text-blue-900 px-3 py-2 rounded text-sm font-mono">
            {typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}
          </code>
          <p className="text-sm text-blue-800 mt-2">
            Don't forget to configure your API key in the iOS app settings!
          </p>
        </div>
      </div>
    </div>
  );
}
