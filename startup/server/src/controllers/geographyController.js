const geographyService = require('../services/geographyService');
const { formatResponse, plain } = require('../data_formatters/formatResponse');
const geographyColumns = require('../constants/columns/geographyColumns');

/** What the form sends, as the model spells it. */
const toModelAttributes = (payload = {}) => ({
  name: payload.name,
  code: payload.code || null,
  level: payload.level,
  parentId: payload.parent_id ?? null,
  isActive: payload.is_active ?? true
});

/**
 * Flat rows in, the tree out: depth first, each place carrying how deep it
 * sits, the places above it, and how many sit directly under it. The grid reads
 * a list and the tree view rebuilds the nesting, so both are served by one walk.
 *
 * A place whose parent is not in the set is treated as a top level one rather
 * than dropped — a row nobody can see is worse than a row in the wrong place.
 */
function asTree(rows) {
  const rootKey = 'root';
  const ids = new Set(rows.map((row) => String(row.id)));
  const childrenOf = new Map();
  rows.forEach((row) => {
    const parentKey = String(row.parentId ?? '');
    const parent = ids.has(parentKey) ? parentKey : rootKey;
    childrenOf.set(parent, [...(childrenOf.get(parent) || []), row]);
  });

  const ordered = [];
  const walk = (parentKey, depth, trail) => {
    (childrenOf.get(parentKey) || []).forEach((row) => {
      const trailHere = [...trail, row.name];
      ordered.push({
        id: row.id,
        parent_id: row.parentId,
        name: row.name,
        code: row.code,
        level: row.level,
        is_active: row.isActive,
        depth,
        path: trailHere.join(' > '),
        childCount: (childrenOf.get(String(row.id)) || []).length
      });
      walk(String(row.id), depth + 1, trailHere);
    });
  };
  walk(rootKey, 0, []);
  return ordered;
}

const geographyController = {
  async list(companyId) {
    const rows = await geographyService.listForCompany(companyId);
    return formatResponse(asTree(rows.map(plain)), geographyColumns, (row) => row);
  },

  async create(payload, companyId, userId) {
    const row = await geographyService.create(toModelAttributes(payload), companyId, userId);
    return plain(row);
  },

  async update(id, companyId, payload) {
    const updated = await geographyService.update(id, companyId, toModelAttributes(payload));
    if (!updated) {
      return null;
    }
    return plain(await geographyService.getById(id, companyId));
  },

  /**
   * Deleting a place that holds others would orphan them, so it is refused and
   * says why — the caller is being asked to empty it first, not told "no".
   */
  async remove(id, companyId) {
    const place = await geographyService.getById(id, companyId);
    if (!place) {
      return { removed: false, reason: null };
    }
    const children = await geographyService.countChildren(id, companyId);
    if (children > 0) {
      return { removed: false, reason: `${place.name} still holds ${children} place(s). Move or delete those first.` };
    }
    await geographyService.remove(id, companyId);
    return { removed: true, name: place.name };
  }
};

module.exports = geographyController;
