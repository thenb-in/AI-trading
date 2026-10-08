import PropTypes from 'prop-types';

const TONES = {
  plain: { card: 'border-gray-200 bg-white', icon: 'bg-indigo-50 text-indigo-600', subtitle: 'text-gray-500' },
  accent: {
    card: 'border-indigo-100 bg-gradient-to-r from-indigo-50 to-slate-50',
    icon: 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100',
    subtitle: 'text-slate-600',
  },
};

const BaseSectionCard = ({ icon: Icon, title, subtitle, titleFor, action, tone = 'plain', children }) => {
  const styles = TONES[tone];
  const TitleTag = titleFor ? 'label' : 'h4';

  return (
    <section className={`rounded-lg border p-4 mb-4 ${styles.card}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${styles.icon}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <TitleTag htmlFor={titleFor} className="block text-sm font-semibold text-gray-900">{title}</TitleTag>
            {subtitle && <p className={`text-xs ${styles.subtitle}`}>{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {children && <div className="mt-4">{children}</div>}
    </section>
  );
};

BaseSectionCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  titleFor: PropTypes.string,
  action: PropTypes.node,
  tone: PropTypes.oneOf(Object.keys(TONES)),
  children: PropTypes.node,
};

export { BaseSectionCard };
