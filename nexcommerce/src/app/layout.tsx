import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'NexCommerce - Modern E-commerce Platform',
    template: '%s | NexCommerce',
  },
  description:
    'Shop the latest products in electronics, clothing, and home essentials at NexCommerce',
  keywords: [
    'e-commerce',
    'online shopping',
    'electronics',
    'clothing',
    'home goods',
  ],
  authors: [{ name: 'NexCommerce' }],
  creator: 'NexCommerce',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://nexcommerce.com',
    title: 'NexCommerce - Modern E-commerce Platform',
    description: 'Shop the latest products at NexCommerce',
    siteName: 'NexCommerce',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NexCommerce - Modern E-commerce Platform',
    description: 'Shop the latest products at NexCommerce',
    creator: '@nexcommerce',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
