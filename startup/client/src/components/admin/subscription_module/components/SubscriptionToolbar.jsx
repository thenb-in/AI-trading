import { FileTypeField } from '@startup/components/base_components/fields/FileTypeField';
import PropTypes from 'prop-types';
import { Loader2, Plus, Download, Upload, UploadCloud, Check, Sparkles } from 'lucide-react';

/** Header action row: Generate missing / Export / Import / Push to wallet / Add Subscription. Pure presentation. */
function SubscriptionToolbar({
  canExport,
  isExporting,
  isImporting,
  showPush,
  canPush,
  isPushed,
  isPushing,
  onPush,
  onBackfill,
  isBackfilling,
  importFileRef,
  onExport,
  onImportClick,
  onImportFile,
  onAdd,
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onBackfill}
        disabled={isBackfilling}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="For every plan, add the permissions a subscribed master is missing (e.g. new comment/attachment rights). Only adds what is absent."
      >
        {isBackfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        Generate missing
      </button>
      <button
        onClick={onExport}
        disabled={!canExport || isExporting}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={canExport ? 'Export the selected subscription' : 'Select a subscription to export'}
      >
        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Export
      </button>
      <button
        onClick={onImportClick}
        disabled={isImporting}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Import a subscription JSON file"
      >
        {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Import
      </button>
      <FileTypeField
        inputRef={importFileRef}
        accept="application/json,.json"
        onChange={onImportFile}
        fileChangeMode="native"
        containerClassName="hidden"
      />
      {/* Hidden when no wallet is configured (APP_KEY empty) */}
      {showPush && <button
        onClick={onPush}
        disabled={!canPush || isPushed || isPushing}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors disabled:cursor-not-allowed ${
          isPushed
            ? 'text-green-700 bg-green-50 disabled:opacity-100'
            : 'text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50'
        }`}
        title={
          isPushed
            ? 'Plan already pushed to wallet'
            : canPush
              ? 'Push this plan to the wallet'
              : 'Select a subscription to push'
        }
      >
        {isPushing
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : isPushed
            ? <Check className="w-4 h-4" />
            : <UploadCloud className="w-4 h-4" />}
        {isPushed ? 'Pushed' : 'Push to wallet'}
      </button>}
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Subscription
      </button>
    </div>
  );
}

SubscriptionToolbar.propTypes = {
  canExport: PropTypes.bool,
  isExporting: PropTypes.bool,
  isImporting: PropTypes.bool,
  showPush: PropTypes.bool,
  canPush: PropTypes.bool,
  isPushed: PropTypes.bool,
  isPushing: PropTypes.bool,
  onPush: PropTypes.func.isRequired,
  onBackfill: PropTypes.func.isRequired,
  isBackfilling: PropTypes.bool,
  importFileRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  onExport: PropTypes.func.isRequired,
  onImportClick: PropTypes.func.isRequired,
  onImportFile: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
};

export { SubscriptionToolbar };
