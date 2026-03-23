import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Market Signals App',
  description: 'Trading signals with adaptive strategies and backtesting',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
