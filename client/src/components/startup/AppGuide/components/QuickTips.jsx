import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { getThemeClasses } from '../utils/themeUtils';

function QuickTips({ tips, theme }) {
  const themeClasses = getThemeClasses(theme.primaryColor);
  if (!tips || tips.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-4 bg-white rounded-lg shadow-sm border border-slate-200 p-4"
    >
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Quick Tips</h3>
      <div className="grid md:grid-cols-2 gap-2.5">
        {tips.map((tip, index) => {
          const Icon = tip.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + index * 0.05 }}
              className="flex items-start space-x-2.5 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors duration-150 border border-slate-200/50"
            >
              <div className={`${themeClasses.iconText} mt-0.5 flex-shrink-0 text-sm`}>
                <Icon />
              </div>
              <span className="text-slate-700 text-xs font-medium leading-relaxed">{tip.text}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

QuickTips.propTypes = {
  tips: PropTypes.arrayOf(
    PropTypes.shape({
      icon: PropTypes.elementType.isRequired,
      text: PropTypes.string.isRequired
    })
  ),
  theme: PropTypes.shape({
    primaryColor: PropTypes.string.isRequired
  }).isRequired
};

export { QuickTips };

