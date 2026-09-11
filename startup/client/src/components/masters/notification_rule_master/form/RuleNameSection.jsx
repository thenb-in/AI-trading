import PropTypes from 'prop-types';
import { Tag } from 'lucide-react';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';
import { RuleSection } from './RuleSection';
import { FieldRow } from './FieldRow';
import { toPermissionOptions } from '../ruleOptions';


const RuleNameSection = ({ rule, permissions, selectedPermission, isLoading, onChange }) => (
  <RuleSection
    step={1}
    title="Name this rule"
    hint="Pick a name from the list — it is also what the rule fires on."
  >
    <FieldRow icon={Tag} label="Rule name" required active={Boolean(rule.name)}>
      <SearchableDropdown
        options={toPermissionOptions(permissions)}
        selectedValues={rule.name || ''}
        multiple={false}
        loading={isLoading}
        placeholder={isLoading ? 'Loading…' : 'Select a permission…'}
        onChange={(name) => onChange({ name })}
      />
      {selectedPermission && (
        <p className="mt-1.5 font-mono text-xs text-gray-400">{selectedPermission.name}</p>
      )}
    </FieldRow>
  </RuleSection>
);

RuleNameSection.propTypes = {
  rule: PropTypes.object.isRequired,
  permissions: PropTypes.array.isRequired,
  selectedPermission: PropTypes.object,
  isLoading: PropTypes.bool,
  onChange: PropTypes.func.isRequired
};

export { RuleNameSection };
