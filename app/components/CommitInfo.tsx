'use client';

import { useEffect, useState } from 'react';

export default function CommitInfo() {
  const [commitSha, setCommitSha] = useState<string>('unknown');

  useEffect(() => {
    // Get commit SHA from environment variable (set during build)
    const sha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
                process.env.NEXT_PUBLIC_COMMIT_SHA ||
                'dev';

    // Show short SHA (first 7 characters)
    setCommitSha(sha.substring(0, 7));
  }, []);

  return (
    <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-200">
      <div className="flex items-center justify-between">
        <span>Build</span>
        <code className="bg-gray-100 px-2 py-1 rounded text-gray-600 font-mono">
          {commitSha}
        </code>
      </div>
    </div>
  );
}
