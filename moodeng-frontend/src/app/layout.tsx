import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// import WalletClientWrapper from "@/components/WalletClientWrapper";
// import { Providers } from "@/components/Providers";

import { headers } from "next/headers"; // added
import { WalletContextProvider } from "@/contexts/WalletContextProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ethereum Seal Key Server Demo",
  description: "A demo application for Ethereum Seal key server integration",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const cookies = (await headers()).get('cookie')

  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletContextProvider cookies={cookies}>{children}</WalletContextProvider>
      </body>
    </html>
  );
}
