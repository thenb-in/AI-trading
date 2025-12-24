import PropTypes from 'prop-types';
import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { UserCompanyAssignmentModal } from './UserCompanyAssignmentModal';

const CompanyCard = ({ company, isActive, loading, handleSwitchClick, onAssignClick }) => {
  const handleCardClick = useCallback(() => {
    onAssignClick(company);
  }, [onAssignClick, company]);

  const handleSwitchButtonClick = useCallback((e) => {
    e.stopPropagation();
    handleSwitchClick(company.id);
  }, [handleSwitchClick, company.id]);

  const handleCodeClick = useCallback(async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(company.id);
      toast.success('Company code copied to clipboard');
    } catch {
      toast.error('Failed to copy company code');
    }
  }, [company.id]);

  return (
    <li className={`flex items-center justify-between p-4 border rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer ${isActive ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
      <div className="flex items-center gap-3 flex-1" onClick={handleCardClick}>
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
          {company.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900">{company.name}</div>
          <div 
            onClick={handleCodeClick}
            className="text-xs text-gray-500 mt-0.5 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
            title="Click to copy company code"
          >
            {company.id}
          </div>
          {isActive ? (
            <span className="inline-flex items-center text-xs mt-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-2 ml-4">
        <button
          onClick={handleSwitchButtonClick}
          disabled={isActive || loading}
          className={`px-3 py-2 rounded-lg text-sm text-white ${
            isActive ? 'bg-gray-400' : 'bg-gray-900 hover:bg-black'
          }`}
        >
          {isActive ? 'Current' : 'Switch'}
        </button>
      </div>
    </li>
  );
};

CompanyCard.propTypes = {
  company: PropTypes.shape({ id: PropTypes.string, name: PropTypes.string }).isRequired,
  isActive: PropTypes.bool.isRequired,
  loading: PropTypes.bool,
  handleSwitchClick: PropTypes.func.isRequired,
  onAssignClick: PropTypes.func.isRequired,
};

const CompanyList = ({ companies, activeCompanyId, activeCompanyName, onSwitch, loading }) => {
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const handleSwitchClick = useCallback((companyId) => {
    onSwitch(companyId);
  }, [onSwitch]);

  const handleAssignClick = (company) => {
    setSelectedCompany(company);
    setAssignmentModalOpen(true);
  };

  const handleAssignmentModalClose = () => {
    setAssignmentModalOpen(false);
    setSelectedCompany(null);
  };

  const handleAssignmentSuccess = () => {
    // Could refresh company data if needed
  };
  if (!companies?.length) {
    return (
      <div className="text-gray-500 py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 text-center">
        No companies linked yet.
      </div>
    );
  }

  return (
    <>
  <div className="text-center mb-4">
    <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-300 inline-block pb-2">
      Your Linked & Created Companies
    </h2>
    <p className="text-sm text-gray-600 mt-1">
      You can switch between your linked companies from the list below.
    </p>
  </div>

  <ul className="grid gap-3">
    {companies.map((c) => {
      const isActive = (activeCompanyId && c.id === activeCompanyId) || (activeCompanyName && c.name === activeCompanyName);
      return (
      <CompanyCard
        key={c.id}
        company={c}
        isActive={isActive}
        onSwitch={onSwitch}
        loading={loading}
        handleSwitchClick={handleSwitchClick}
        onAssignClick={handleAssignClick}
      />
    );})}
  </ul>

  <UserCompanyAssignmentModal
    isOpen={assignmentModalOpen}
    onClose={handleAssignmentModalClose}
    company={selectedCompany}
    onSuccess={handleAssignmentSuccess}
  />
</>

  );
};

CompanyList.propTypes = {
  companies: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, name: PropTypes.string })).isRequired,
  activeCompanyId: PropTypes.string,
  activeCompanyName: PropTypes.string,
  onSwitch: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export { CompanyList };


