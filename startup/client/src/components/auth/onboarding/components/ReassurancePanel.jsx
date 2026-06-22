import PropTypes from 'prop-types';


function ReassurancePanel({ title, perks }) {
  return (
    <aside className="md:col-span-2 rounded-2xl border border-gray-100 bg-gradient-to-b from-slate-50 to-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{title}</p>
      <ul className="mt-4 space-y-4">
        {perks.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-gray-100">
              <Icon size={15} />
            </span>
            <span className="text-sm leading-relaxed text-gray-600">{text}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

ReassurancePanel.propTypes = {
  title: PropTypes.string.isRequired,
  perks: PropTypes.arrayOf(
    PropTypes.shape({
      icon: PropTypes.elementType.isRequired,
      text: PropTypes.string.isRequired
    })
  ).isRequired
};

export { ReassurancePanel };
