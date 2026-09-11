import PropTypes from 'prop-types';
import { Building2, Shield, KeyRound, UserRound, AtSign } from 'lucide-react';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';
import { RECIPIENT_MODE } from '../constants';
import { RuleSection } from './RuleSection';
import { FieldRow } from './FieldRow';
import { AddressesField } from './AddressesField';
import { DeliveryModeChoice } from './DeliveryModeChoice';
import { AudienceSummary } from './AudienceSummary';
import { audienceSummary } from './audienceSummary';


const RecipientSection = ({
  rule, audience, recipientCount, totalRecipients, isLoading, onChange, onPatch
}) => {
  const recipients = rule.recipients || {};
  const onlyTheSubject = Boolean(rule.only_the_subject);
  const valuesFor = (mode) => recipients[mode] || [];
  const isOn = (mode) => recipientCount(mode) > 0;
  const summary = audienceSummary(recipients, recipientCount);

  return (
    <RuleSection
      step={2}
      title="Who gets it"
      hint="Pick people any way you like — the lists add up."
      count={totalRecipients}
    >
      <AudienceSummary summary={summary} onlyTheSubject={onlyTheSubject} />

      <DeliveryModeChoice
        onlyTheSubject={onlyTheSubject}
        onChange={(value) => onPatch({ only_the_subject: value })}
      />

      <FieldRow
        icon={Building2}
        label="Company"
        hint="Everyone who has a login."
        hintTone="red"
        active={Boolean(recipients[RECIPIENT_MODE.COMPANY])}
      >
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(recipients[RECIPIENT_MODE.COMPANY])}
            onChange={() => onChange(RECIPIENT_MODE.COMPANY, !recipients[RECIPIENT_MODE.COMPANY])}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Everyone in the company
        </label>
      </FieldRow>

      <FieldRow
        icon={Shield}
        label="By role"
        hint="Anyone who has this role."
        hintTone="red"
        active={isOn(RECIPIENT_MODE.ROLE)}
      >
        <SearchableDropdown
          options={audience.roleOptions}
          selectedValues={valuesFor(RECIPIENT_MODE.ROLE)}
          multiple
          loading={isLoading}
          placeholder="Select roles…"
          onChange={(value) => onChange(RECIPIENT_MODE.ROLE, value)}
        />
      </FieldRow>

      <FieldRow
        icon={KeyRound}
        label="By permission"
        hint="Anyone who has this permission."
        hintTone="red"
        active={isOn(RECIPIENT_MODE.PERMISSION)}
      >
        <SearchableDropdown
          options={audience.permissionOptions}
          selectedValues={valuesFor(RECIPIENT_MODE.PERMISSION)}
          multiple
          loading={isLoading}
          placeholder="Select permissions…"
          onChange={(value) => onChange(RECIPIENT_MODE.PERMISSION, value)}
        />
      </FieldRow>

      <FieldRow
        icon={UserRound}
        label="Specific users"
        hint="Pick people by name."
        hintTone="red"
        active={isOn(RECIPIENT_MODE.USERS)}
      >
        <SearchableDropdown
          options={audience.userOptions}
          selectedValues={valuesFor(RECIPIENT_MODE.USERS)}
          multiple
          loading={isLoading}
          placeholder="Select users…"
          onChange={(value) => onChange(RECIPIENT_MODE.USERS, value)}
        />
      </FieldRow>

      <FieldRow
        icon={AtSign}
        label="Other"
        hint="Email ids or mobile numbers, separated by a comma."
        hintTone="red"
        active={isOn(RECIPIENT_MODE.ADDRESSES)}
      >
        <AddressesField
          key={rule.id ?? 'new'}
          values={valuesFor(RECIPIENT_MODE.ADDRESSES)}
          onChange={(value) => onChange(RECIPIENT_MODE.ADDRESSES, value)}
        />
      </FieldRow>

    </RuleSection>
  );
};

RecipientSection.propTypes = {
  rule: PropTypes.object.isRequired,
  audience: PropTypes.object.isRequired,
  recipientCount: PropTypes.func.isRequired,
  totalRecipients: PropTypes.number.isRequired,
  isLoading: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  onPatch: PropTypes.func.isRequired
};

export { RecipientSection };
