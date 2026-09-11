import PropTypes from 'prop-types';
import { CHANNEL_TONES } from '../../constants';

// A channel you turn on. Colour only when on, so the on ones stand out.
const ChannelTile = ({ icon: Icon, label, enabled, tone, onToggle }) => {
  const look = CHANNEL_TONES[tone];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 px-4 py-5 transition-all ${
        enabled
          ? `${look.on} shadow-sm`
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <Icon className={enabled ? look.icon : 'text-gray-400'} fontSize="large" />
      <span className={`text-sm font-semibold ${enabled ? look.text : 'text-gray-500'}`}>
        {label}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
          enabled ? look.chip : 'bg-gray-100 text-gray-400'
        }`}
      >
        {enabled ? 'On' : 'Off'}
      </span>
    </button>
  );
};

ChannelTile.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  enabled: PropTypes.bool,
  tone: PropTypes.oneOf(Object.keys(CHANNEL_TONES)).isRequired,
  onToggle: PropTypes.func.isRequired
};

export { ChannelTile };
