import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-bold">
          Job Filler
        </Link>
        <Link href="/" className="text-sm text-gray-500 underline">
          About
        </Link>
      </header>
      {children}
    </div>
  );
}
