import { useState } from 'react';
import { FaUser } from 'react-icons/fa';
import PropTypes from 'prop-types';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';


const UsernameStep = ({ isLoading, onSubmit }) => {
  const [username, setUsername] = useState('');

  const handleChange = (e) => {
    setUsername(e.target.value.replace(/[<>&]/g, ''));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(username);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <TextTypeField
          icon={<FaUser className="text-gray-400" />}
          name="username"
          id="username"
          placeholder="Username"
          value={username}
          onChange={handleChange}
          required
        />
      </div>

      <div className="mb-6">
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-lg
                     hover:bg-blue-700 transition duration-300
                     transform hover:scale-[1.02] shadow-md hover:shadow-lg
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || !username.trim()}
        >
          {isLoading ? 'Checking...' : 'Continue'}
        </button>
      </div>
    </form>
  );
};

UsernameStep.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired
};

export { UsernameStep };
