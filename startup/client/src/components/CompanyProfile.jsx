import { forwardRef, useState, useEffect, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { ApiService } from '@services/ApiService';
import { Key, User, FileBadge } from 'lucide-react';
import { ToggleSwitch } from './admin/ToggleSwitch';

const CompanyProfile = forwardRef((props, ref) => {
  const { isLoading: parentLoading, onDirtyChange } = props;
  const [profileData, setProfileData] = useState({
    username: '',
    password: '',
    manualAttendanceCommentCompulsory: false,
    enable_cof: null,
    epf_no: '',
    sac_code: ''
  });
  const [originalData, setOriginalData] = useState({
    username: '',
    password: '',
    manualAttendanceCommentCompulsory: false,
    enable_cof: null,
    epf_no: '',
    sac_code: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await ApiService.getCompanyProfile();
        const data = {
          username: response.data.username || '',
          password: response.data.password || '',
          manualAttendanceCommentCompulsory: response.data.manualAttendanceCommentCompulsory || false,
          enable_cof: response.data.enable_cof ?? null,
          epf_no: response.data.epf_no || '',
          sac_code: response.data.sac_code || ''
        };
        setProfileData(data);
        setOriginalData(data);
        setIsDirty(false);
      } catch (err) {
        const errorMessage = err.error || err.message || 'Failed to load company profile';
        setError(errorMessage);
        // Set empty defaults if profile doesn't exist yet
        const emptyData = { username: '', password: '', manualAttendanceCommentCompulsory: false, enable_cof: null, epf_no: '', sac_code: '' };
        setProfileData(emptyData);
        setOriginalData(emptyData);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const hasChanges =
      profileData.username !== originalData.username ||
      profileData.password !== originalData.password ||
      profileData.manualAttendanceCommentCompulsory !== originalData.manualAttendanceCommentCompulsory ||
      profileData.enable_cof !== originalData.enable_cof ||
      profileData.epf_no !== originalData.epf_no ||
      profileData.sac_code !== originalData.sac_code;
    
    setIsDirty(hasChanges);
    if (onDirtyChange) {
      onDirtyChange(hasChanges);
    }
  }, [profileData, originalData, onDirtyChange]);

  useImperativeHandle(ref, () => ({
    save: async () => {
      try {
        setIsLoading(true);
        setError('');
        await ApiService.updateCompanyProfile({
          username: profileData.username,
          password: profileData.password,
          manualAttendanceCommentCompulsory: profileData.manualAttendanceCommentCompulsory,
          enable_cof: profileData.enable_cof,
          epf_no: profileData.epf_no,
          sac_code: profileData.sac_code
        });
        setOriginalData({ ...profileData });
        setIsDirty(false);
        if (onDirtyChange) {
          onDirtyChange(false);
        }
      } catch (err) {
        const errorMessage = err.error || err.message || 'Failed to update company profile';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    isDirty: () => isDirty
  }));

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleUsernameChange = (e) => {
    handleInputChange('username', e.target.value);
  };

  const handlePasswordChange = (e) => {
    handleInputChange('password', e.target.value);
  };

  const handleManualAttendanceCommentCompulsoryChange = (e) => {
    handleInputChange('manualAttendanceCommentCompulsory', e.target.checked);
  };

  const handleEnableCofChange = (e) => {
    handleInputChange('enable_cof', e.target.checked ? true : null);
  };

  const handleEpfNoChange = (e) => {
    handleInputChange('epf_no', e.target.value);
  };

  const handleSacCodeChange = (e) => {
    handleInputChange('sac_code', e.target.value);
  };

  return (
    <>
      {/* Separator */}
      <div className="my-8 border-t border-gray-200"></div>

      {/* Company Profile Section */}
      <div className="mb-6">
        <div className="flex mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            Company Profile
          </h3>
        </div>
        <p className="text-gray-600 mb-6 text-sm">
          Django/external system credentials for company integration.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Credentials fields */}
        <div className="space-y-4">
          <div>
            <label className="flex items-center text-gray-700 font-medium mb-2">
              <User className="w-4 h-4 text-gray-600 mr-2" />
              Username
            </label>
            <input
              type="text"
              value={profileData.username}
              onChange={handleUsernameChange}
              placeholder="Enter Django/external system username"
              disabled={isLoading || parentLoading}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="flex items-center text-gray-700 font-medium mb-2">
              <Key className="w-4 h-4 text-gray-600 mr-2" />
              Password
            </label>
            <input
              type="password"
              value={profileData.password}
              onChange={handlePasswordChange}
              placeholder="Enter Django/external system password"
              disabled={isLoading || parentLoading}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

        </div>

        <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <ToggleSwitch
            label={
              <span className="flex items-center gap-2">
                Manual attendance comment compulsory
              </span>
            }
            checked={profileData.manualAttendanceCommentCompulsory}
            onChange={handleManualAttendanceCommentCompulsoryChange}
          />
          <ToggleSwitch
            label="Compensatory Off (COF)"
            checked={profileData.enable_cof === true}
            onChange={handleEnableCofChange}
            description="Allow compensatory off credits when employees work on weekly offs or holidays"
          />
        </div>


          <div>
            <label className="flex items-center text-gray-700 font-medium mb-2 mt-2">
              <FileBadge className="w-4 h-4 text-gray-600 mr-2" />
              EPF Number
            </label>
            <input
              type="text"
              value={profileData.epf_no}
              onChange={handleEpfNoChange}
              placeholder="e.g. GNGGNXXXXXXXX"
              maxLength={50}
              disabled={isLoading || parentLoading}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="flex items-center text-gray-700 font-medium mb-2 mt-2">
              <FileBadge className="w-4 h-4 text-gray-600 mr-2" />
              SAC Code
            </label>
            <input
              type="text"
              value={profileData.sac_code}
              onChange={handleSacCodeChange}
              placeholder="e.g. 998513"
              maxLength={20}
              disabled={isLoading || parentLoading}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
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

export { CompanyProfile };
