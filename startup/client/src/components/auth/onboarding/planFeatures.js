import { LayoutGrid, BarChart3, Database, Sparkles } from 'lucide-react';
import { getMasterModules } from '@data/getMasterModules';
import { getAppModuleDefinitions } from '@data/getAppModules';
import { reports as reportModules } from '@data/getReportModules';
import { getModulePermissionName } from '@data/getModulePermissionName';
import { organizePermissions } from '@startup/components/admin/role_permissions/utils/permissionUtils';


const GROUP_ORDER = ['App Modules', 'Reports', 'Master Modules', 'Other'];

const GROUP_STYLE = {
  'App Modules': { badge: 'bg-blue-50 text-blue-600', icon: LayoutGrid },
  Reports: { badge: 'bg-amber-50 text-amber-700', icon: BarChart3 },
  'Master Modules': { badge: 'bg-violet-50 text-violet-600', icon: Database },
  Other: { badge: 'bg-gray-100 text-gray-500', icon: Sparkles }
};

const styleFor = (group) => GROUP_STYLE[group] || GROUP_STYLE.Other;

const noop = () => {};

// Each navigator section paired with the @data definitions it draws from and
// the plan-card group label. Every definition carries its own title/icon/colour/
// category, so nothing is synthesised here.
const FEATURE_SECTIONS = [
  { group: 'App Modules', defs: getAppModuleDefinitions },
  { group: 'Reports', defs: () => reportModules },
  { group: 'Master Modules', defs: () => getMasterModules(noop) }
];

/**
 * Build a plan's feature list. App modules, reports and masters come from the
 * navigator's @data definitions (rich title / icon / colour / category, so the
 * preview matches the live navigator). The leftover permissions — those the
 * navigator's own `organizePermissions` buckets as "other" (no module/report/
 * master) — are surfaced under "Other" with their display_name + description,
 * exactly like the subscription page's "Other Permissions" section.
 */
const buildPlanFeatures = (permissions = []) => {
  const granted = new Set(permissions.map((permission) => permission.name?.toLowerCase()).filter(Boolean));
  const features = [];

  for (const section of FEATURE_SECTIONS) {
    for (const def of section.defs()) {
      if (!granted.has(getModulePermissionName(def).toLowerCase())) continue;
      features.push({
        name: getModulePermissionName(def),
        label: def.title,
        group: section.group,
        icon: def.icon,
        color: def.color,
        category: def.category
      });
    }
  }

  for (const permission of organizePermissions(permissions).other) {
    features.push({
      name: permission.name,
      label: permission.display_name || permission.name,
      description: permission.description || null,
      group: 'Other',
      icon: GROUP_STYLE.Other.icon,
      category: 'Other'
    });
  }

  return features;
};

/** Bucket the flat feature list into navigator-style groups, in a stable order. */
const groupFeatures = (features) => {
  const buckets = features.reduce((acc, feature) => {
    const key = feature.group || 'Other';
    (acc[key] = acc[key] || []).push(feature);
    return acc;
  }, {});
  const orderedKeys = [
    ...GROUP_ORDER.filter((key) => buckets[key]?.length),
    ...Object.keys(buckets).filter((key) => !GROUP_ORDER.includes(key))
  ];
  return orderedKeys.map((group) => ({ group, items: buckets[group] }));
};

export { GROUP_ORDER, GROUP_STYLE, styleFor, groupFeatures, buildPlanFeatures };
