import PropTypes from 'prop-types';
import { CHANNEL_TONES } from '../../constants';

// One open channel's fields, behind a rail in its own colour.
const ChannelFields = ({ icon: Icon, label, tone, children }) => (
  <div className="px-4 py-4">
    <div className={`border-l-4 pl-4 ${CHANNEL_TONES[tone].rail}`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={CHANNEL_TONES[tone].icon} fontSize="small" />
        <span className="text-sm font-semibold text-gray-800">{label}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  </div>
);

ChannelFields.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  tone: PropTypes.oneOf(Object.keys(CHANNEL_TONES)).isRequired,
  children: PropTypes.node
};

export { ChannelFields };
