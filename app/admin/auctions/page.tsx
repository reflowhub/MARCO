'use client';

export default function AuctionsPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Auctions</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-2">Coming Soon</h2>
        <p className="text-blue-800">
          The Auctions management page is under development. This page will allow you to:
        </p>
        <ul className="list-disc list-inside text-blue-800 mt-4 space-y-2">
          <li>Create and manage auction lots for Android and Apple devices</li>
          <li>Set auction dates and group trade-ins into batches</li>
          <li>Compare customer bids side-by-side</li>
          <li>Award lots to winning customers</li>
          <li>Track sold dates and update inventory status</li>
        </ul>
        <p className="text-blue-800 mt-4">
          In the meantime, you can upload trade-ins and customer bids through the{' '}
          <a href="/admin/upload" className="underline font-semibold">
            Upload Files
          </a>{' '}
          page, and view them in the{' '}
          <a href="/admin/trade-ins" className="underline font-semibold">
            Trade-Ins
          </a>{' '}
          and{' '}
          <a href="/admin/bids" className="underline font-semibold">
            Customer Bids
          </a>{' '}
          pages.
        </p>
      </div>
    </div>
  );
}
