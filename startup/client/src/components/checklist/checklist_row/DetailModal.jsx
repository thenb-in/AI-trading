import PropTypes from 'prop-types';
import { BaseModal } from '@startup/components/base_components/master/master_modal/BaseModal';
import { ChecklistBreakdown } from '../ChecklistProgress';
import { STATUS_STYLES } from '../constants/checklistConstants';
import { RowActions } from './RowActions';

// Whatever a check wants said about its result beyond the count, as the check
// itself worded it — the framework counts rows and knows nothing of what they are.
const Highlights = ({ result }) => {
  const highlights = result.highlights ?? [];
  if (highlights.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {highlights.map((highlight) => (
        <span key={highlight.key} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-600">
          <span className="font-semibold text-gray-900 tabular-nums">{highlight.value.toLocaleString()}</span>
          {` ${highlight.label.toLowerCase()}`}
        </span>
      ))}
    </div>
  );
};

Highlights.propTypes = {
  result: PropTypes.object.isRequired
};

const Section = ({ title, children }) => (
  <div className="mb-5 last:mb-0">
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{title}</p>
    {children}
  </div>
);

Section.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node
};

const DetailModal = ({ check, result, isOpen, onClose }) => {
  const statusStyles = STATUS_STYLES[check.outstandingStatus] ?? STATUS_STYLES.warn;
  const worklistRows = result.items ?? [];

  const modalTitle = (
    <span className="flex items-center gap-2.5">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${statusStyles.iconWrapper}`}>
        <check.icon className="h-4 w-4 text-white" />
      </span>
      <span className="text-base font-semibold text-gray-900">{check.title}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${statusStyles.badge}`}>
        {result.count}
      </span>
    </span>
  );


  const actions = <RowActions result={result} />;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="md" showAudit={false} actions={actions}>
      <div className="pt-1">
        {check.whyItMatters && <p className="mb-4 text-sm text-gray-600">{check.whyItMatters}</p>}
        <Highlights result={result} />

        {result.breakdown?.length > 0 && (
          <Section title="Where it sits">
            <ChecklistBreakdown status={check.outstandingStatus} breakdown={result.breakdown} />
          </Section>
        )}

        {worklistRows.length > 0 && (
          <Section title={`${result.row_unit ?? 'rows'} to work through`}>
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {worklistRows.map((row, index) => (
                <li key={`${row.id ?? row.label}-${index}`} className="flex items-center gap-2 px-3 py-2 text-xs">
                  <span className="font-medium text-gray-900 truncate">{row.label}</span>
                  {row.code && <span className="shrink-0 text-[10px] text-gray-500">({row.code})</span>}
                  {row.group && <span className="truncate text-[10px] text-gray-500">{`· ${row.group}`}</span>}
                  <span className="ml-auto shrink-0 text-[11px] text-gray-600">{row.detail}</span>
                </li>
              ))}
            </ul>
            {result.truncated && (
              <p className="mt-2 text-[11px] text-gray-500">
                {`Showing the first ${worklistRows.length} of ${result.count} — open the master for the full list.`}
              </p>
            )}
          </Section>
        )}
      </div>
    </BaseModal>
  );
};

DetailModal.propTypes = {
  check: PropTypes.object.isRequired,
  result: PropTypes.object.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export { DetailModal };
