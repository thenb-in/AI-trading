import PropTypes from 'prop-types';
import { useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { formatDateTime } from '@utils/formattingUtils';

/** One comment: who said it, when, and what — with a way out for its author. */
const RecordCommentItem = ({ comment, canDelete, onDelete }) => {
  const handleDelete = useCallback(() => onDelete(comment.id), [onDelete, comment.id]);

  return (
    <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{comment.authorName || 'Unknown'}</span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{formatDateTime(comment.createdAt)}</span>
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              title="Delete this comment"
              aria-label="Delete this comment"
              className="text-slate-400 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{comment.body}</p>
    </li>
  );
};

RecordCommentItem.propTypes = {
  comment: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    body: PropTypes.string,
    authorName: PropTypes.string,
    createdAt: PropTypes.string,
  }).isRequired,
  canDelete: PropTypes.bool,
  onDelete: PropTypes.func.isRequired,
};

export { RecordCommentItem };
