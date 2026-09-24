import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { ApiService } from '@startup/services/ApiService';
import { SearchableDropdown } from './SearchableDropdown';

const userLabel = (user) => (user.name && user.name !== user.username ? `${user.username} — ${user.name}` : user.username);


const UserPickerField = ({
  users: usersProp,
  value,
  onChange,
  label = 'User',
  placeholder = 'Select user',
  emptyLabel,
  note,
  required = false,
  disabled = false,
}) => {
  const [fetched, setFetched] = useState([]);
  const users = usersProp ?? fetched;

  useEffect(() => {
    if (usersProp) return undefined;
    let cancelled = false;
    ApiService.getAllUsers()
      .then((res) => {
        if (!cancelled) setFetched((res?.data?.users || []).filter((user) => user.isActive !== false));
      })
      .catch(() => {
        if (!cancelled) setFetched([]);
      });
    return () => { cancelled = true; };
  }, [usersProp]);

  const options = [
    ...(emptyLabel ? [{ value: '', label: emptyLabel }] : []),
    ...users.map((user) => ({ value: String(user.id), label: userLabel(user) })),
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && '*'}
      </label>
      {note && <div className="mb-2">{note}</div>}
      <SearchableDropdown
        options={options}
        value={value}
        onChange={onChange}
        multiple={false}
        searchable
        placeholder={placeholder}
        disabled={disabled}
        defaultOptionValue=""
      />
    </div>
  );
};

UserPickerField.propTypes = {
  users: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    username: PropTypes.string,
    name: PropTypes.string,
  })),
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  emptyLabel: PropTypes.string,
  note: PropTypes.node,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
};

export { UserPickerField };
