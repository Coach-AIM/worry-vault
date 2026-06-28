import type { Metadata } from 'next';
import './globals.css';
import Footer from '@/components/Footer';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Momentum',
  description: 'A minimalist mental wellness application.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="app-body">
        <main className="app-main">
          {children}
        </main>
        <Footer />
        <Navigation />
      </body>
    </html>
  );
}
