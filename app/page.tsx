export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold">MARCO</h1>
        <p className="text-xl">Mobile Asset Recovery and Circulation Operations</p>
      </div>

      <div className="grid text-center lg:max-w-5xl lg:w-full lg:grid-cols-3 lg:text-left">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Trade-in Management
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Process and track mobile device trade-ins from channel partners
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Device Grading
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Standardize and grade devices using the Model Library database
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Batch Bidding
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Manage customer bids for Android and Apple device lots
          </p>
        </div>
      </div>
    </main>
  );
}