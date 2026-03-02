import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {  FaUser, FaLock, FaPhone } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { ApiService } from '@services/startup/ApiService';
import PropTypes from "prop-types";
import { cleanFormData } from '@utils/startup/authformvalidation';
import { TextField } from '@startup/safe_choice';


function Signup({ showRoleDropdown }) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companyId: '',
  });
  const [error, setError] = useState('');
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Honor company_id from URL (e.g. /signup?company_id=uuid) for invite/signup links
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const companyIdFromUrl = params.get('company_id');
    if (companyIdFromUrl?.trim()) {
      setFormData(prev => ({
        ...prev,
        companyId: companyIdFromUrl.trim(),
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
      const payload = {
        name: cleanedData.name,
        username: cleanedData.username,
        phone: cleanedData.phone,
        password: cleanedData.password,
        role: cleanedData.role,
      };
      if (cleanedData.companyId) {
        payload.company_id = cleanedData.companyId;
      }
      await ApiService.signup(payload);
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

  const handleFormSubmit = (e) => {
    handleSubmit(e);
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
            <TextField
            icon={ <FaUser className="text-gray-400" />}
              type="text"
              name="name"
              id="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Username */}
          <div className="mb-4">
            <TextField
            icon={ <FaUser className="text-gray-400" />}
              type="text"
              name="username"
              id="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          {/* Phone */}
          <div className="mb-4">
            <TextField
            icon={ <FaPhone className="text-gray-400" />}
              type="phone"
              name="phone"
              id="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <TextField
            icon={ <FaLock className="text-gray-400" />}
              type="password"
              name="password"
              id="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {/* Confirm Password */}
          <div className="mb-4">
            <TextField
            icon={   <FaLock className="text-gray-400" />}
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

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