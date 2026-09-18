import { getMasterModules, getMasterCategoryOrder } from './getMasterModules';
import { getModulePermissionName } from './getModulePermissionName';

/**
 * The App Guide's tasks.
 */


const masterTour = (title) => [
  { target: 'master-title', title, body: `Everything in ${title} is kept and managed on this page.` },
  {
    selector: '[data-tour="master-search"] > *',
    title: 'Find a record fast',
    body: 'Type a name, a code or anything else from a record to narrow the list as you type.',
  },
  {
    selector: '[data-tour="master-grid"] [data-grid-row]',
    title: 'Click a row to edit it',
    body: 'Each row is one record. Click a row like this one to open it and change it.',
  },
  {
    title: 'Bring data in and out',
    oneOf: [
      { target: 'master-template', title: 'Start from the template', body: 'Download the sheet with the right columns, fill it in, then import it.' },
      { target: 'grid-export', title: 'Export to Excel', body: 'Download what the grid is showing, with its filters and sorting, as an Excel sheet.' },
    ],
  },
  { target: 'master-import', title: 'Import in bulk', body: 'Upload a filled Excel sheet to add many records at once.' },
  {
    target: 'master-add',
    title: `Add to ${title}`,
    body: 'This opens the form for a new record. Carry on and the guide opens it for you.',
    click: true,
    nextLabel: 'Open the form',
  },
  { fields: 'master-form', title: `The ${title} form`, wait: 4000 },
  {
    target: 'form-save',
    title: 'Save the record',
    body: 'Once the form is filled, this saves it. On a form in sections it first moves you on to the next one.',
  },
];

const buildMasterGuideTask = ({ module, path }, section) => ({
  id: `master-${path}`,
  section,
  group: module.category,
  title: module.title,
  summary: module.description,
  icon: module.icon,
  path: `/admin/master/${path}`,
  permission: module.skipPermissionCheck ? null : getModulePermissionName(module),
  tour: masterTour(module.title),
});


const getMasterGuideTasks = () => {
  const categoryRank = new Map(getMasterCategoryOrder().map(({ name }, index) => [name, index]));
  const rankOf = (module) => categoryRank.get(module.category) ?? categoryRank.size;

  const masters = getMasterModules((path) => path)
    .map((module, index) => ({ module, index, path: module.onClick?.() }))
    .filter(({ path }) => typeof path === 'string' && path.length > 0);

  const setup = masters
    .filter(({ module }) => Number.isFinite(module.onboarding))
    .sort((a, b) => a.module.onboarding - b.module.onboarding);
  const rest = masters
    .filter(({ module }) => !Number.isFinite(module.onboarding))
    .sort((a, b) => rankOf(a.module) - rankOf(b.module) || a.index - b.index);

  return {
    setup: setup.map((master) => buildMasterGuideTask(master, 'setup')),
    masters: rest.map((master) => buildMasterGuideTask(master, 'masters')),
  };
};


const getGuideTasks = () => {
  const { setup, masters } = getMasterGuideTasks();
  return [...setup, ...masters];
};

export { getGuideTasks };
