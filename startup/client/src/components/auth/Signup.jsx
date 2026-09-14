import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {  FaUser, FaLock, FaPhone } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { ApiService } from '@services/ApiService';
import PropTypes from "prop-types";
import { cleanFormData } from '@utils/authformvalidation';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { PhoneTypeField } from '@startup/components/base_components/fields/PhoneTypeField';
import { PasswordTypeField } from '@startup/components/base_components/fields/PasswordTypeField';
import { useAvailabilityCheck } from '@startup/hooks/useAvailabilityCheck';
import { AvailabilityHint } from '@startup/components/common/AvailabilityHint';
import { MasterSelector } from '@startup/components/base_components/fields/MasterSelector';
import { MASTERS } from '@startup/constants/masters';


// Signing up happens before login, so roles come from the open role list.
const loadSignupRoles = () => ApiService.getAllRoles().then((response) => response.data);
const roleNameOption = (role) => ({ label: role.name });

function Signup({ showRoleDropdown, onSubmit, onBackToLogin, companyId }) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companyId: companyId || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const usernameAvailability = useAvailabilityCheck('username', formData.username);


  useEffect(() => {
    if (companyId?.trim()) {
      setFormData(prev => ({ ...prev, companyId: companyId.trim() }));
    }
  }, [companyId]);

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
          // New sign-ups start as `user`, or the first role there is.
          const rolesList = await loadSignupRoles();
          if (rolesList.length > 0) {
            setFormData(prev => ({
              ...prev,
              role: rolesList.find(role => role.name === 'user')?.id || rolesList[0].id
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

  const handleRoleChange = (value) => {
    setFormData({ ...formData, role: value });
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

    if (usernameAvailability.status === 'taken') {
      setError('That username is already taken. Please choose another.');
      return;
    }

    if (typeof onSubmit === 'function') {
      try {
        await onSubmit(cleanedData);
      } catch (err) {
        const message = err?.error || err?.message || 'Signup failed. Please try again.';
        setError(message);
        toast.error(message);
      }
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
            <TextTypeField
              icon={<FaUser className="text-gray-400" />}
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
            <TextTypeField
              icon={<FaUser className="text-gray-400" />}
              name="username"
              id="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
            <AvailabilityHint status={usernameAvailability.status} takenLabel="That username is already taken." />
          </div>

          {/* Phone */}
          <div className="mb-4">
            <PhoneTypeField
              icon={<FaPhone className="text-gray-400" />}
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
            <PasswordTypeField
              icon={<FaLock className="text-gray-400" />}
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
            <PasswordTypeField
              icon={<FaLock className="text-gray-400" />}
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
              <MasterSelector
                loadRows={loadSignupRoles}
                toOption={roleNameOption}
                masterName={MASTERS.ROLE}
                value={formData.role}
                onChange={handleRoleChange}
                placeholder="Select Role"
                disabled={loading}
                allowCreate={false}
                allowEdit={false}
              />
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
              disabled={usernameAvailability.status === 'taken' || usernameAvailability.status === 'checking'}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              Create Account
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onBackToLogin || handleNavigateToLogin}
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
  onSubmit: PropTypes.func,
  onBackToLogin: PropTypes.func,
  companyId: PropTypes.string,
};

export { Signup };