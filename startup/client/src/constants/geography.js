/**
 * Geography is a tree, and a level is what a node is called at its depth —
 * Country over State over City. The list is ordered, so a child offers the
 * level below its parent's without anyone having to pick it.
 *
 * A place that does not fit (a campus, a rig, a route) takes the nearest level
 * and keeps its own name; nothing in the framework reads a level as a rule.
 */
const GEOGRAPHY_LEVELS = ['Country', 'State', 'District', 'City', 'Zone', 'Site'];

/** The level under the given one — what a new child of that node starts as. */
const levelBelow = (level) => {
  const index = GEOGRAPHY_LEVELS.indexOf(level);
  return GEOGRAPHY_LEVELS[Math.min(index + 1, GEOGRAPHY_LEVELS.length - 1)] ?? GEOGRAPHY_LEVELS[0];
};

export { GEOGRAPHY_LEVELS, levelBelow };
