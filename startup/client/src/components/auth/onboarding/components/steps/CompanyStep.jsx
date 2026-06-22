import PropTypes from 'prop-types';
import { Building2, Users, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { NumberTypeField } from '@startup/components/base_components/fields/NumberTypeField';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';
import { INDIAN_STATE_OPTIONS } from '@startup/constants/indianStates';
import { AvailabilityHint } from '@startup/components/common/AvailabilityHint';
import { ReassurancePanel } from '../ReassurancePanel';
import { companyShape, availabilityShape } from '../../types';

const PERKS = [
  { icon: ShieldCheck, text: 'Your state sets up Professional Tax & Labour Welfare Fund automatically.' },
  { icon: Users, text: 'Team size tells us whether PF (20+) and ESIC (10+) apply to you.' },
  { icon: Sparkles, text: 'Nothing is locked in — refine any of this later from company settings.' }
];

/** Step 2 — company / workspace details (name, state, team size). */
function CompanyStep({ company, onChange, onFieldChange, nameAvailability }) {
  const handleStateChange = (values) => onFieldChange('state', values[0] || '');

  return (
    <div className="grid max-w-4xl gap-6 md:grid-cols-5">
      {/* Form card */}
      <div className="md:col-span-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Building2 size={20} />
          </span>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Workspace details</h3>
            <p className="text-xs text-gray-500">This is how your company appears across the app.</p>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="companyName" className="mb-2 block text-sm font-medium text-gray-700">
              Company name
            </label>
            <TextTypeField
              icon={<Building2 className="text-gray-400" size={16} />}
              name="name"
              id="companyName"
              placeholder="Acme Pvt. Ltd."
              value={company.name}
              onChange={onChange}
              required
            />
            <AvailabilityHint
              status={nameAvailability?.status}
              takenLabel="This company name is already taken — please choose another."
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Use your registered or trading name — you can change it anytime.
            </p>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <MapPin className="text-gray-400" size={14} />
              State
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <SearchableDropdown
              options={INDIAN_STATE_OPTIONS}
              selectedValues={company.state ? [company.state] : []}
              onChange={handleStateChange}
              multiple={false}
              placeholder="Select your state"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Used as the default for state-specific statutory compliance.
            </p>
          </div>

          <div>
            <label htmlFor="employeeCount" className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Users className="text-gray-400" size={14} />
              Team size
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <NumberTypeField
              icon={<Users className="text-gray-400" size={16} />}
              name="employeeCount"
              id="employeeCount"
              numberMode="int"
              min={0}
              clamp
              placeholder="e.g. 25"
              value={company.employeeCount}
              onChange={onChange}
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Roughly how many people will you run payroll for?
            </p>
          </div>
        </div>
      </div>

      <ReassurancePanel title="Why we ask" perks={PERKS} />
    </div>
  );
}

CompanyStep.propTypes = {
  company: companyShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onFieldChange: PropTypes.func.isRequired,
  nameAvailability: availabilityShape
};

export { CompanyStep };
