import PropTypes from 'prop-types';
import { FaCheckCircle } from 'react-icons/fa';
import { getThemeClasses } from '../utils/themeUtils';

function StepNavigation({ steps, currentStep, onStepClick, theme }) {
  const themeClasses = getThemeClasses(theme.primaryColor);
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col sticky top-4 h-[calc(100vh-2rem)] max-h-[800px]">
      <div className="flex-shrink-0 p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Navigation</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pt-3">
        <div className="space-y-1.5">
          {steps.map((step, index) => {
            const isActive = currentStep === index;
            const isCompleted = currentStep > index;

            return (
              <button
                key={step.id || index}
                onClick={() => onStepClick(index)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-150 ${
                  isActive
                    ? `${themeClasses.activeStep} shadow-md`
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-transparent hover:border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-white text-blue-600 shadow-sm'
                        : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? (
                      <FaCheckCircle className="text-xs" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className={`font-medium text-xs leading-tight ${isActive ? 'text-white' : 'text-slate-700'}`}>
                    {step.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

StepNavigation.propTypes = {
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string.isRequired
    })
  ).isRequired,
  currentStep: PropTypes.number.isRequired,
  onStepClick: PropTypes.func.isRequired,
  theme: PropTypes.shape({
    primaryColor: PropTypes.string.isRequired
  }).isRequired
};

export { StepNavigation };

