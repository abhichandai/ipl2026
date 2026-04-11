import type { Metadata } from 'next';

import './globals.css';
import Nav from '@/components/Nav';



export const metadata: Metadata = {
  title: 'IPL 2026 Predictor',
  description: 'Predict & compete with friends on IPL 2026',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`bg-gray-950 text-white min-h-screen`}>
        <Nav />
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
