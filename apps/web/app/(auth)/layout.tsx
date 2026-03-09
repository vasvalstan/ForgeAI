import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-forge-bg dark:bg-ink-950">
      <header className="flex-shrink-0 px-4 pt-4">
        <div className="mx-auto flex h-[52px] w-full max-w-md items-center justify-center rounded-[20px] border border-forge-border bg-forge-surface px-4 shadow-card">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-400">
              <span className="text-xs font-bold tracking-tight text-white">F</span>
            </div>
            <span className="text-base font-bold uppercase tracking-[0.08em] text-forge-text">
              Forge AI
            </span>
          </Link>
        </div>
      </header>
      <div className="flex flex-1 w-full items-center justify-center px-4 pb-8">{children}</div>
    </div>
  );
}
