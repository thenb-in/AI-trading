import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { ApiService } from '@services/ApiService';
import { getApiErrorMessage } from '@utils/apiErrorMessage';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';
import { useMasterCreator } from '@startup/components/base_components/master/master_modal/MasterModalProvider';
import { MASTER_TYPE_ROLE } from './CreateRoleModal';

/**
 * The role picker, wherever roles are picked.
 *
 * It loads the roles itself, on mount and on every open. A screen that needs a
 * role picked does not fetch a role list, hold it in state, or keep it up to
 * date — it passes the value it has and receives the value the user chose,
 * nothing else.
 *
 * Creating a role is part of the picker too: the menu offers a create row,
 * opens the registered role creator behind it, reloads, and selects what was
 * just made. No caller names that dialog, renders it, or hears about it.
 *
 * Single-select by default — one role whose permissions are being edited —
 * and `multiple` for the places that target a set of them, such as a
 * notification rule's audience.
 *
 * Values are always the role id as a string, which is what SearchableDropdown
 * works in; a caller whose own state is numeric converts at its own edge
 * rather than having this component guess.
 */

/** Default label: the name, its description, and whether it is global. */
const describeRoleFully = (role) =>
  `${role.description ? `${role.name} - ${role.description}` : role.name}`
  + (role.isGlobal ? ' (Global)' : ' (Company)');

function RoleSelector({
  value,
  onChange,
  multiple = false,
  allowCreate = true,
  describeRole = describeRoleFully,
  label = 'Select Role',
  placeholder,
  className = 'mb-3',
}) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // `loading` is the first load only — later reloads refresh what is already
  // on screen rather than blanking the field.
  const loadRoles = useCallback(() => ApiService.getRoles()
    .then((response) => setRoles(response.data?.data || response.data || []))
    .catch((error) => toast.error(getApiErrorMessage(error, 'Could not load roles')))
    .finally(() => setLoading(false)), []);

  // Once to render the current value's label, and again whenever the user
  // actually opens the list. A role created anywhere invalidates this read, so
  // the reopen finds it; nothing changed in between costs a cache hit.
  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const { openMasterModal, hasProvider } = useMasterCreator();
  // Nothing would happen without a provider, so don't offer the row at all.
  const canCreate = allowCreate && hasProvider;

  // Reload before selecting, so the new role is in the list by the time it is
  // the value — a value with no matching option renders as an empty field.
  const selectCreatedRole = useCallback(
    (created) => loadRoles().then(() => {
      if (!created?.id) return;
      const createdId = String(created.id);
      onChange(multiple ? [...(value || []).map(String), createdId] : createdId);
    }),
    [loadRoles, onChange, multiple, value]
  );

  const openRoleCreator = useCallback(
    (searchTerm) => openMasterModal({
      type: MASTER_TYPE_ROLE,
      defaults: { initialName: searchTerm || '' },
      onSuccess: selectCreatedRole,
    }),
    [openMasterModal, selectCreatedRole]
  );

  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: String(role.id), label: describeRole(role) })),
    [roles, describeRole]
  );

  const selectedValues = useMemo(() => {
    if (multiple) return (value || []).map(String);
    return value === null || value === undefined || value === '' ? '' : String(value);
  }, [multiple, value]);

  const handleChange = useCallback(
    (next) => onChange(multiple ? next : (next === '' ? null : next)),
    [onChange, multiple]
  );

  return (
    <div className={className}>
      {label ? (
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {label}
        </label>
      ) : null}
      <SearchableDropdown
        options={roleOptions}
        selectedValues={selectedValues}
        onChange={handleChange}
        placeholder={placeholder || (multiple ? 'Select roles…' : '-- Select a role --')}
        multiple={multiple}
        disabled={loading}
        loading={loading}
        onOpen={loadRoles}
        optionName="Role"
        onCreateOption={canCreate ? openRoleCreator : undefined}
      />
    </div>
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
};

export { RoleSelector, describeRoleFully };
