import { useState } from 'react';
import { FaLock } from 'react-icons/fa';
import PropTypes from 'prop-types';
import { PasswordTypeField } from '@startup/components/base_components/fields/PasswordTypeField';
import { OtpTypeField } from '@startup/components/base_components/fields/OtpTypeField';

const OTP_LENGTH = 6;


const LocalResetStep = ({ isFirstLogin, requiresTotp, isLoading, onSubmit }) => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });

  const handleChange = (e) => {
    const sanitizedValue = e.target.value.replace(/[<>&]/g, '');
    setFormData({ ...formData, [e.target.name]: sanitizedValue });
  };

  const handleOtpChange = (e) => {
    setFormData({ ...formData, otp: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <PasswordTypeField
          icon={<FaLock className="text-gray-400" />}
          name="newPassword"
          id="newPassword"
          placeholder="New Password"
          value={formData.newPassword}
          onChange={handleChange}
          required
        />
      </div>

      <div className="mb-4">
        <PasswordTypeField
          icon={<FaLock className="text-gray-400" />}
          name="confirmPassword"
          id="confirmPassword"
          placeholder="Confirm New Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />
      </div>

      {requiresTotp && !isFirstLogin && (
        <div className="mb-4">
          <OtpTypeField
            name="otp"
            id="otp"
            value={formData.otp}
            onChange={handleOtpChange}
            otpLength={OTP_LENGTH}
            label="Google Authenticator Code"
          />
        </div>
      )}

      <div className="mb-6">
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-lg
                     hover:bg-blue-700 transition duration-300
                     transform hover:scale-[1.02] shadow-md hover:shadow-lg
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </form>
  );
};

LocalResetStep.propTypes = {
  isFirstLogin: PropTypes.bool,
  requiresTotp: PropTypes.bool,
  isLoading: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired
};

export { LocalResetStep };
