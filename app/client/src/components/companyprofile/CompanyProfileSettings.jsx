import { forwardRef } from "react";
import PropTypes from "prop-types";


const CompanyProfileSettings = forwardRef(function CompanyProfileSettings( ) {


  return (
    <div className="space-y-4">
      No company profile fields
    </div>
  );
});

CompanyProfileSettings.propTypes = {
  isLoading: PropTypes.bool,
  onDirtyChange: PropTypes.func,
};

export { CompanyProfileSettings };
