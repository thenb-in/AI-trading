import PropTypes from 'prop-types';
import { Bug, RefreshCw } from 'lucide-react';
import { MasterModal } from '@startup/components/base_components/master';
import { MasterModalActions } from '@startup/components/base_components/master/MasterModalActions';

const DebugReloadDialog = ({ show, debugEnabled, onConfirm, onCancel }) => (
  <MasterModal
    isOpen={show}
    onClose={onCancel}
    maxWidth="sm"
    showAudit={false}
    title={
      <span className="flex items-center gap-2 text-base font-semibold text-gray-900">
        <Bug className="h-5 w-5 text-blue-600" />
        Debug mode turned {debugEnabled ? 'on' : 'off'}
      </span>
    }
    actions={
      <MasterModalActions
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelLabel="Keep current data"
        confirmLabel="Reload data"
        confirmIcon={<RefreshCw className="w-4 h-4 inline mr-2" />}
      />
    }
    sx={{
      '& .MuiDialog-container': { alignItems: 'center' },
      '& .MuiPaper-root': { height: 'auto', maxHeight: '90vh', m: 2 },
    }}
  >
    <p className="text-sm leading-relaxed text-gray-600">
      The data on screen was loaded before this change, so it does not reflect
      the new setting. Reloading re-runs with your current filters.
    </p>
  </MasterModal>
);

DebugReloadDialog.propTypes = {
  show: PropTypes.bool.isRequired,
  debugEnabled: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export { DebugReloadDialog };
