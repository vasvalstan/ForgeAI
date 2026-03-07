import Link from "next/link";
import { ArrowRight, BrainCircuit, LayoutDashboard, Sparkles, Workflow } from "lucide-react";

export default function LandingPage() {
  const centeredContent = { width: "min(92vw, 820px)", marginInline: "auto" } as const;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-forge-bg dark:bg-forge-bg text-forge-text selection:bg-primary-500/20">
      {/* Header */}
      <header className="sticky top-0 w-full z-50 bg-forge-surface/80 dark:bg-forge-bg/80 backdrop-blur-md border-b border-forge-border">
        <div style={centeredContent} className="flex justify-between items-center py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-400">
              <span className="font-bold text-white text-xs tracking-tight">F</span>
            </div>
            <span className="font-bold text-base tracking-widest uppercase text-forge-text">FORGE AI</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-forge-text-secondary hover:text-forge-text transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm font-medium bg-forge-text text-forge-surface dark:bg-white dark:text-black px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={centeredContent} className="pt-28 pb-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/8 text-primary-500 text-sm font-medium mb-8 border border-primary-500/15">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
          </span>
          <span>Now in Early Access</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6 text-forge-text">
          The Spatial Intelligence OS <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-brand-500">
            for Product Managers
          </span>
        </h1>
        
        <p className="text-lg sm:text-xl text-forge-text-secondary max-w-xl leading-relaxed mb-10">
          Stop drowning in linear docs. Turn user research, feature requests, and technical constraints into actionable product strategy on an infinite collaborative canvas.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-11 py-[18px] rounded-2xl font-semibold text-[18px] transition-colors group shadow-sm"
          >
            Start building for free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/workspace"
            className="inline-flex items-center justify-center gap-2 bg-forge-text hover:opacity-90 text-forge-surface dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white px-11 py-[18px] rounded-2xl font-semibold text-[18px] transition-all shadow-sm"
          >
            Try the canvas demo
          </Link>
        </div>
      </section>

      {/* Why Section */}
      <section className="w-full bg-forge-bg dark:bg-[#0a0a0a] border-y border-forge-border">
        <div style={centeredContent} className="py-28 flex flex-col items-center text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-8 text-forge-text">
            Why linear tools fail product managers
          </h2>
          <p className="text-lg text-forge-text-secondary max-w-2xl mb-20">
            Jira tickets and Notion docs strip away context. ForgeAI brings your discovery, 
            brainstorming, and execution into a single spatial environment where context lives alongside the work.
          </p>

          <div className="w-full grid sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center bg-forge-surface dark:bg-zinc-900/50 border border-forge-border-subtle rounded-2xl p-8 shadow-card dark:shadow-none">
              <div className="w-12 h-12 bg-primary-500/8 dark:bg-primary-500/10 rounded-xl flex items-center justify-center mb-5">
                <LayoutDashboard className="w-6 h-6 text-primary-500" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-forge-text">Infinite Spatial Canvas</h3>
              <p className="text-[15px] text-forge-text-secondary leading-relaxed">
                Map out user journeys, wireframes, and PRDs side-by-side. See the whole product narrative at a glance instead of switching between 10 tabs.
              </p>
            </div>

            <div className="flex flex-col items-center text-center bg-forge-surface dark:bg-zinc-900/50 border border-forge-border-subtle rounded-2xl p-8 shadow-card dark:shadow-none">
              <div className="w-12 h-12 bg-brand-500/8 dark:bg-brand-500/10 rounded-xl flex items-center justify-center mb-5">
                <BrainCircuit className="w-6 h-6 text-brand-500" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-forge-text">Always-On Agent Panel</h3>
              <p className="text-[15px] text-forge-text-secondary leading-relaxed">
                Your AI co-pilot lives right next to your canvas. Ask it to summarize research, draft PRDs, or synthesize user feedback into feature specs.
              </p>
            </div>

            <div className="flex flex-col items-center text-center bg-forge-surface dark:bg-zinc-900/50 border border-forge-border-subtle rounded-2xl p-8 shadow-card dark:shadow-none">
              <div className="w-12 h-12 bg-forge-success/8 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center mb-5">
                <Workflow className="w-6 h-6 text-forge-success" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-forge-text">Seamless Handoff</h3>
              <p className="text-[15px] text-forge-text-secondary leading-relaxed">
                Go from messy discovery to structured execution. Export your PRDs, user stories, and specs into your engineering team&apos;s tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={centeredContent} className="py-24 flex flex-col items-center text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 text-forge-text">
          Think visually.
        </h2>
        <p className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-14 text-forge-text-dim">
          Execute systematically.
        </p>

        {/* Canvas mockup */}
        <div className="w-full max-w-3xl aspect-video bg-forge-surface-2 dark:bg-zinc-900 rounded-2xl border border-forge-border overflow-hidden relative shadow-xl mb-16">
          <div className="absolute inset-0 flex">
            <div className="flex-[2] border-r border-forge-border relative">
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #888 1px, transparent 0)", backgroundSize: "24px 24px" }}></div>
              <div className="absolute top-[12%] left-[8%] w-[40%] max-w-[200px] aspect-[3/2] bg-forge-surface dark:bg-primary-500/20 border border-primary-400/20 dark:border-primary-500/30 rounded-xl p-4 shadow-card dark:shadow-none">
                <div className="w-1/2 h-3 bg-primary-500/15 dark:bg-primary-500/40 rounded mb-3"></div>
                <div className="w-full h-1.5 bg-primary-500/8 dark:bg-primary-500/20 rounded mb-1.5"></div>
                <div className="w-3/4 h-1.5 bg-primary-500/8 dark:bg-primary-500/20 rounded"></div>
              </div>
              <div className="absolute bottom-[12%] right-[8%] w-[40%] max-w-[200px] aspect-[3/2] bg-forge-surface dark:bg-brand-500/20 border border-brand-400/20 dark:border-brand-500/30 rounded-xl p-4 shadow-card dark:shadow-none">
                <div className="w-2/3 h-3 bg-brand-500/15 dark:bg-brand-500/40 rounded mb-3"></div>
                <div className="w-full h-1.5 bg-brand-500/8 dark:bg-brand-500/20 rounded mb-1.5"></div>
                <div className="w-5/6 h-1.5 bg-brand-500/8 dark:bg-brand-500/20 rounded"></div>
              </div>
            </div>
            <div className="flex-1 bg-forge-surface dark:bg-[#111] p-4 sm:p-6 flex flex-col gap-3">
              <div className="w-full h-6 bg-forge-surface-2 dark:bg-zinc-800 rounded-md"></div>
              <div className="w-full h-16 bg-forge-surface-2 dark:bg-zinc-800 rounded-md flex-1"></div>
              <div className="w-full h-10 bg-primary-500/6 dark:bg-primary-600/20 border border-primary-500/10 dark:border-primary-500/30 rounded-md mt-auto flex items-center justify-between px-3">
                <div className="w-16 h-1.5 bg-primary-500/25 dark:bg-primary-500/50 rounded"></div>
                <Sparkles className="w-4 h-4 text-primary-500" />
              </div>
            </div>
          </div>
        </div>
        
        {/* 3 Steps */}
        <div className="w-full grid sm:grid-cols-3 gap-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary-500/8 dark:bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold text-lg">1</div>
            <h4 className="text-lg font-bold text-forge-text">Dump the chaos</h4>
            <p className="text-[15px] text-forge-text-secondary">Bring your customer quotes, competitor screenshots, and analytics data into one spatial view.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-brand-500/8 dark:bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold text-lg">2</div>
            <h4 className="text-lg font-bold text-forge-text">Synthesize with AI</h4>
            <p className="text-[15px] text-forge-text-secondary">Select clusters on the canvas and ask the Agent Panel to extract the core problem and draft user stories.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-forge-success/8 dark:bg-emerald-500/10 flex items-center justify-center text-forge-success font-bold text-lg">3</div>
            <h4 className="text-lg font-bold text-forge-text">Output structured PRDs</h4>
            <p className="text-[15px] text-forge-text-secondary">The Agent Panel turns your visual thinking into structured PRDs and specs for your engineering team.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full border-t border-forge-border bg-gradient-to-b from-transparent to-primary-500/5 dark:to-primary-500/5">
        <div style={centeredContent} className="py-24 flex flex-col items-center text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-5 text-forge-text">Ready to upgrade your product process?</h2>
          <p className="text-lg text-forge-text-secondary mb-10">Join forward-thinking PMs who have moved beyond linear text docs.</p>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 bg-forge-text hover:opacity-90 text-forge-surface dark:bg-white dark:hover:bg-gray-100 dark:text-black px-12 py-5 rounded-2xl font-bold text-lg transition-all group shadow-sm"
          >
            Create your free account
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-forge-border">
        <div style={centeredContent} className="py-12 flex flex-col items-center text-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br from-brand-500/20 to-primary-500/20">
              <span className="font-bold text-forge-text-dim text-[9px] tracking-tight">F</span>
            </div>
            <span className="font-semibold text-forge-text-dim">ForgeAI</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-forge-text-dim">
            <Link href="/privacy" className="hover:text-forge-text transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-forge-text transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-forge-text transition-colors">Contact</Link>
          </div>
          <p className="text-sm text-forge-text-dim/60">
            &copy; {new Date().getFullYear()} ForgeAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
