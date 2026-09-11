/** ['3 positions', null, '17 people'] -> '3 positions · 17 people'; a string passes through. */
const line = (parts) => {
  const text = Array.isArray(parts) ? parts.filter(Boolean).join(' · ') : parts;
  return text || undefined;
};

/**
 * One OrgChart card, from plain values.
 *
 * The chart's own shapes live here — the dotted stat line, the status pill, the
 * ghost look, the action buttons — so an app says what it has and never how the
 * chart reads it.
 *
 *   orgChartNode({
 *     id, title: department.dept_name, icon: Building, tone: 'branch',
 *     stat: [plural(seats, 'position'), plural(people, 'person', 'people')],
 *     actions: [canManage && { id: 'add', title: 'Add a position', icon: Plus, onClick }],
 *     children,
 *   })
 *
 * `showChildren` draws this card's children under it instead of waiting for a
 * click. Set it only where the children are few and worth seeing at once — the
 * chart otherwise shows one level at a time on purpose.
 *
 * `stat` and `meta` take a list and join it. `actions` drops falsy entries, so a
 * caller gates one inline instead of rebuilding the list. `kind` and `data` are
 * the app's own — the chart carries them back untouched on expand and select.
 */
const orgChartNode = ({
  id,
  title,
  subtitle,
  icon,
  tone = 'neutral',
  stat,
  status,
  meta,
  detail,
  ghost = false,
  lazy = false,
  childrenLabel,
  children = [],
  showChildren = false,
  actions = [],
  kind,
  data,
}) => ({
  id,
  title,
  subtitle,
  icon,
  tone,
  stat: line(stat),
  status: status || undefined,
  meta: line(meta),
  detail,
  variant: ghost ? 'ghost' : undefined,
  lazy,
  childrenLabel,
  children,
  showChildren,
  actions: actions.filter(Boolean),
  kind,
  data,
});

export { orgChartNode };
