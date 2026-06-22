import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle } from 'lucide-react';
import { APP_NAME, STEPS, STEP_HEADINGS } from './constants';
import { useOnboardingWizard } from './hooks/useOnboardingWizard';
import { OnboardingSidebar } from './components/OnboardingSidebar';
import { OnboardingFooter } from './components/OnboardingFooter';
import { SuccessScreen } from './components/SuccessScreen';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { PaymentFailedScreen } from './components/PaymentFailedScreen';
import { PlanStep } from './components/steps/PlanStep';
import { CompanyStep } from './components/steps/CompanyStep';
import { AccountStep } from './components/steps/AccountStep';
import { ReviewStep } from './components/steps/ReviewStep';

function OnboardingWizard() {
  const navigate = useNavigate();
  const wizard = useOnboardingWizard();
  const {
    step,
    isFirstStep,
    isLastStep,
    next,
    back,
    plans,
    plansLoading,
    selectedPlanId,
    selectPlan,
    selectedPlan,
    company,
    account,
    companyAvailability,
    usernameAvailability,
    handleCompanyChange,
    setCompanyField,
    handleAccountChange,
    error,
    submitting,
    provisioning,
    orderId,
    done,
    failure,
    dismissFailure,
    pay
  } = wizard;

  const goToLogin = () => navigate('/');

  // On the plan step, clicking the empty area around the cards clears the
  // selection (card clicks stop propagation, so they aren't affected).
  const handleContentClick = () => {
    if (step === 0 && selectedPlanId) selectPlan(null);
  };

  if (done) {
    return <SuccessScreen result={done} onGoToLogin={goToLogin} />;
  }

  // Payment captured but provisioning failed (money refunded server-side) — show
  // a clear result screen rather than silently dropping back to the form.
  if (failure) {
    return (
      <PaymentFailedScreen
        message={failure.message}
        orderId={failure.orderId}
        onRetry={dismissFailure}
        onGoToLogin={goToLogin}
      />
    );
  }

  const heading = STEP_HEADINGS[step];

  return (
    <div className="min-h-screen flex bg-gray-50">
      <ProcessingOverlay open={provisioning} orderId={orderId} />
      <OnboardingSidebar appName={APP_NAME} steps={STEPS} step={step} onLogin={goToLogin} />

      <main className="flex-1 min-w-0 flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50">
        {/* Mobile header (sidebar is hidden on small screens) */}
        <div className="md:hidden flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-4 text-white">
          <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <Shield className="h-4 w-4 text-white" />
            </span>
            {APP_NAME}
          </span>
          <span className="text-xs font-medium text-slate-300">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>

        <div
          className="flex-1 overflow-y-auto px-6 md:px-10 py-8 md:py-12"
          onClick={handleContentClick}
        >
          <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center">
            <div className="mb-8">
              <span className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Step {step + 1} of {STEPS.length}
              </span>
              <h2 className="mt-1 text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
                {heading.title}
              </h2>
              <p className="mt-2 text-base text-gray-500">{heading.subtitle}</p>
              <span className="mt-4 block h-1 w-16 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" />
            </div>

            {step === 0 && (
              <PlanStep
                plans={plans}
                plansLoading={plansLoading}
                selectedPlanId={selectedPlanId}
                onSelect={selectPlan}
              />
            )}
            {step === 1 && (
              <CompanyStep
                company={company}
                onChange={handleCompanyChange}
                onFieldChange={setCompanyField}
                nameAvailability={companyAvailability}
              />
            )}
            {step === 2 && (
              <AccountStep
                account={account}
                onChange={handleAccountChange}
                usernameAvailability={usernameAvailability}
              />
            )}
            {step === 3 && (
              <ReviewStep selectedPlan={selectedPlan} company={company} account={account} />
            )}

            {error && (
              <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <OnboardingFooter
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          submitting={submitting}
          onBack={back}
          onNext={next}
          onPay={pay}
        />
      </main>
    </div>
  );
}

export { OnboardingWizard };
