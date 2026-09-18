import { findAnchor, isVisible } from './findOnPage';


const TAB_FIELDS_WAIT_MS = 5000;
let discoveryRun = 0;


const describeField = (isRequired, hint) => {
  const text = (hint || '').trim();
  const sentence = text && !/[.!?]$/.test(text) ? `${text}.` : text;
  return [isRequired ? 'Required.' : 'Optional.', sentence].filter(Boolean).join(' ');
};


const closedTabSteps = (formAnchor, label, index) => [
  {
    selector: `[data-tour-tab="${index}"]`,
    title: label,
    body: `Opens the ${label} section.`,
    click: true,
    nextLabel: `Open ${label}`,
  },
  { fields: formAnchor, tab: index, title: `${label} fields`, wait: TAB_FIELDS_WAIT_MS },
];


const buildFieldSteps = (formAnchor) => {
  const scope = findAnchor(formAnchor);
  if (!scope) return [];

  discoveryRun += 1;
  const run = discoveryRun;

  return [...scope.querySelectorAll('label')]
    .filter(isVisible)
    .map((label, index) => {
      const name = label.textContent.replace('*', '').trim();
      if (!name) return null;

      const box = label.parentElement || label;
      const control = (label.htmlFor && scope.querySelector(`[id="${CSS.escape(label.htmlFor)}"]`))
        || box.querySelector('input, select, textarea');
      const key = `${run}-${index}`;
      box.setAttribute('data-tour-field', key);

      return {
        selector: `[data-tour-field="${key}"]`,
        title: name,
        body: describeField(
          label.textContent.includes('*') || Boolean(control?.required),
          box.querySelector('p')?.textContent || control?.getAttribute('placeholder'),
        ),
      };
    })
    .filter(Boolean);
};

// Whether the form tab tagged `tabIndex` is the one open right now.
const isTabOpen = (tabIndex) => [...document.querySelectorAll(`[data-tour-tab="${tabIndex}"]`)]
  .some((tab) => isVisible(tab) && tab.getAttribute('aria-selected') === 'true');

// Every step for a whole form, a tabbed one walked tab by tab starting from the tab already open.
const buildFormSteps = (formAnchor) => {
  const scope = findAnchor(formAnchor);
  if (!scope) return [];

  const tabs = [...scope.querySelectorAll('[role="tab"]')].filter(isVisible);
  if (tabs.length < 2) return buildFieldSteps(formAnchor);

  const labels = tabs.map((tab) => tab.textContent.trim());
  tabs.forEach((tab, index) => tab.setAttribute('data-tour-tab', String(index)));
  const bar = tabs[0].closest('nav') || tabs[0].closest('[role="tablist"]') || tabs[0].parentElement;
  bar.setAttribute('data-tour-tabs', '');

  const open = Math.max(0, tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'));
  const order = [...tabs.keys()];

  return [
    {
      selector: '[data-tour-tabs]',
      title: 'Sections of this form',
      body: `This form is split into ${tabs.length} sections: ${labels.join(', ')}. The guide goes through each one.`,
    },
    ...[...order.slice(open), ...order.slice(0, open)].flatMap((index) => (index === open
      ? buildFieldSteps(formAnchor)
      : closedTabSteps(formAnchor, labels[index], index))),
  ];
};

export { buildFieldSteps, buildFormSteps, isTabOpen };
