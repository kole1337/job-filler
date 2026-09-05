import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Job Filler — one profile, every application',
  description:
    'Store your job-application details once and autofill Workday, Greenhouse, Lever and Ashby forms with the browser extension.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
