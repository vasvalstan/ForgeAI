import Link from "next/link";
import { ArrowRight, BrainCircuit, LayoutDashboard, Sparkles, Workflow } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-forge-bg text-forge-text selection:bg-primary-500/20">
      {/* Floating Nav */}
      <header className="sticky top-0 z-50 flex w-full justify-center px-6 pt-4 sm:px-10">
        <div className="flex h-[60px] w-full max-w-3xl items-center justify-between rounded-[28px] border border-forge-border bg-forge-surface px-4 shadow-card">
          <Link href="/" className="flex h-10 items-center gap-3 rounded-[20px] border border-forge-border bg-forge-surface-2 px-4">
            <span className="text-base font-bold uppercase tracking-[0.08em] text-forge-text">
              Forge AI
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="hidden rounded-xl px-4 py-2 text-sm font-medium text-forge-text-secondary transition-colors hover:bg-forge-surface-2 hover:text-forge-text sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-forge-text px-5 text-sm font-semibold text-forge-surface transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-20 pt-24 text-center sm:px-10 sm:pt-28">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary-500/15 bg-primary-500/8 px-4 py-2 text-sm font-medium text-primary-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
          </span>
          Now in Early Access
        </div>

        <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-forge-text sm:text-5xl md:text-6xl">
          The Spatial Intelligence OS
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-primary-500 to-brand-500 bg-clip-text text-transparent">
            for Product Managers
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-lg text-lg leading-relaxed text-forge-text-secondary">
          Stop drowning in linear docs. Turn user research, feature requests, and technical
          constraints into actionable product strategy on an infinite collaborative canvas.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/sign-up"
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-10 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
          >
            Start building for free
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/workspace"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-forge-text px-10 py-4 text-base font-semibold text-forge-surface shadow-sm transition-all hover:opacity-90 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
          >
            Try the canvas demo
          </Link>
        </div>
      </section>

      {/* Why Section — floating card */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-24 sm:px-10">
        <div className="rounded-[32px] border border-forge-border bg-forge-surface px-6 py-16 shadow-card sm:px-10">
          <div className="mx-auto max-w-lg text-center">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-forge-text sm:text-3xl md:text-4xl">
              Why linear tools fail product managers
            </h2>
            <p className="mb-14 text-base text-forge-text-secondary sm:text-lg">
              Jira tickets and Notion docs strip away context. ForgeAI brings your discovery,
              brainstorming, and execution into a single spatial environment where context lives
              alongside the work.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: LayoutDashboard,
                color: "primary",
                title: "Infinite Spatial Canvas",
                desc: "Map out user journeys, wireframes, and PRDs side-by-side. See the whole product narrative at a glance instead of switching between 10 tabs.",
              },
              {
                icon: BrainCircuit,
                color: "brand",
                title: "Always-On Agent Panel",
                desc: "Your AI co-pilot lives right next to your canvas. Ask it to summarize research, draft PRDs, or synthesize user feedback into feature specs.",
              },
              {
                icon: Workflow,
                color: "success",
                title: "Seamless Handoff",
                desc: "Go from messy discovery to structured execution. Export your PRDs, user stories, and specs into your engineering team\u2019s tools.",
              },
            ].map((item) => {
              const bgMap: Record<string, string> = {
                primary: "bg-primary-500/8 dark:bg-primary-500/10",
                brand: "bg-brand-500/8 dark:bg-brand-500/10",
                success: "bg-forge-success/8 dark:bg-emerald-500/10",
              };
              const iconColorMap: Record<string, string> = {
                primary: "text-primary-500",
                brand: "text-brand-500",
                success: "text-forge-success",
              };
              return (
                <div
                  key={item.title}
                  className="flex flex-col items-center rounded-[20px] border border-forge-border-subtle bg-forge-surface-2 p-6 text-center dark:bg-forge-surface dark:shadow-none"
                >
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${bgMap[item.color]}`}>
                    <item.icon className={`h-5 w-5 ${iconColorMap[item.color]}`} />
                  </div>
                  <h3 className="mb-2 text-base font-bold text-forge-text">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-forge-text-secondary">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-24 sm:px-10">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-forge-text sm:text-3xl md:text-4xl">
            Think visually.
          </h2>
          <p className="mb-12 text-2xl font-bold tracking-tight text-forge-text-dim sm:text-3xl md:text-4xl">
            Execute systematically.
          </p>
        </div>

        {/* Canvas mockup in floating card */}
        <div className="mb-14 overflow-hidden rounded-[28px] border border-forge-border bg-forge-surface shadow-card">
          <div className="aspect-video">
            <div className="flex h-full">
              <div className="relative flex-[2] border-r border-forge-border">
                <div
                  className="absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 2px 2px, #888 1px, transparent 0)",
                    backgroundSize: "24px 24px",
                  }}
                />
                <div className="absolute left-[8%] top-[12%] aspect-[3/2] w-[40%] max-w-[180px] rounded-xl border border-primary-400/20 bg-forge-surface-2 p-4 shadow-card dark:border-primary-500/30 dark:bg-primary-500/20">
                  <div className="mb-3 h-3 w-1/2 rounded bg-primary-500/15 dark:bg-primary-500/40" />
                  <div className="mb-1.5 h-1.5 w-full rounded bg-primary-500/8 dark:bg-primary-500/20" />
                  <div className="h-1.5 w-3/4 rounded bg-primary-500/8 dark:bg-primary-500/20" />
                </div>
                <div className="absolute bottom-[12%] right-[8%] aspect-[3/2] w-[40%] max-w-[180px] rounded-xl border border-brand-400/20 bg-forge-surface-2 p-4 shadow-card dark:border-brand-500/30 dark:bg-brand-500/20">
                  <div className="mb-3 h-3 w-2/3 rounded bg-brand-500/15 dark:bg-brand-500/40" />
                  <div className="mb-1.5 h-1.5 w-full rounded bg-brand-500/8 dark:bg-brand-500/20" />
                  <div className="h-1.5 w-5/6 rounded bg-brand-500/8 dark:bg-brand-500/20" />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3 bg-forge-surface-2 p-4 dark:bg-forge-surface sm:p-6">
                <div className="h-6 w-full rounded-md bg-forge-surface dark:bg-zinc-800" />
                <div className="h-16 w-full flex-1 rounded-md bg-forge-surface dark:bg-zinc-800" />
                <div className="mt-auto flex h-10 items-center justify-between rounded-md border border-primary-500/10 bg-primary-500/6 px-3 dark:border-primary-500/30 dark:bg-primary-600/20">
                  <div className="h-1.5 w-16 rounded bg-primary-500/25 dark:bg-primary-500/50" />
                  <Sparkles className="h-4 w-4 text-primary-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Steps */}
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            { n: "1", color: "primary", title: "Dump the chaos", desc: "Bring your customer quotes, competitor screenshots, and analytics data into one spatial view." },
            { n: "2", color: "brand", title: "Synthesize with AI", desc: "Select clusters on the canvas and ask the Agent Panel to extract the core problem and draft user stories." },
            { n: "3", color: "success", title: "Output structured PRDs", desc: "The Agent Panel turns your visual thinking into structured PRDs and specs for your engineering team." },
          ].map((step) => {
            const colorMap: Record<string, string> = {
              primary: "bg-primary-500/8 text-primary-500 dark:bg-primary-500/10",
              brand: "bg-brand-500/8 text-brand-500 dark:bg-brand-500/10",
              success: "bg-forge-success/8 text-forge-success dark:bg-emerald-500/10",
            };
            return (
              <div key={step.n} className="flex flex-col items-center gap-3 text-center">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold ${colorMap[step.color]}`}>
                  {step.n}
                </div>
                <h4 className="text-base font-bold text-forge-text">{step.title}</h4>
                <p className="text-sm text-forge-text-secondary">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA — floating card */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-16 sm:px-10">
        <div className="rounded-[32px] border border-forge-border bg-gradient-to-b from-forge-surface to-primary-500/5 px-6 py-16 text-center shadow-card sm:px-10 dark:to-primary-500/5">
          <h2 className="mb-5 text-2xl font-bold tracking-tight text-forge-text sm:text-3xl md:text-4xl">
            Ready to upgrade your product process?
          </h2>
          <p className="mb-10 text-base text-forge-text-secondary sm:text-lg">
            Join forward-thinking PMs who have moved beyond linear text docs.
          </p>
          <Link
            href="/sign-up"
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-forge-text px-10 py-4 text-base font-bold text-forge-surface shadow-sm transition-all hover:opacity-90 dark:bg-white dark:text-black dark:hover:bg-gray-100"
          >
            Create your free account
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-forge-border">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-12 text-center sm:px-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand-500/20 to-primary-500/20">
              <span className="text-[9px] font-bold tracking-tight text-forge-text-dim">F</span>
            </div>
            <span className="font-semibold text-forge-text-dim">ForgeAI</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-forge-text-dim">
            <Link href="/privacy" className="transition-colors hover:text-forge-text">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-forge-text">Terms</Link>
            <Link href="/contact" className="transition-colors hover:text-forge-text">Contact</Link>
          </div>
          <p className="text-sm text-forge-text-dim/60">
            &copy; {new Date().getFullYear()} ForgeAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
