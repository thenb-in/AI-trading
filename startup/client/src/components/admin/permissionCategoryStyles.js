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

export { PERMISSION_CATEGORY_ICONS, PERMISSION_CATEGORY_COLORS };
