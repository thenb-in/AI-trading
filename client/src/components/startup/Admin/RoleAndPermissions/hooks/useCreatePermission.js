import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../../../../../services/startup/ApiService';

export const useCreatePermission = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'module'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Permission name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Permission name must be at least 2 characters long';
    } else if (formData.name.trim().length > 50) {
      errors.name = 'Permission name cannot exceed 50 characters';
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(formData.name.trim())) {
      errors.name = 'Permission name can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    
    if (!formData.type || !['module', 'action'].includes(formData.type)) {
      errors.type = 'Permission type is required';
    }
    
    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description cannot exceed 500 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation errors and messages when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await ApiService.createPermission({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        type: formData.type
      });
    
      const responseData = response.data || response;
      if (responseData.success !== false) {
        setSuccess(responseData.message || 'Permission created successfully!');
        setFormData({ name: '', description: '', type: 'module' });
        
        setTimeout(() => {
          navigate('/admin/role-permissions');
        }, 1000);
        
        return { success: true, message: responseData.message };
      } else {
        throw new Error(responseData.message || 'Failed to create permission');
      }
    } catch (err) {
      console.error('Error creating permission:', err);
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred while creating the permission';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/admin/role-permissions');
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  return {
    // Form data
    formData,
    loading,
    error,
    success,
    validationErrors,
    
    // Actions
    handleInputChange,
    handleSubmit,
    handleBack,
    clearMessages,
    
    // Setters
    setError,
    setSuccess
  };
};
