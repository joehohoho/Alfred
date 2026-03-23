'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AlertsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>
        
        <div className="p-8 rounded-lg bg-slate-800/50 border border-slate-700/50 text-center">
          <h1 className="text-3xl font-bold mb-4">Signal Alerts</h1>
          <p className="text-slate-400 mb-6">
            Alert functionality is coming soon. For now, use the test interface to run backtests and analyze strategies.
          </p>
          <Link href="/test" className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold">
            Go to Test Interface
          </Link>
        </div>
      </div>
    </div>
  );
}
