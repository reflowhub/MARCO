import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div>
          <h1 className="text-4xl font-bold mb-2">MARCO</h1>
          <p className="text-xl">Mobile Asset Recovery and Circulation Operations</p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="bg-white border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-md hover:bg-blue-50 font-semibold"
          >
            Login
          </Link>
          <Link
            href="/admin/dashboard"
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-semibold"
          >
            Admin Dashboard →
          </Link>
        </div>
      </div>

      <div className="grid text-center lg:max-w-5xl lg:w-full lg:grid-cols-3 lg:text-left gap-6">
        <Link href="/admin/trade-ins" className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Trade-in Management
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Process and track mobile device trade-ins from channel partners
          </p>
        </Link>

        <Link href="/admin/model-library" className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Device Library
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Standardize and grade devices using the Model Library database
          </p>
        </Link>

        <Link href="/admin/bids" className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Batch Bidding
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Manage customer bids for Android and Apple device lots
          </p>
        </Link>
      </div>
    </main>
  );
}