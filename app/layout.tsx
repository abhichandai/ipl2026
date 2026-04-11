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
      <body>
        <Nav />
        <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
