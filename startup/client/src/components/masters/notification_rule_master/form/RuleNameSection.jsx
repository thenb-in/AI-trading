import PropTypes from 'prop-types';
import { Tag } from 'lucide-react';
import { PermissionSelector } from '@startup/components/admin/PermissionSelector';
import { RuleSection } from './RuleSection';
import { FieldRow } from './FieldRow';


const RuleNameSection = ({ rule, onChange }) => (
  <RuleSection
    step={1}
    title="Name this rule"
    hint="Pick a name from the list — it is also what the rule fires on."
  >
    <FieldRow icon={Tag} label="Rule name" required active={Boolean(rule.name)}>
      <PermissionSelector
        value={rule.name || ''}
        placeholder="Select a permission…"
        onChange={(name) => onChange({ name })}
      />
      {rule.name && (
        <p className="mt-1.5 font-mono text-xs text-gray-400">{rule.name}</p>
      )}
    </FieldRow>
  </RuleSection>
);

RuleNameSection.propTypes = {
  rule: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
};

export { RuleNameSection };
