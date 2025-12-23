import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaUser, FaLock, FaPhone } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { ApiService } from '../../../services/startup/ApiService';
import PropTypes from "prop-types";
import { cleanFormData } from '../../../utils/startup/authformvalidation';


function Signup({ showRoleDropdown }) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companyId: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const companyParam = params.get('company_id');

    if (companyParam) {
      const id = companyParam.substring(companyParam.lastIndexOf('_') + 1);
      setFormData(prev => ({
        ...prev,
        companyId: id || '',
      }));
    }
  }, [location.search]);


  useEffect(() => {
    if (showRoleDropdown) {
      const fetchRoles = async () => {
        try {
          const response = await ApiService.getAllRoles();
          setRoles(response.data);
          if (response.data.length > 0) {
            setFormData(prev => ({
              ...prev,
              role: response.data.find(role => role.name === 'user')?.id || response.data[0].id
            }));
          }
        } catch {
          toast.error('Failed to load roles. Please try again later.');
        } finally {
          setLoading(false);
        }
      };
      fetchRoles();
    } else {
      setLoading(false);
    }
  }, [showRoleDropdown]);

  const handleChange = (e) => {
    const sanitizedValue = e.target.value.replace(/[<>&]/g, '');
    setFormData({ ...formData, [e.target.name]: sanitizedValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Clean form data: trim all fields and remove spaces from username and password
    const cleanedData = cleanFormData(formData);

    if (cleanedData.password !== cleanedData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await ApiService.signup({
        name: cleanedData.name,
        username: cleanedData.username,
        phone: cleanedData.phone,
        password: cleanedData.password,
        companyId: cleanedData.companyId,
        role: cleanedData.role,
      });
      toast.success('Signup successful! Awaiting admin approval.');
      navigate('/');
    } catch (err) {
      // Handle different error formats from backend
      let message = 'Signup failed. Please try again.';
      
      if (err.errors && Array.isArray(err.errors)) {
        // Validation errors from express-validator (array format)
        const errorMessages = err.errors.map(e => e.msg || e.message || e).join('. ');
        message = errorMessages || message;
      } else if (err.error) {
        // Single error message
        message = err.error;
      } else if (typeof err === 'string') {
        // Error is a string
        message = err;
      } else if (err.message) {
        // Error object with message property
        message = err.message;
      }
      
      setError(message);
      toast.error(message);
    }
  };

  const params = new URLSearchParams(location.search);
  const hideCompanyIdField = params.has('company_id');

  const handleFormSubmit = (e) => {
    handleSubmit(e);
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleNavigateToLogin = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center auth-background">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleFormSubmit}
          className="bg-white shadow-2xl rounded-2xl px-8 pt-6 pb-8 mb-4 transform transition-all duration-300 hover:scale-[1.01]"
        >
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
            <p className="text-gray-600">Join App today</p>
          </div>

          {/* Full Name */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUser className="text-gray-400" />
              </div>
              <input
                type="text"
                name="name"
                id="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
          </div>

          {/* Username */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUser className="text-gray-400" />
              </div>
              <input
                type="text"
                name="username"
                id="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaPhone className="text-gray-400" />
              </div>
              <input
                type="text"
                name="phone"
                id="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
              <button
                type="button"
                onClick={handleTogglePassword}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 transition"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                id="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
              <button
                type="button"
                onClick={handleToggleConfirmPassword}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 transition"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Company ID - only show if not in URL */}
          {!hideCompanyIdField && (
            <div className="mb-4">
              <input
                type="uuid"
                name="companyId"
                id="companyId"
                placeholder="Company ID"
                value={formData.companyId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
          )}

          {/* Role Dropdown - only show if showRoleDropdown is true */}
          {showRoleDropdown && (
            <div className="mb-4">
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="" disabled hidden>
                  Select Role
                </option>
                {loading ? (
                  <option>Loading roles...</option>
                ) : (
                  roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {error && (
            <div className="mb-4 text-center">
              <p className="text-red-500 text-sm bg-red-50 py-2 rounded-lg">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
            >
              Create Account
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={handleNavigateToLogin}
                className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition"
              >
                Log in
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

Signup.propTypes = {
  showRoleDropdown: PropTypes.bool,
};

export { Signup };