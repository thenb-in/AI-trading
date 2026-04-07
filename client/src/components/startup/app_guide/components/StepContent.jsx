import PropTypes from 'prop-types';
import { FaCheckCircle, FaArrowRight, FaRocket } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { getThemeClasses } from '../utils/themeUtils';

function StepContent({ step, currentStep, totalSteps, onNext, onPrevious, onComplete, theme }) {
  const { icon: Icon, title, description, features } = step;
  const isLastStep = currentStep === totalSteps - 1;
  const themeClasses = getThemeClasses(theme.primaryColor);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="p-6"
        >
          {/* Header Section with Icon and Title */}
          <div className="flex items-start space-x-4 mb-6 pb-6 border-b border-slate-200">
            <div className={`${themeClasses.iconBg} rounded-lg p-3 shadow-sm flex-shrink-0`}>
              <Icon className={`text-2xl ${themeClasses.iconText}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 mb-2 leading-tight">
                {title}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          {/* Features List - Compact Grid */}
          <div className="grid md:grid-cols-2 gap-3 mb-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start space-x-2.5 p-3.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors duration-150 border border-slate-200/50"
              >
                <FaCheckCircle className="text-emerald-500 mt-0.5 flex-shrink-0 text-sm" />
                <span className="text-sm text-slate-700 font-medium leading-snug">{feature}</span>
              </motion.div>
            ))}
          </div>

          {/* Navigation Buttons - Compact */}
          <div className="flex items-center justify-between pt-5 border-t border-slate-200">
            <button
              onClick={onPrevious}
              disabled={currentStep === 0}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                currentStep === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Previous
            </button>

            <div className="flex space-x-1.5">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <button
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-150 ${
                    currentStep === index
                      ? `${themeClasses.progressDot} w-6`
                      : 'bg-slate-300 hover:bg-slate-400 w-1.5'
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>

            {isLastStep ? (
              <button
                onClick={onComplete}
                className={`px-5 py-2 ${themeClasses.buttonGradient} text-white text-sm font-semibold rounded-lg transition-all duration-150 flex items-center space-x-2 shadow-md hover:shadow-lg`}
              >
                <span>Get Started</span>
                <FaRocket className="text-xs" />
              </button>
            ) : (
              <button
                onClick={onNext}
                className={`px-5 py-2 ${themeClasses.buttonPrimary} text-white text-sm font-semibold rounded-lg transition-all duration-150 flex items-center space-x-2 shadow-md hover:shadow-lg`}
              >
                <span>Next</span>
                <FaArrowRight className="text-xs" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

StepContent.propTypes = {
  step: PropTypes.shape({
    icon: PropTypes.elementType.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    features: PropTypes.arrayOf(PropTypes.string).isRequired
  }).isRequired,
  currentStep: PropTypes.number.isRequired,
  totalSteps: PropTypes.number.isRequired,
  onNext: PropTypes.func.isRequired,
  onPrevious: PropTypes.func.isRequired,
  onComplete: PropTypes.func.isRequired,
  theme: PropTypes.shape({
    primaryColor: PropTypes.string.isRequired,
    secondaryColor: PropTypes.string.isRequired
  }).isRequired
};

export { StepContent };

