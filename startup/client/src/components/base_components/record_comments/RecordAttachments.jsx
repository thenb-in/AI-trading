import PropTypes from 'prop-types';
import { useCallback, useRef } from 'react';
import { Download, Paperclip, Trash2 } from 'lucide-react';
import { formatBytes, formatDateTime } from '@utils/formattingUtils';
import { downloadDriveFile } from '@startup/components/masters/nbnext_drive_master/downloadDriveFile';

/** One attached file: its name, size, who filed it, and what can be done with it. */
const AttachmentRow = ({ file, onRemove }) => {
  const handleDownload = useCallback(() => downloadDriveFile(file), [file]);
  const handleRemove = useCallback(() => onRemove(file), [onRemove, file]);

  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className="flex min-w-0 items-center gap-2">
        <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0">
          <span className="block truncate text-sm text-slate-800">{file.fileName}</span>
          <span className="block text-xs text-slate-500">
            {formatBytes(file.fileSize)} · {file.createdByName || 'Unknown'} · {formatDateTime(file.createdAt)}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={handleDownload} title={`Download ${file.fileName}`} className="text-slate-400 hover:text-indigo-600">
          <Download className="h-4 w-4" />
        </button>
        <button type="button" onClick={handleRemove} title={`Remove ${file.fileName}`} className="text-slate-400 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </button>
      </span>
    </li>
  );
};

AttachmentRow.propTypes = {
  file: PropTypes.object.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * The files filed against this record. They are ordinary NBnext Drive files
 * tagged with the record they belong to, so they are already searchable,
 * downloadable and governed wherever Drive files are — this is only the view of
 * them that sits with the record itself.
 */
const RecordAttachments = ({ files, saving, onAttach, onRemove }) => {
  const inputRef = useRef(null);

  const handlePick = useCallback(() => inputRef.current?.click(), []);

  const handleChange = useCallback((event) => {
    const [file] = event.target.files || [];
    if (file) {
      onAttach(file);
    }
    // Clearing it lets the same file be picked again after a failed upload.
    event.target.value = '';
  }, [onAttach]);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          Attachments <span className="font-normal text-slate-500">({files.length})</span>
        </h3>
        <button
          type="button"
          onClick={handlePick}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Attach a file
        </button>
        <input ref={inputRef} type="file" onChange={handleChange} className="hidden" />
      </div>
      {files.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
          Nothing attached yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <AttachmentRow key={file.id} file={file} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </section>
  );
};

RecordAttachments.propTypes = {
  files: PropTypes.array.isRequired,
  saving: PropTypes.bool,
  onAttach: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export { RecordAttachments };
