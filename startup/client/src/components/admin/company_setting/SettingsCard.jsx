import PropTypes from "prop-types";


const SettingsCard = ({ icon: Icon, title, subtitle, actions = null, children, className = "", bodyClassName = "" }) => (
  <section className={`bg-white border border-gray-200 rounded-xl shadow-sm break-inside-avoid ${className}`}>
    <header className="flex items-start gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
      {Icon ? (
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
          <Icon className="w-4 h-4" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {subtitle ? <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{subtitle}</p> : null}
      </div>
      {actions}
    </header>
    <div className={`p-4 sm:p-5 ${bodyClassName}`}>{children}</div>
  </section>
);

SettingsCard.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  actions: PropTypes.node,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  bodyClassName: PropTypes.string,
};

export { SettingsCard };
