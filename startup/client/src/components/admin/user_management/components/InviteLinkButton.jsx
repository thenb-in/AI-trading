import { Link as LinkIcon } from 'lucide-react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';

const TONES = {
  green: 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100',
  blue: 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
};


function InviteLinkButton({ label, path, companyId, tone, testId }) {

  const url = companyId ? `${window.location.origin}${path}?company_id=${companyId}` : '';
  const canCopy = typeof window !== 'undefined' && window.isSecureContext;

  const handleCopy = async () => {
    if (!companyId) {
      toast.error('Company ID not found. Please try again.');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`${label} copied to clipboard!`);
    } catch {
      toast.error('Failed to copy link. Please try again.');
    }
  };

  return (
    <button
      type="button"
      onClick={canCopy ? handleCopy : undefined}
      disabled={!url || !canCopy}
      data-testid={testId}
      data-signup-url={url}
      title={url || `${label} unavailable`}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2
                  text-xs sm:text-sm font-medium transition-colors ${TONES[tone]}
                  ${canCopy ? 'cursor-pointer' : 'cursor-default select-text font-mono'}
                  disabled:opacity-50`}
    >
      <LinkIcon size={16} className="flex-shrink-0" />
      <span className="truncate max-w-[16rem]">{canCopy ? label : (url || `${label} unavailable`)}</span>
    </button>
  );
}

InviteLinkButton.propTypes = {
  label: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  companyId: PropTypes.string,
  tone: PropTypes.oneOf(['green', 'blue']).isRequired,
  testId: PropTypes.string
};

export { InviteLinkButton };
