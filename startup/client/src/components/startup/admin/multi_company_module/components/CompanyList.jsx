import PropTypes from 'prop-types';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { UserCompanyAssignmentModal } from './UserCompanyAssignmentModal';
import { CompanySubscriptionSelector } from './CompanySubscriptionSelector';
import { ApiService } from '@services/startup/ApiService';

const CompanyCard = ({ company, isActive, loading, handleSwitchClick, onAssignClick, onSubscriptionUpdate, availableSubscriptions }) => {
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
      <div className="flex items-center gap-2 ml-4">
        <CompanySubscriptionSelector
          companyId={company.id}
          availableSubscriptions={availableSubscriptions}
          onUpdate={onSubscriptionUpdate}
        />
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
  onSubscriptionUpdate: PropTypes.func,
  availableSubscriptions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
    })
  ),
};

const CompanyList = ({ companies, activeCompanyId, activeCompanyName, onSwitch, loading }) => {
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
    const [searchText, setSearchText] = useState('');
  const [debug, setDebug] = useState(false);
  const [availableSubscriptions, setAvailableSubscriptions] = useState([]);

  useEffect(() => {
    const fetchAvailableSubscriptions = async () => {
      try {
        const response = await ApiService.getAvailableSubscriptions();
        const subscriptions = response?.data?.data || [];
        setAvailableSubscriptions(subscriptions);
      } catch (error) {
        console.error('Error fetching available subscriptions', error);
        toast.error(error?.message || 'Failed to load available subscriptions');
      }
    };

    fetchAvailableSubscriptions();
  }, []);

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

  const filteredCompanies = (companies || []).filter((c) => {
    const name = (c.name || '').toLowerCase();
    const query = (searchText || '').trim().toLowerCase();
    if (debug) {
      return !query || name.includes(query);
    }
    return query && name === query;
  });

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

  <div className="mb-4">
    <input
      type="text"
      value={searchText}
      onChange={(e) => setSearchText(e.target.value)}
      placeholder={debug ? 'Search company name...' : 'Type full company name to show'}
      className="w-full max-w-md mx-auto block px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      aria-label="Filter companies by name"
    />
    <label className="flex items-center justify-center gap-2 mt-2 cursor-pointer text-sm text-gray-600">
      <input
        type="checkbox"
        checked={debug}
        onChange={(e) => setDebug(e.target.checked)}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        aria-label="Debug mode: show all companies and allow partial search"
      />
      debug
    </label>
  </div>

  {filteredCompanies.length === 0 ? (
    <div className="text-gray-500 py-6 bg-gray-50 rounded-xl border border-gray-200 text-center">
      {!debug && !(searchText || '').trim()
        ? 'Type the full company name above to show it.'
        : 'No companies match your search.'}
    </div>
  ) : (
  <ul className="grid gap-3">
    {filteredCompanies.map((c) => {
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
        onSubscriptionUpdate={handleAssignmentSuccess}
        availableSubscriptions={availableSubscriptions}
      />
    );})}
  </ul>
  )}

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


