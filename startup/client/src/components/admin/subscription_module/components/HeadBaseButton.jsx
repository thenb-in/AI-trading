import { NumberTypeField } from '@startup/components/base_components/fields/NumberTypeField';
import { useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { ApiService } from '@services/ApiService';

// Rebuild the wallet's picture of this company's heads.
//
// The wallet counts billable heads — whatever this app is billed per — by replaying the activity it
// was told about, so it knows the company from the day pushes started reaching
// it and no earlier. Anything billed before that counts nobody. This sends the
// missing history, read back out of the master data and dated when it actually
// happened.
//
// Months sits next to the button rather than behind a dialog: it is one number
// with a sensible default, and a modal to collect it would be two clicks for
// the answer almost everybody wants.
const DEFAULT_MONTHS = 3;

/** What actually happened, in the operator's terms. */
function describe(summary) {
  const rebuilt = summary?.rebuilt || [];
  const total = (field) => rebuilt.reduce((sum, head) => sum + (head[field] || 0), 0);
  const heads = rebuilt.map((head) => head.head).join(', ');
  const stored = total('stored');
  const duplicates = total('duplicates');

  if (!rebuilt.length) {
    return 'Nothing here can be rebuilt — no history source for the heads the wallet tracks';
  }
  // Re-running is normal — it is how the window gets extended or a half-finished
  // run retried — so "already there" is a result, not a complaint.
  if (!stored) {
    return `${heads}: already up to date (${duplicates} event(s) unchanged)`;
  }
  return `Rebuilt ${summary.months} month(s) of ${heads}: ${stored} new event(s)`
    + (duplicates ? `, ${duplicates} already there` : '');
}

function HeadBaseButton() {
  const [months, setMonths] = useState(DEFAULT_MONTHS);
  const [building, setBuilding] = useState(false);

  const handleBuild = async () => {
    setBuilding(true);
    try {
      const response = await ApiService.buildHeadBase(Number(months) || DEFAULT_MONTHS);
      const summary = response.data?.data;
      const failed = (summary?.rebuilt || []).reduce((sum, head) => sum + head.failed, 0);

      // `skipped` is not worth a toast: the wallet answers for every app it
      // serves, so most of that list is other applications' heads and this one
      // is right to have nothing to say about them.
      toast[failed ? 'warn' : 'success'](
        failed ? `${describe(summary)} — ${failed} event(s) failed, see server log` : describe(summary)
      );
    } catch (err) {
      toast.error(err?.message || 'Failed to build head base');
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor="headBaseMonths" className="text-xs text-gray-600">
        Months
      </label>
      <NumberTypeField
        id="headBaseMonths"
        min={1}
        max={36}
        value={months}
        onChange={(e) => setMonths(e.target.value)}
        disabled={building}
        icon={false}
        className="!px-2 !py-1.5 !text-xs !rounded"
        containerClassName="!w-14"
      />
      <button
        onClick={handleBuild}
        disabled={building}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Send this company's head history to the wallet, so periods before activity logging started are billed on what was actually there"
      >
        {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
        Build Head Base
      </button>
    </div>
  );
}

export { HeadBaseButton };
