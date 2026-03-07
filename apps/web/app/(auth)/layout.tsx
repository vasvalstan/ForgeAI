import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-forge-bg dark:bg-ink-950">
      <header className="w-full px-6 py-4 flex-shrink-0">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-400">
            <span className="font-bold text-white text-xs tracking-tight">F</span>
          </div>
          <span className="font-bold text-base tracking-widest uppercase text-forge-text">FORGE AI</span>
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        {children}
      </div>
    </div>
  );
}
