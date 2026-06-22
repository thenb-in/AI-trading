import PropTypes from 'prop-types';
import { User, Phone, Lock, ShieldCheck, KeyRound, Crown } from 'lucide-react';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { PhoneTypeField } from '@startup/components/base_components/fields/PhoneTypeField';
import { PasswordTypeField } from '@startup/components/base_components/fields/PasswordTypeField';
import { AvailabilityHint } from '@startup/components/common/AvailabilityHint';
import { ReassurancePanel } from '../ReassurancePanel';
import { accountShape, availabilityShape } from '../../types';

const PERKS = [
  { icon: Crown, text: 'This is your owner account — full admin access to the workspace.' },
  { icon: KeyRound, text: 'Your username and password are how you sign in from now on.' },
  { icon: ShieldCheck, text: 'Passwords are encrypted — we never store them in plain text.' }
];

/** Step 3 — admin account details. */
function AccountStep({ account, onChange, usernameAvailability }) {
  return (
    <div className="grid max-w-4xl gap-6 md:grid-cols-5">
      {/* Form card */}
      <div className="md:col-span-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Create your secure account</h3>
            <p className="text-xs text-gray-500">The admin you&apos;ll sign in with to run the workspace.</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="adminName" className="mb-2 block text-sm font-medium text-gray-700">
              Full name
            </label>
            <TextTypeField
              icon={<User className="text-gray-400" size={16} />}
              name="name"
              id="adminName"
              placeholder="Your full name"
              value={account.name}
              onChange={onChange}
              required
            />
          </div>

          <div>
            <label htmlFor="adminUsername" className="mb-2 block text-sm font-medium text-gray-700">
              Username
            </label>
            <TextTypeField
              icon={<User className="text-gray-400" size={16} />}
              name="username"
              id="adminUsername"
              placeholder="Choose a username"
              value={account.username}
              onChange={onChange}
              required
            />
            <AvailabilityHint
              status={usernameAvailability?.status}
              takenLabel="This username is already taken — please choose another."
            />
          </div>

          <div>
            <label htmlFor="adminPhone" className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              Phone <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <PhoneTypeField
              icon={<Phone className="text-gray-400" size={16} />}
              name="phone"
              id="adminPhone"
              placeholder="Phone number"
              value={account.phone}
              onChange={onChange}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="adminPassword" className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>
              <PasswordTypeField
                icon={<Lock className="text-gray-400" size={16} />}
                name="password"
                id="adminPassword"
                placeholder="Create a password"
                value={account.password}
                onChange={onChange}
                required
              />
            </div>
            <div>
              <label htmlFor="adminConfirmPassword" className="mb-2 block text-sm font-medium text-gray-700">
                Confirm password
              </label>
              <PasswordTypeField
                icon={<Lock className="text-gray-400" size={16} />}
                name="confirmPassword"
                id="adminConfirmPassword"
                placeholder="Re-enter password"
                value={account.confirmPassword}
                onChange={onChange}
                required
              />
            </div>
          </div>
        </div>
      </div>

      <ReassurancePanel title="Your account, secured" perks={PERKS} />
    </div>
  );
}

AccountStep.propTypes = {
  account: accountShape.isRequired,
  onChange: PropTypes.func.isRequired,
  usernameAvailability: availabilityShape
};

export { AccountStep };
