import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Headset } from 'lucide-react';
import { HelpSupportTicketForm } from './HelpSupportTicketForm';
import { helpSupportDraftService } from '@utils/startup/helpSupportDraftService';
import { HELP_SUPPORT_INITIAL_FORM } from './helpSupportConstants';
import { ApiService } from '@services/startup/ApiService';

function HelpSupportPage() {
  const [formData, setFormData] = useState(HELP_SUPPORT_INITIAL_FORM);
  const [attachments, setAttachments] = useState([]);
  const [screenshotCaptured, setScreenshotCaptured] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const draft = helpSupportDraftService.consumeDraft();
    if (!draft) return;

    if (draft.screenshotFile instanceof File) {
      setAttachments((prev) => [draft.screenshotFile, ...prev]);
      setScreenshotCaptured(true);
    }

    const nextPageUrl = draft.sourceUrl || draft.sourcePath || '';
    setFormData((prev) => ({
      ...prev,
      pageUrl: nextPageUrl || prev.pageUrl,
      logs: draft.logs || prev.logs
    }));
  }, []);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAttachmentsChange = (filesOrNull) => {
    const next = Array.isArray(filesOrNull) ? filesOrNull : [];
    setAttachments(next);
  };

  const handleSubmitTicket = async () => {
    if (!screenshotCaptured) {
      toast.error('Please capture the current screen before opening a ticket.');
      return;
    }
    if (!formData.pageUrl.trim()) {
      toast.error('Please add the full page URL where the issue occurred.');
      return;
    }
    if (!formData.comment.trim()) {
      toast.error('Please add a comment before opening a ticket.');
      return;
    }

    setIsSubmitting(true);
    try {
      const pageUrl = formData.pageUrl.trim();
      const payload = new FormData();
      payload.append('pageUrl', pageUrl);
      payload.append('priority', formData.priority);
      payload.append('category', formData.category);
      payload.append('comment', formData.comment.trim());
      payload.append('logs', formData.logs || '');
      attachments.forEach((file) => {
        if (file instanceof File) {
          payload.append('attachments', file, file.name);
        }
      });

      const response = await ApiService.openHelpSupportTicket(payload);
      toast.success(response?.data?.message || 'Support ticket submitted successfully.');
    } catch (error) {
      const errorMessage = error?.message || error?.error || 'Failed to submit support ticket.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-800">
              <Headset className="h-6 w-6 text-blue-600" />
              Help & Support
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Raise a professional support ticket with screenshot, comment, logs, and attachments.
            </p>
          </div>
        </section>

        <HelpSupportTicketForm
          formData={formData}
          onFieldChange={handleFieldChange}
          attachments={attachments}
          onAttachmentsChange={handleAttachmentsChange}
          onSubmit={handleSubmitTicket}
          isSubmitting={isSubmitting}
          screenshotCaptured={screenshotCaptured}
        />
      </div>
    </div>
  );
}

export { HelpSupportPage };
