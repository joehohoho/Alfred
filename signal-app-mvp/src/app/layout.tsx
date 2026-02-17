import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Signal App MVP',
  description: 'Stock & Crypto Buy/Sell Signal Generator'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">{children}</body>
    </html>
  );
}
