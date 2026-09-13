import PropTypes from 'prop-types';
import { FilesSection } from '@/components/masters/nbnext_drive_master/FilesSection';
import {
  HELP_SUPPORT_CATEGORIES,
  HELP_SUPPORT_PRIORITIES
} from './helpSupportConstants';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';
import { TextareaTypeField } from '@startup/components/base_components/fields/TextareaTypeField';

const PRIORITY_OPTIONS = HELP_SUPPORT_PRIORITIES.map((priority) => ({
  value: priority,
  label: priority
}));
const CATEGORY_OPTIONS = HELP_SUPPORT_CATEGORIES.map((category) => ({
  value: category,
  label: category
}));

function HelpSupportTicketForm({
  formData,
  onFieldChange,
  attachments,
  onAttachmentsChange,
  onSubmit,
  isSubmitting,
  screenshotCaptured
}) {
  const handlePriorityChange = (value) => onFieldChange('priority', value);
  const handleCategoryChange = (value) => onFieldChange('category', value);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">Ticket Details</h2>
        <p className="mt-1 text-sm text-gray-500">
          Share the issue clearly so support can reproduce and resolve it faster.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="ticket-page-url">
              Page URL
            </label>
            <input
              id="ticket-page-url"
              type="url"
              value={formData.pageUrl}
              onChange={(e) => onFieldChange('pageUrl', e.target.value)}
              placeholder="https://example.com/admin/users?tab=active"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Priority
            </label>
            <SearchableDropdown
              options={PRIORITY_OPTIONS}
              selectedValues={formData.priority}
              onChange={handlePriorityChange}
              placeholder="Select priority"
              multiple={false}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Category
            </label>
            <SearchableDropdown
              options={CATEGORY_OPTIONS}
              selectedValues={formData.category}
              onChange={handleCategoryChange}
              placeholder="Select category"
              multiple={false}
            />
          </div>
        </div>

        {screenshotCaptured && (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="ticket-comment">
              Comment
            </label>
            <textarea
              id="ticket-comment"
              value={formData.comment}
              onChange={(e) => onFieldChange('comment', e.target.value)}
              rows={5}
              placeholder="Describe what happened, expected behavior, and any steps to reproduce."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        <div className="mt-4">
          <TextareaTypeField
            id="ticket-logs"
            label="Captured Console Logs"
            value={formData.logs}
            rows={8}
            readOnly
            placeholder="Logs auto-filled from current screen context."
            className="text-xs font-mono"
          />
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !screenshotCaptured}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Opening Ticket...' : 'Open Ticket'}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col">
        <h3 className="text-base font-semibold text-gray-800">Attachments</h3>
        <p className="mt-1 text-sm text-gray-500">
          Add screenshot and any additional files that help support.
        </p>
        <div className="mt-4">
          <FilesSection
            selectedFiles={attachments}
            onFileChange={onAttachmentsChange}
            accept="*/*"
            hint="Any file type supported (max 100MB)"
            showCamera={false}
            multiple
          />
        </div>
      </section>
    </div>
  );
}

HelpSupportTicketForm.propTypes = {
  formData: PropTypes.shape({
    pageUrl: PropTypes.string.isRequired,
    priority: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    comment: PropTypes.string.isRequired,
    logs: PropTypes.string.isRequired
  }).isRequired,
  onFieldChange: PropTypes.func.isRequired,
  attachments: PropTypes.arrayOf(PropTypes.instanceOf(File)).isRequired,
  onAttachmentsChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  screenshotCaptured: PropTypes.bool.isRequired
};

export { HelpSupportTicketForm };
