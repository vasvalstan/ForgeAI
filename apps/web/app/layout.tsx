import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "../components/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased dark:bg-ink-950 dark:text-forge-text">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster
            position="bottom-right"
            theme="system"
            toastOptions={{
              className: "dark:bg-[#1e1e1e] dark:border-[#333] dark:text-[#ececec]",
              style: {
                background: "rgba(255, 255, 255, 0.95)",
                border: "1px solid rgba(15, 23, 42, 0.12)",
                backdropFilter: "blur(14px)",
                color: "#0F172A",
                fontFamily: "var(--font-inter), system-ui, sans-serif",
              },
            }}
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
