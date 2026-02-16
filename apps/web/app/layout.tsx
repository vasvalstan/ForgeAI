import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForgeAI — Spatial Intelligence OS",
  description:
    "The first Spatial Intelligence OS for Product Managers. Turn user research into actionable product strategy on an infinite collaborative canvas.",
  keywords: [
    "product management",
    "AI",
    "spatial intelligence",
    "product discovery",
    "canvas",
    "collaboration",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-grotesk@200,300,400,500,600,700&f[]=satoshi@300,400,500,600,700&display=swap"
        />
      </head>
      <body className="antialiased">
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "rgba(11, 16, 32, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(20px)",
              color: "#F1F5F9",
              fontFamily: "Satoshi, Inter, system-ui, sans-serif",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
