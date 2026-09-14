import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { ApiService } from '@services/ApiService';
import { MasterSelector } from '@startup/components/base_components/fields/MasterSelector';
import { MASTER_TYPE_ROLE } from './CreateRoleModal';

/**
 * The role picker, wherever roles are picked: a MasterSelector over the role
 * list with the framework's role creator behind its create row.
 *
 * Single-select by default — one role whose permissions are being edited —
 * and `multiple` for the places that target a set of them, such as a
 * notification rule's audience.
 */

/** Default label: the name, its description, and whether it is global. */
const describeRoleFully = (role) =>
  `${role.description ? `${role.name} - ${role.description}` : role.name}`
  + (role.isGlobal ? ' (Global)' : ' (Company)');

const loadRoles = () => ApiService.getRoles().then((response) => response.data?.data || response.data || []);

function RoleSelector({
  value,
  onChange,
  multiple = false,
  allowCreate = true,
  describeRole = describeRoleFully,
  label = 'Select Role',
  placeholder,
  className = 'mb-3',
  disabled = false,
  autoOpen = false,
  onClose,
}) {
  const toOption = useCallback(
    (role) => ({ value: String(role.id), label: describeRole(role) }),
    [describeRole]
  );

  return (
    <MasterSelector
      value={value}
      onChange={onChange}
      loadRows={loadRoles}
      toOption={toOption}
      creatorType={MASTER_TYPE_ROLE}
      optionName="Role"
      label={label}
      placeholder={placeholder || (multiple ? 'Select roles…' : '-- Select a role --')}
      multiple={multiple}
      allowCreate={allowCreate}
      className={className}
      disabled={disabled}
      autoOpen={autoOpen}
      onClose={onClose}
    />
  );
}

RoleSelector.propTypes = {
  /** One id for single-select, an array of them for `multiple`. */
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  ]),
  /** Receives a string id (or null) for single-select, an array for multiple. */
  onChange: PropTypes.func.isRequired,
  multiple: PropTypes.bool,
  /** Set false where creating a role from the picker makes no sense. */
  allowCreate: PropTypes.bool,
  /** How one role reads in the list. Defaults to name, description and scope. */
  describeRole: PropTypes.func,
  /** Field label. Pass null where the surrounding layout already labels it. */
  label: PropTypes.string,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  autoOpen: PropTypes.bool,
  onClose: PropTypes.func,
};

export { RoleSelector, describeRoleFully };
