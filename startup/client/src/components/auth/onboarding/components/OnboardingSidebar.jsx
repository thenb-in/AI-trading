import PropTypes from 'prop-types';
import { Shield, LogIn, Star } from 'lucide-react';
import { StepTracker } from './StepTracker';
import { SIDEBAR_COPY } from '../constants';

/**
 * Fixed branded sidebar (desktop only): brand mark, a benefit-driven value
 * prop, the vertical step tracker, a social-proof card and a sign-in link —
 * the patterns modern SaaS signup flows use to build trust during onboarding.
 */
function OnboardingSidebar({ appName, steps, step, onLogin }) {
  return (
    <aside className="relative hidden md:flex md:flex-col w-72 shrink-0 sticky top-0 h-screen overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white p-7 border-r border-white/5">
      {/* Soft decorative glow */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-indigo-600/20 blur-3xl" />

      <div className="relative flex h-full flex-col justify-center gap-8">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/40">
              <Shield className="h-5 w-5 text-white" />
            </span>
            <h1 className="text-xl font-bold tracking-tight">{appName}</h1>
          </div>
          <p className="mt-5 text-2xl font-bold leading-snug tracking-tight text-white">
            {SIDEBAR_COPY.headingLead}
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              {SIDEBAR_COPY.headingAccent}
            </span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {SIDEBAR_COPY.subtitle}
          </p>
        </div>

        {/* Progress */}
        <StepTracker steps={steps} step={step} />

        {/* Social proof */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-1 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">
            {SIDEBAR_COPY.testimonialQuote}
          </p>
          <p className="mt-2 text-xs text-slate-400">{SIDEBAR_COPY.testimonialCaption}</p>
        </div>

        {/* Sign in */}
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="mb-3 text-sm text-slate-300">Already have an account?</p>
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-blue-400 hover:bg-blue-600"
          >
            <LogIn className="h-4 w-4" />
            Log in
          </button>
        </div>
      </div>
    </aside>
  );
}

OnboardingSidebar.propTypes = {
  appName: PropTypes.string.isRequired,
  steps: PropTypes.arrayOf(PropTypes.string).isRequired,
  step: PropTypes.number.isRequired,
  onLogin: PropTypes.func.isRequired
};

export { OnboardingSidebar };
