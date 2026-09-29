'use client';

import CbtTriangleSandbox from '@/components/CbtTriangleSandbox';
import EmotionPatternSandbox from '@/components/EmotionPatternSandbox';

export default function SandboxPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-6 sm:py-10 px-2 sm:px-4 flex flex-col items-center gap-6 sm:gap-8">
      <div className="w-full max-w-2xl">
        <EmotionPatternSandbox/>
      </div>
      <div className="w-full max-w-2xl">
        <CbtTriangleSandbox/>
      </div>
    </main>
  );
}
