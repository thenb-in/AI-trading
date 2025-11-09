import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import {
  Key,
  Eye,
  EyeOff,
  Cloud
} from 'lucide-react';
import ApiService from '../services/startup/ApiService';

const CompanyProfile = forwardRef(({ isLoading, onDirtyChange }, ref) => {
  const [awsCredentials, setAwsCredentials] = useState({
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    awsRegion: 'us-east-1',
  });
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const response = await ApiService.getCompanyAWSCredentials();
        if (response.data) {
          setAwsCredentials({
            awsAccessKeyId: response.data.awsAccessKeyId || '',
            awsSecretAccessKey: '',
            awsRegion: response.data.awsRegion || 'us-east-1',
          });
        }
      } catch (err) {
        if (err.response?.status !== 404) {
          // Silently handle error - credentials may not be configured yet
        }
      }
    };
    fetchCredentials();
  }, []);

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isDirty);
    }
  }, [isDirty, onDirtyChange]);

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!isDirty) {
        return;
      }

      if (awsCredentials.awsAccessKeyId.trim() || awsCredentials.awsSecretAccessKey.trim()) {
        if (!awsCredentials.awsAccessKeyId.trim()) {
          throw new Error('AWS Access Key ID is required if providing credentials');
        }
        if (!awsCredentials.awsSecretAccessKey.trim()) {
          throw new Error('AWS Secret Access Key is required if providing credentials');
        }

        await ApiService.updateCompanyAWSCredentials({
          awsAccessKeyId: awsCredentials.awsAccessKeyId.trim(),
          awsSecretAccessKey: awsCredentials.awsSecretAccessKey.trim(),
          awsRegion: awsCredentials.awsRegion.trim() || 'us-east-1',
        });
      }

      setIsDirty(false);
    },
    isDirty: () => isDirty
  }));

  const handleInputChange = (field, value) => {
    setAwsCredentials((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  };

  return (
    <>
      {/* Separator */}
      <div className="my-8 border-t border-gray-200"></div>

      {/* Company Profile Section */}
      <div className="mb-6">
        <div className="flex mb-4">
          <Cloud className="text-indigo-500 mr-2" size={24} />
          <h3 className="text-xl font-bold text-gray-800">
            Company Profile
          </h3>
        </div>
        <p className="text-gray-600 mb-6 text-sm">
          Configure AWS credentials for server management. These credentials are used to sync and manage EC2 instances.
        </p>

        <div className="space-y-4">
          <div>
            <label className="flex items-center text-gray-700 font-medium mb-2">
              <Key size={16} className="mr-2 text-gray-500" />
              AWS Access Key ID
            </label>
            <motion.input
              type="text"
              value={awsCredentials?.awsAccessKeyId || ''}
              onChange={(e) => handleInputChange('awsAccessKeyId', e.target.value)}
              placeholder="AKIAIOSFODNN7EXAMPLE"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm"
              whileFocus={{ scale: 1.01 }}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="flex items-center text-gray-700 font-medium mb-2">
              <Key size={16} className="mr-2 text-gray-500" />
              AWS Secret Access Key
            </label>
            <div className="relative">
              <motion.input
                type={showSecretKey ? 'text' : 'password'}
                value={awsCredentials?.awsSecretAccessKey || ''}
                onChange={(e) => handleInputChange('awsSecretAccessKey', e.target.value)}
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm pr-10"
                whileFocus={{ scale: 1.01 }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={isLoading}
              >
                {showSecretKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="flex items-center text-gray-700 font-medium mb-2">
              <Cloud size={16} className="mr-2 text-gray-500" />
              AWS Region
            </label>
            <motion.input
              type="text"
              value={awsCredentials?.awsRegion || 'us-east-1'}
              onChange={(e) => handleInputChange('awsRegion', e.target.value)}
              placeholder="us-east-1"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              whileFocus={{ scale: 1.01 }}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Default: us-east-1</p>
          </div>
        </div>
      </div>
    </>
  );
});

CompanyProfile.displayName = 'CompanyProfile';

CompanyProfile.propTypes = {
  isLoading: PropTypes.bool,
  onDirtyChange: PropTypes.func,
};

export default CompanyProfile;

