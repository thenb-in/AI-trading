import { forwardRef } from 'react';
import PropTypes from 'prop-types';

const CompanyProfile = forwardRef(({ isLoading: _isLoading, onDirtyChange: _onDirtyChange }, _ref) => {
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
          Company profile settings and configuration.
        </p>

        {/* Template content area */}
        <div className="space-y-4">
          {/* Add your company profile fields here */}
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
