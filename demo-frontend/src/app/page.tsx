
'use client';

import { USDCTopup } from '@/components/topup';
import { Shoplist } from '@/components/registry/Shoplist';

export default function Home() {
  return (
    <div className="font-sans min-h-screen bg-gray-50 p-8">
      <main className="max-w-6xl mx-auto space-y-8">
        <USDCTopup />
        <Shoplist />
      </main>
    </div>
  );
}
