import PropTypes from 'prop-types';
import { Building2, Shield, KeyRound, UserRound, AtSign } from 'lucide-react';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';
import { RECIPIENT_MODE } from '../constants';
import { RuleSection } from './RuleSection';
import { FieldRow } from './FieldRow';
import { AddressesField } from './AddressesField';

// Step 2 — the framework's five audiences plus whatever the app registered, all
// unioned. Duplicates across them are collapsed on the server, so somebody caught
// by two still gets one message.
// The self option is stored in the same list as the named ones -- one audience, one
// value on the rule -- so the checkbox and the dropdown each edit their own half of it.
const toggleValue = (values, value) =>
  (values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);

const namedValues = (values, source) =>
  (source.selfOption ? values.filter((v) => v !== source.selfOption.value) : values);

const withSelf = (named, previous, source) =>
  (source.selfOption && previous.includes(source.selfOption.value)
    ? [source.selfOption.value, ...named]
    : named);

const RecipientSection = ({
  rule, audience, recipientCount, totalRecipients, isLoading, onChange
}) => {
  const recipients = rule.recipients || {};
  const valuesFor = (mode) => recipients[mode] || [];
  const isOn = (mode) => recipientCount(mode) > 0;

  return (
    <RuleSection
      step={2}
      title="Who gets it"
      hint="Pick at least one. Nobody gets two copies."
      count={totalRecipients}
    >
      <FieldRow icon={Building2} label="Company" active={isOn(RECIPIENT_MODE.COMPANY)}>
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
        hint="Stays right as people join and leave."
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
        hint="Whoever holds the permission."
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

      <FieldRow icon={UserRound} label="Specific users" active={isOn(RECIPIENT_MODE.USERS)}>
        <SearchableDropdown
          options={audience.userOptions}
          selectedValues={valuesFor(RECIPIENT_MODE.USERS)}
          multiple
          loading={isLoading}
          placeholder="Select users…"
          onChange={(value) => onChange(RECIPIENT_MODE.USERS, value)}
        />
      </FieldRow>

      {audience.sources?.map((source) => (
        <FieldRow
          key={source.key}
          icon={source.icon}
          label={source.label}
          hint={source.hint}
          active={isOn(source.key)}
        >
          {source.selfOption && (
            <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={valuesFor(source.key).includes(source.selfOption.value)}
                onChange={() => onChange(source.key, toggleValue(valuesFor(source.key), source.selfOption.value))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {source.selfOption.label}
            </label>
          )}
          <SearchableDropdown
            options={source.options}
            selectedValues={namedValues(valuesFor(source.key), source)}
            multiple
            loading={isLoading}
            placeholder={source.placeholder || `Select ${source.label.toLowerCase()}…`}
            onChange={(value) => onChange(source.key, withSelf(value, valuesFor(source.key), source))}
          />
        </FieldRow>
      ))}

      <FieldRow
        icon={AtSign}
        label="Other"
        hint="Emails or mobile numbers, comma separated. Each is used only by the channel it suits."
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
  onChange: PropTypes.func.isRequired
};

export { RecipientSection };
