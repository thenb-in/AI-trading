import PropTypes from 'prop-types';
import { Crown } from 'lucide-react';
import { MasterModal } from '@startup/components/base_components/master/master_modal/MasterModal';
import { ModuleGrid } from '@/pages/navigator/components/ModuleGrid';
import { groupFeatures } from './planFeatures';
import { planShape } from './types';

const noop = () => {};

// Plan preview: every feature is accessible/subscribed, so accessible == total.
const allAccessibleStats = (count) => ({ total: count, accessible: count, restricted: 0 });

/**
 * Shape a plan feature into the `module` object the navigator's ModuleCard
 * expects. The feature is already a navigator @data definition (title, icon,
 * colour, category resolved in buildPlanFeatures), so cards look exactly like
 * the live navigator.
 */
const toModule = (feature) => ({
  id: feature.name,
  icon: feature.icon,
  title: feature.label,
  description: feature.description,
  category: feature.category,
  color: feature.color,
  permissionName: feature.name,
  hasAccess: true,
  hasPermissionAccess: true,
  isSubscribed: true
});

/**
 * "View all features" modal for a plan. Renders the in-app Application
 * Navigator's own ModuleGrid (which uses ModuleCard) so it is identical to the
 * live navigator and stays in sync with it. We only feed it the plan's features
 * mapped into the App Modules / Reports / Master Modules buckets — the
 * navigator's data hook is not reused because it is scoped to the logged-in
 * user's permissions/subscription, whereas this is a public plan preview.
 */
function PlanFeaturesModal({ isOpen, onClose, plan }) {
  const groups = groupFeatures(plan.features);
  const itemsFor = (group) => groups.find((entry) => entry.group === group)?.items || [];
  const mapGroup = (group) => itemsFor(group).map(toModule);

  const appModules = mapGroup('App Modules');
  const masters = mapGroup('Master Modules');
  const reports = mapGroup('Reports');
  // Permissions with no module/report/master definition get their own section,
  // like the subscription page's "Other Permissions".
  const other = mapGroup('Other');

  // Title node: the plan (subscription) name with its description / feature
  // count beneath it — not a hardcoded label.
  const title = (
    <div className="min-w-0 mb-4">
      <h2 className="flex items-center gap-1.5 truncate text-lg font-bold text-gray-800">
        <Crown className="h-5 w-5 shrink-0 text-amber-400" fill="currentColor" />
        <span className="truncate">{plan.name}</span>
      </h2>
      <p className="truncate text-xs font-normal text-gray-500">
        {plan.description || `${plan.features.length} features included in this plan`}
      </p>
    </div>
  );

  return (
    <MasterModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="lg" showAudit={false}>
      <ModuleGrid
        appModules={appModules}
        masters={masters}
        reports={reports}
        other={other}
        appModuleStats={allAccessibleStats(appModules.length)}
        masterStats={allAccessibleStats(masters.length)}
        reportStats={allAccessibleStats(reports.length)}
        onAppModuleClick={noop}
        onMasterClick={noop}
        onReportClick={noop}
        onOtherClick={noop}
        searchTerm=""
        gridColsClassName="grid-cols-2 sm:grid-cols-4"
      />
    </MasterModal>
  );
}

PlanFeaturesModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  plan: planShape.isRequired
};

export { PlanFeaturesModal };
