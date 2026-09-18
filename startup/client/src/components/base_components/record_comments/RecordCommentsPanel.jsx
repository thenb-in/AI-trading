import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { useDataContext } from '@context/useDataContext';
import { useRecordComments } from './useRecordComments';
import { RecordCommentItem } from './RecordCommentItem';
import { RecordAttachments } from './RecordAttachments';

/**
 * What is attached to one record, and what people have said about it. It sits
 * at the foot of the record's own modal, under the form and its buttons, so
 * the discussion is part of looking at the record rather than a trip away
 * from it.
 *
 * It needs nothing from the master it sits in beyond the record's identity —
 * which master, and which row — so every form modal already has what it asks
 * for, and no master has to opt in.
 *
 * Anyone who can open the record can read and add to it, as with the record's
 * history; a comment can be deleted by whoever wrote it.
 */
const RecordCommentsPanel = ({ objectName, objectId }) => {
  const { userData } = useDataContext();
  const [draft, setDraft] = useState('');
  const {
    comments, attachments, loading, saving,
    addComment, deleteComment, attachFile, removeAttachment
  } = useRecordComments(objectName, objectId);

  const handleDraftChange = useCallback((event) => setDraft(event.target.value), []);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    if (await addComment(body)) {
      setDraft('');
    }
  }, [draft, addComment]);

  // Enter starts a new line and Shift+Enter posts. A note on a record is
  // written, not chatted — losing half a thought to a stray Enter costs more
  // than the extra key does.
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && event.shiftKey) {
      handleSubmit(event);
    }
  }, [handleSubmit]);

  if (loading) {
    return (
      <p className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <RecordAttachments
        files={attachments}
        saving={saving}
        onAttach={attachFile}
        onRemove={removeAttachment}
      />

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">
          Comments <span className="font-normal text-slate-500">({comments.length})</span>
        </h3>

        <form onSubmit={handleSubmit} className="mb-3 flex items-end gap-2">
          <textarea
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Add a comment. Shift+Enter to post."
            className="min-h-[44px] flex-1 resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={saving || !draft.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post
          </button>
        </form>

        {comments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
            No comments yet. The first one is yours.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {comments.map((comment) => (
              <RecordCommentItem
                key={comment.id}
                comment={comment}
                canDelete={comment.createdBy === userData?.id}
                onDelete={deleteComment}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

RecordCommentsPanel.propTypes = {
  /** What kind of record this is — the master's name, e.g. "Notification Rule". */
  objectName: PropTypes.string.isRequired,
  objectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export { RecordCommentsPanel };
