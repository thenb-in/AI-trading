import PropTypes from 'prop-types';

// One numbered step: a header and a divided list of rows.
const RuleSection = ({ step, title, hint, count, children }) => (
  <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
    <header className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-3">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
      </div>
      {count > 0 && (
        <span className="flex-shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
          {count}
        </span>
      )}
    </header>
    <div className="divide-y divide-gray-100">{children}</div>
  </section>
);

RuleSection.propTypes = {
  step: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  hint: PropTypes.string,
  count: PropTypes.number,
  children: PropTypes.node
};

export { RuleSection };
