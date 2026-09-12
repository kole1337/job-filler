import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import { Landing } from '@/components/landing/Landing';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono2',
  display: 'swap',
});

export default function Home() {
  return (
    <div className={`${display.variable} ${mono.variable}`}>
      <Landing />
    </div>
  );
}
