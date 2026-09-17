import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { MapPin, Pencil, Plus, Trash2, Globe } from 'lucide-react';

import { OrgChart } from '@startup/components/base_components/org_chart/OrgChart';
import { buildNodes } from '@startup/components/base_components/org_chart/buildNodes';
import { orgChartNode } from '@startup/components/base_components/org_chart/orgChartNode';

// Flat rows -> rows that hold their children, which is what buildNodes walks.
const nest = (rows) => {
  const byId = new Map(rows.map((row) => [row.id, { ...row, children: [] }]));
  const roots = [];
  byId.forEach((node) => {
    const parent = node.parent_id == null ? null : byId.get(node.parent_id);
    (parent ? parent.children : roots).push(node);
  });
  return roots;
};

const places = (count) => `${count} ${count === 1 ? 'place' : 'places'}`;

const GeographyTree = ({ rows, canCreate, canUpdate, canDelete, onAdd, onEdit, onDelete }) => {
  const root = useMemo(() => {
    const cards = buildNodes(nest(rows), (row, { id, children }) => orgChartNode({
      id,
      title: row.name,
      subtitle: row.level,
      icon: MapPin,
      tone: row.is_active ? 'branch' : 'neutral',
      stat: [row.code, children.length > 0 && places(children.length)],
      status: row.is_active ? undefined : { label: 'Not in use', tone: 'warn' },
      children,
      actions: [
        canCreate && { id: 'add', title: `Add a place under ${row.name}`, icon: Plus, tone: 'primary', onClick: () => onAdd(row) },
        canUpdate && { id: 'edit', title: `Edit ${row.name}`, icon: Pencil, onClick: () => onEdit(row) },
        canDelete && children.length === 0
          && { id: 'delete', title: `Delete ${row.name}`, icon: Trash2, tone: 'danger', onClick: () => onDelete(row) }
      ],
      data: row
    }), { prefix: 'place' });

    // The chart draws one top card; geography has as many top places as there
    // are countries, so they hang off a card standing for the company itself.
    return orgChartNode({
      id: 'geography-root',
      title: 'All places',
      subtitle: places(rows.length),
      icon: Globe,
      tone: 'root',
      childrenLabel: 'Top level',
      children: cards,
      actions: [canCreate && { id: 'add', title: 'Add a top level place', icon: Plus, tone: 'primary', onClick: () => onAdd(null) }]
    });
  }, [rows, canCreate, canUpdate, canDelete, onAdd, onEdit, onDelete]);

  const openLeaf = (node) => {
    if (node.data && canUpdate) {
      onEdit(node.data);
    }
  };

  return (
    <div className="h-[70vh]">
      <OrgChart
        root={root}
        onSelect={openLeaf}
        searchPlaceholder="Search places..."
        emptyText="No places yet. Add a country to start the tree."
      />
    </div>
  );
};

GeographyTree.propTypes = {
  rows: PropTypes.array.isRequired,
  canCreate: PropTypes.bool,
  canUpdate: PropTypes.bool,
  canDelete: PropTypes.bool,
  /** (parentRow | null) => void — opens the form for a new child of that place. */
  onAdd: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export { GeographyTree };
