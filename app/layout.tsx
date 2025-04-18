import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// Import Solana wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';
import ClientLayout from "../components/client-layout";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: '%s | Bundler.Space',
    default: 'Bundler.Space - The Ultimate Degen Toolkit for Solana',
  },
  description: 'The fastest and most comprehensive Solana toolkit providing bundlers for all DEXes, wallet management without downloads, and the fastest transaction fills.',
  keywords: 'Solana, Bundler, Pump.Fun, Raydium, DEX, Crypto, Wallet Management, Token Launch, AMM',
  authors: [{ name: 'BundlerdotSpace' }],
  openGraph: {
    title: 'Bundler.Space - The Ultimate Degen Toolkit for Solana',
    description: 'The fastest and most comprehensive Solana toolkit providing bundlers for all DEXes, wallet management without downloads, and the fastest transaction fills.',
    url: 'https://bundler.space',
    siteName: 'Bundler.Space',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Bundler.Space - The Ultimate Degen Toolkit for Solana',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bundler.Space - The Ultimate Degen Toolkit for Solana',
    description: 'The fastest and most comprehensive Solana toolkit providing bundlers for all DEXes, wallet management without downloads, and the fastest transaction fills.',
    images: ['/og-image.jpg'],
  },
  metadataBase: new URL('https://bundler.space'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${poppins.className} antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}