"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import PageTransition from "@/components/ui/PageTransition";

export default function LandingPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans selection:bg-gray-200">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100 z-10 relative">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight font-[family-name:var(--font-serif)]">
              QueryMind
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <Link href="#features" className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Features
            </Link>
            <Link href="#spaces" className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Spaces
            </Link>
            <Link href="#evolution" className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Evolution
            </Link>
            <Link href="#pricing" className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Pricing
            </Link>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-xs font-medium bg-black text-white px-5 py-2.5 rounded hover:bg-gray-800 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center w-full overflow-hidden">
          <div className="pt-24 pb-16 px-6 text-center max-w-4xl mx-auto w-full relative z-10">
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-gray-200 text-[10px] font-bold text-gray-500 mb-10 uppercase tracking-widest bg-white">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
              Introducing QueryMind 2.0
            </div>
            
            <h1 className="text-5xl md:text-[5.5rem] font-medium tracking-tight text-gray-900 mb-8 leading-[1.1] font-[family-name:var(--font-serif)]">
              My digital world <span className="text-gray-400 italic">finally</span> has a<br/> home.
            </h1>
            
            <p className="text-[17px] text-gray-500 max-w-[640px] mx-auto mb-12 font-normal leading-[1.6]">
              QueryMind is a personal intelligence system built around dedicated, intelligent<br className="hidden md:block" />
              Spaces. Cultivate your career, research, projects, and learning in environments<br className="hidden md:block" />
              designed to evolve with you.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 bg-black text-white text-sm font-medium rounded shadow-md hover:bg-gray-800 transition-all text-center"
              >
                Get Started
              </Link>
              <button
                className="w-full sm:w-auto px-8 py-3.5 bg-white text-gray-900 border border-gray-200 text-sm font-medium rounded shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center">
                  <Play className="w-2.5 h-2.5 text-gray-500 ml-0.5" fill="currentColor" />
                </div>
                Watch the Film
              </button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="w-full max-w-[1200px] px-6 mx-auto mb-32">
            <div className="w-full aspect-[16/9] bg-gray-100 rounded-3xl overflow-hidden shadow-2xl relative border border-gray-200/50">
              {/* Using the generated image */}
              <img 
                src="/hero_mockup_1786128385111.png" 
                alt="QueryMind Desktop UI"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Spaces Section */}
          <div id="spaces" className="w-full max-w-6xl px-6 mx-auto mb-32">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-gray-900 mb-6 font-[family-name:var(--font-serif)]">
                Spaces designed for focus.
              </h2>
              <p className="text-[15px] text-gray-500 max-w-2xl mx-auto">
                Environments tailored to specific modes of thinking, keeping your workflows organized and<br className="hidden md:block" /> contextually relevant.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 gap-y-16">
              {/* Career Space */}
              <div className="group">
                <div className="w-full aspect-[16/10] bg-gray-100 rounded-xl overflow-hidden mb-6 border border-gray-200">
                  <img src="/career_space_1786128411879.png" alt="Career Space" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 font-[family-name:var(--font-serif)]">Career Space</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed pr-8">
                  Capture professional workflows and milestones. A living memory of achievements aligning daily tasks with long-term goals.
                </p>
              </div>

              {/* Research Space */}
              <div className="group">
                <div className="w-full aspect-[16/10] bg-gray-100 rounded-xl overflow-hidden mb-6 border border-gray-200">
                  <img src="/research_space_1786128425841.png" alt="Research Space" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 font-[family-name:var(--font-serif)]">Research Space</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed pr-8">
                  A canvas for synthesis. Surface connected information organically, turning fragmented data into a cohesive web of insights.
                </p>
              </div>

              {/* Projects Space */}
              <div className="group">
                <div className="w-full aspect-[16/10] bg-gray-100 rounded-xl overflow-hidden mb-6 border border-gray-200">
                  <img src="/projects_space_1786128440421.png" alt="Projects Space" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 font-[family-name:var(--font-serif)]">Projects Space</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed pr-8">
                  Structure active workflows. Connect relevant content and resources to stay focused on executing your most ambitious goals.
                </p>
              </div>

              {/* Learning Space */}
              <div className="group">
                <div className="w-full aspect-[16/10] bg-gray-100 rounded-xl overflow-hidden mb-6 border border-gray-200">
                  <img src="/learning_space_1786128453504.png" alt="Learning Space" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 font-[family-name:var(--font-serif)]">Learning Space</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed pr-8">
                  A distraction-free zone for curiosity. Build permanent memories and seamlessly integrate new insights into your worldview.
                </p>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="w-full max-w-6xl px-6 mx-auto mb-40 border-t border-gray-200 pt-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Quiet Intelligence</h4>
                <p className="text-xs text-gray-500 leading-relaxed pr-4">
                  An invisible layer that understands context, surfacing what you need, exactly when you need it, without demanding your attention.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Structured Flexibility</h4>
                <p className="text-xs text-gray-500 leading-relaxed pr-4">
                  Rigorous underlying organization that adapts gracefully to how you think and work, rather than forcing you into rigid folders.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Enduring Memory</h4>
                <p className="text-xs text-gray-500 leading-relaxed pr-4">
                  Your digital footprint compounded over time, ensuring past insights are easily retrievable for future endeavors.
                </p>
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="w-full py-24 bg-[#FAFAFA] border-t border-gray-100 flex flex-col items-center justify-center text-center px-6">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-gray-900 mb-6 max-w-2xl font-[family-name:var(--font-serif)] leading-tight">
              The future of personal intelligence is here.
            </h2>
            <p className="text-sm text-gray-500 mb-10">
              Stop managing files and start cultivating thoughts. Join the early access group today.
            </p>
            <Link
              href="/register"
              className="px-8 py-3.5 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 transition-all shadow-md"
            >
              Start your journey
            </Link>
          </div>

          {/* Footer */}
          <footer className="w-full px-8 py-10 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between">
            <div className="flex flex-col mb-4 sm:mb-0">
              <span className="text-lg font-bold tracking-tight text-gray-900 font-[family-name:var(--font-serif)] mb-1">
                QueryMind
              </span>
              <span className="text-[10px] text-gray-400">© 2026 QueryMind Intelligence Systems</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="#" className="text-[10px] text-gray-400 hover:text-gray-900 transition-colors">Privacy Policy</Link>
              <Link href="#" className="text-[10px] text-gray-400 hover:text-gray-900 transition-colors">Terms of Service</Link>
              <Link href="#" className="text-[10px] text-gray-400 hover:text-gray-900 transition-colors">Security</Link>
              <Link href="#" className="text-[10px] text-gray-400 hover:text-gray-900 transition-colors">Contact</Link>
            </div>
          </footer>
        </main>
      </div>
    </PageTransition>
  );
}
