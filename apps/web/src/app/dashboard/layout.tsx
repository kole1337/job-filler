import Link from 'next/link';
import { ExtensionNavLink } from '@/components/ExtensionStatus';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-bold">
          Job Filler
        </Link>
        <nav className="flex items-center gap-4">
          <ExtensionNavLink />
          <Link href="/" className="text-sm text-gray-500 underline">
            About
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
