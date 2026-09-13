import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import { PREVIEWABLE_FORMAT_GROUPS } from '@utils/file_management/fileTypeUtils';

/**
 * Unsupported File Viewer Component
 * Displays a friendly message when a file preview is unavailable, along with
 * the formats that do preview so the user knows what to expect next time.
 */
const UnsupportedViewer = ({ fileType, fileName, onDownload }) => {
  // Name the file we actually refused wherever we can, so a support engineer
  // reading a screenshot can tell which file and which type were involved
  // instead of guessing from a generic sentence.
  // A title like "Report v1.2 Draft" also contains a dot, so only a short
  // alphanumeric tail counts as an extension; anything else falls back to the
  // detected type, and failing that to the generic wording.
  const tail = fileName?.includes('.') ? fileName.split('.').pop() : '';
  const extension = /^[a-z0-9]{1,5}$/i.test(tail) ? tail.toUpperCase() : '';
  const subject = extension || (fileType && fileType !== 'unknown' ? fileType.toUpperCase() : '');

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 p-8 overflow-auto">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4 text-gray-400">📄</div>
        <h2 className="text-lg font-medium text-gray-700 mb-2">
          Preview Not Available
        </h2>
        <p className="text-sm text-gray-500">
          {subject
            ? `${subject} files are currently not supported for preview.`
            : 'This file type is currently not supported for preview.'}
          {' '}Download the file to open it in another application.
        </p>

        {/* Block-level and centred with flex rather than an inline-block: an
            inline-level list would share a line with the button below it and
            the two would collide. */}
        <div className="mt-5 flex flex-col items-center">
          <p className="text-xs font-medium text-gray-600 mb-2">
            Formats you can preview here:
          </p>
          <dl className="space-y-1 text-left">
            {PREVIEWABLE_FORMAT_GROUPS.map(({ label, extensions }) => (
              <div key={label} className="flex gap-2 text-xs">
                <dt className="text-gray-500 w-20 shrink-0">{label}</dt>
                <dd className="text-gray-700 break-words">
                  {extensions.map((ext) => ext.toUpperCase()).join(', ')}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Support for additional formats will be added soon.
        </p>

        {onDownload && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

UnsupportedViewer.propTypes = {
  fileType: PropTypes.string,
  fileName: PropTypes.string,
  // Omitted by callers that have no download to offer, or whose user lacks the
  // permission for it — the button is simply absent then.
  onDownload: PropTypes.func,
};

export { UnsupportedViewer };
