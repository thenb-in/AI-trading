import { useState } from 'react';
import PropTypes from 'prop-types';
import { defaultAppGuideConfig } from './config/defaultConfig';
import { GuideHeader } from './components/GuideHeader';
import { StepNavigation } from './components/StepNavigation';
import { StepContent } from './components/StepContent';
import { QuickTips } from './components/QuickTips';


function AppGuide({ config = {}, userName, onComplete, className = '' }) {
  // Merge user config with defaults
  const mergedConfig = {
    header: { ...defaultAppGuideConfig.header, ...config.header },
    steps: config.steps || defaultAppGuideConfig.steps,
    quickTips: config.quickTips || defaultAppGuideConfig.quickTips,
    theme: { ...defaultAppGuideConfig.theme, ...config.theme },
    behavior: { ...defaultAppGuideConfig.behavior, ...config.behavior }
  };

  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < mergedConfig.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (index) => {
    setCurrentStep(index);
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const handleClose = () => {
    handleComplete();
  };

  const currentStepData = mergedConfig.steps[currentStep];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 ${className}`}>

      <GuideHeader
        config={mergedConfig}
        userName={userName}
        onClose={handleClose}
      />

      {/* Main Content - Full Width Container */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Step Navigation */}
          {mergedConfig.behavior.showStepNavigation && (
            <div className="lg:col-span-3">
              <StepNavigation
                steps={mergedConfig.steps}
                currentStep={currentStep}
                onStepClick={handleStepClick}
                theme={mergedConfig.theme}
              />
            </div>
          )}

          {/* Main Guide Content */}
          <div className={mergedConfig.behavior.showStepNavigation ? 'lg:col-span-9' : 'lg:col-span-12'}>
            <StepContent
              step={currentStepData}
              currentStep={currentStep}
              totalSteps={mergedConfig.steps.length}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onComplete={handleComplete}
              theme={mergedConfig.theme}
            />

            {/* Quick Tips */}
            {mergedConfig.behavior.showQuickTips && (
              <QuickTips
                tips={mergedConfig.quickTips}
                theme={mergedConfig.theme}
              />
            )}

            {/* Footer Action - Skip */}
            {mergedConfig.behavior.allowSkip && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleClose}
                  className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors duration-200 hover:underline"
                >
                  {mergedConfig.behavior.skipText}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

AppGuide.propTypes = {
  config: PropTypes.shape({
    header: PropTypes.shape({
      title: PropTypes.string,
      subtitle: PropTypes.func,
      subtitleSuffix: PropTypes.string,
      icon: PropTypes.elementType,
      showCloseButton: PropTypes.bool,
      gradientColors: PropTypes.shape({
        from: PropTypes.string,
        to: PropTypes.string
      })
    }),
    steps: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        icon: PropTypes.elementType.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        features: PropTypes.arrayOf(PropTypes.string).isRequired
      })
    ),
    quickTips: PropTypes.arrayOf(
      PropTypes.shape({
        icon: PropTypes.elementType.isRequired,
        text: PropTypes.string.isRequired
      })
    ),
    theme: PropTypes.shape({
      primaryColor: PropTypes.string,
      secondaryColor: PropTypes.string,
      backgroundGradient: PropTypes.string,
      cardShadow: PropTypes.string,
      borderRadius: PropTypes.string
    }),
    behavior: PropTypes.shape({
      showQuickTips: PropTypes.bool,
      showStepNavigation: PropTypes.bool,
      showProgressDots: PropTypes.bool,
      allowSkip: PropTypes.bool,
      skipText: PropTypes.string
    })
  }),
  userName: PropTypes.string,
  onComplete: PropTypes.func.isRequired,
  className: PropTypes.string
};

export { AppGuide };

