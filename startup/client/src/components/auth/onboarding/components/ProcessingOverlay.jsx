import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';


function ProcessingOverlay({ open, orderId }) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"

      // style={{ zIndex: 2147483647 }}
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-live="assertive"
    >
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden text-center">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-8 py-8">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-white" />
          <h2 className="mt-4 text-xl font-bold text-white">Completing your payment…</h2>
          <p className="mt-1 text-sm text-blue-100">Setting up your workspace.</p>
        </div>

        <div className="px-8 py-7">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              Please <span className="font-semibold">don&apos;t close or refresh</span> this page.
              This only takes a few seconds.
            </span>
          </div>

          {orderId && (
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Order ID</p>
              <p className="mt-1 select-all font-mono text-sm font-semibold text-gray-700 break-all">
                {orderId}
              </p>
            </div>
          )}

          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secured by Razorpay
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

ProcessingOverlay.propTypes = {
  open: PropTypes.bool.isRequired,
  orderId: PropTypes.string
};

export { ProcessingOverlay };
