import PropTypes from 'prop-types';
import { DataAccessSelector } from './DataAccessSelector';
import { useDeptEmpData } from '../../hooks/useDeptEmpData';

const DataAccessCell = ({ user, onSaved }) => {
  const { departments, employees } = useDeptEmpData();

  const handleSaved = (access) => {
    if (onSaved) onSaved(access);
  };

  return (
    <DataAccessSelector
      userId={user.id}
      initialAccess={user.dataAccess}
      departments={departments}
      employees={employees}
      onSaved={handleSaved}
    />
  );
};

DataAccessCell.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
    dataAccess: PropTypes.object
  }).isRequired,
  onSaved: PropTypes.func
};

export { DataAccessCell };



