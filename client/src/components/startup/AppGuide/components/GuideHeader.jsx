import PropTypes from 'prop-types';
import { FaTimes } from 'react-icons/fa';

function GuideHeader({ config, userName, onClose }) {
  const { title, subtitle, subtitleSuffix, icon: Icon, showCloseButton, gradientColors } = config.header;

  return (
    <div className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-[1600px] mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`bg-gradient-to-br ${gradientColors.from} ${gradientColors.to} rounded-lg p-2 shadow-sm`}>
              <Icon className="text-lg text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white mb-0 leading-tight">{title}</h1>
              <p className="text-xs text-gray-300 font-normal">
                {subtitle(userName)} {subtitleSuffix}
              </p>
            </div>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg p-1.5 transition-all duration-150"
              aria-label="Close guide"
            >
              <FaTimes className="text-base" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

GuideHeader.propTypes = {
  config: PropTypes.shape({
    header: PropTypes.shape({
      title: PropTypes.string.isRequired,
      subtitle: PropTypes.func.isRequired,
      subtitleSuffix: PropTypes.string.isRequired,
      icon: PropTypes.elementType.isRequired,
      showCloseButton: PropTypes.bool.isRequired,
      gradientColors: PropTypes.shape({
        from: PropTypes.string.isRequired,
        to: PropTypes.string.isRequired
      }).isRequired
    }).isRequired
  }).isRequired,
  userName: PropTypes.string,
  onClose: PropTypes.func.isRequired
};

export { GuideHeader };

