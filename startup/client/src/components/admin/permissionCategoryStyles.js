import { Layers, FileText, Database, AlertTriangle } from 'lucide-react';

/** Lucide icon for each permission category. */
const PERMISSION_CATEGORY_ICONS = {
  module: Layers,
  report: FileText,
  master: Database,
  other: AlertTriangle,
};

/** Background + border classes for each permission-category card. */
const PERMISSION_CATEGORY_COLORS = {
  module: 'bg-blue-50 border-blue-200',
  report: 'bg-purple-50 border-purple-200',
  master: 'bg-green-50 border-green-200',
  other: 'bg-yellow-50 border-yellow-200',
};

/**
 * How a permission no constant declares is marked wherever it appears — in the
 * same red as the delete button that clears it, so the mark and the action read
 * as one thing. Red is free: no category card uses it, so the mark stands out
 * inside all four of them.
 */
const UNDECLARED_PERMISSION_STYLES = {
  /** Tint for a whole row or a sticky cell, which must stay opaque. */
  tint: 'bg-red-50',
  /** Border for a bordered chip. */
  border: 'border-red-300',
  /** The permission's own words. */
  text: 'text-red-700',
  /** A single checkbox among declared ones, in a crowded table cell. */
  mark: 'rounded bg-red-50 px-0.5 ring-1 ring-red-300',
};

export { PERMISSION_CATEGORY_ICONS, PERMISSION_CATEGORY_COLORS, UNDECLARED_PERMISSION_STYLES };
