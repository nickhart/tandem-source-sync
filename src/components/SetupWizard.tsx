'use client';

/**
 * Setup Wizard component for first-time configuration
 */

import { useState } from 'react';

export default function SetupWizard() {
  const [apiKey, setApiKey] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const generateApiKey = () => {
    // Generate a 32-byte random hex string
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const key = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    setApiKey(key);
    setCopied(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const vercelProjectUrl = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : 'your-vercel-project';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Tandem Source Sync
          </h1>
          <p className="text-lg text-gray-600">
            Automated CSV Report Service for Tandem Diabetes
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-lg p-8">
          <div className="mb-6">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Welcome! Let's set up your service
            </h2>
            <p className="text-gray-600">
              Follow these steps to configure your Tandem Source Sync service. This will enable
              automated downloads of your diabetes data.
            </p>
          </div>

          {/* Step 1: Generate API Key */}
          <div className="mb-8 border-l-4 border-blue-500 pl-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Step 1: Generate API Key
            </h3>
            <p className="text-gray-600 mb-4">
              Create a secure API key to protect your data. You'll need this key to access the API
              from your iOS app.
            </p>

            {!apiKey ? (
              <button
                onClick={generateApiKey}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Generate API Key
              </button>
            ) : (
              <div>
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-3 font-mono text-sm break-all">
                  {apiKey}
                </div>
                <button
                  onClick={copyToClipboard}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Configure Environment Variables */}
          <div className="mb-8 border-l-4 border-indigo-500 pl-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Step 2: Configure Vercel Environment Variables
            </h3>
            <p className="text-gray-600 mb-4">
              Add the following environment variables to your Vercel project settings:
            </p>

            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4">
              <ul className="space-y-3 text-sm font-mono">
                <li className="flex items-start">
                  <span className="inline-block w-48 font-semibold text-gray-700">API_KEY</span>
                  <span className="text-gray-600">{apiKey || '(generate key first)'}</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-48 font-semibold text-gray-700">TANDEM_USERNAME</span>
                  <span className="text-gray-600">your-tandem-email@example.com</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-48 font-semibold text-gray-700">TANDEM_PASSWORD</span>
                  <span className="text-gray-600">your-tandem-password</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-48 font-semibold text-gray-700">REPORT_DAYS</span>
                  <span className="text-gray-600">2</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-48 font-semibold text-gray-700">CRON_SECRET</span>
                  <span className="text-gray-600">(optional - any random string)</span>
                </li>
              </ul>
            </div>

            <a
              href={`https://vercel.com/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Open Vercel Settings →
            </a>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> You'll also need to enable Vercel Blob storage for your project.
                The BLOB_READ_WRITE_TOKEN will be automatically configured when you enable Blob storage.
              </p>
            </div>
          </div>

          {/* Step 3: Save API Key */}
          <div className="mb-8 border-l-4 border-purple-500 pl-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Step 3: Save Your API Key
            </h3>
            <p className="text-gray-600 mb-4">
              <strong className="text-red-600">Important!</strong> Save your API key in a secure location.
              You'll need it to configure your iOS app. This key will NOT be shown again.
            </p>

            {apiKey && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-900 font-medium">
                  Your API Key: <code className="bg-yellow-100 px-2 py-1 rounded">{apiKey}</code>
                </p>
              </div>
            )}
          </div>

          {/* Step 4: Redeploy */}
          <div className="mb-8 border-l-4 border-green-500 pl-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Step 4: Redeploy Your Application
            </h3>
            <p className="text-gray-600 mb-4">
              After adding the environment variables, redeploy your application for the changes to take effect.
            </p>

            <a
              href={`https://vercel.com/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Go to Deployments →
            </a>

            <div className="mt-4 text-sm text-gray-600">
              <p>
                After redeployment, refresh this page. If configured correctly, you'll see the
                dashboard instead of this setup wizard.
              </p>
            </div>
          </div>

          {/* Help Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Need Help?
            </h3>
            <p className="text-gray-600 text-sm">
              Check out the{' '}
              <a
                href="https://github.com/yourusername/tandem-source-sync"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                README
              </a>
              {' '}for detailed setup instructions and troubleshooting tips.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
