import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { X, Loader2, UserPlus, UserMinus, Users } from 'lucide-react';
import { ApiService } from '../../../../../services/startup/ApiService';
import { useEscapeKey } from '../../../../../hooks/useEscapeKey';
import { toast } from 'react-toastify';

// Custom hook for managing company user assignment data
const useCompanyUserData = (isOpen, initialCompany) => {
  const [data, setData] = useState({
    users: [],
    companies: [],
    companyUsers: [],
    loading: false
  });

  // Normalize API response to array
  const normalizeResponse = (responseData) => {
    if (Array.isArray(responseData)) return responseData;
    if (responseData?.data && Array.isArray(responseData.data)) return responseData.data;
    return [];
  };

  const loadData = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true }));

    try {
      const [usersRes, companiesRes, companyUsersRes] = await Promise.all([
        ApiService.getSadminUsers(),
        ApiService.getAllCompanies(),
        initialCompany?.id ? ApiService.getCompanyUsers(initialCompany.id) : Promise.resolve({ data: [] })
      ]);

      setData({
        users: normalizeResponse(usersRes.data),
        companies: normalizeResponse(companiesRes.data),
        companyUsers: normalizeResponse(companyUsersRes.data),
        loading: false
      });
    } catch (error) {
      toast.error('Failed to load data');
      console.error('Error loading modal data:', error);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [initialCompany?.id]);

  const loadCompanyUsers = useCallback(async (companyId) => {
    try {
      const response = await ApiService.getCompanyUsers(companyId);
      setData(prev => ({
        ...prev,
        companyUsers: normalizeResponse(response.data)
      }));
    } catch (error) {
      toast.error('Failed to load company users');
      console.error('Error loading company users:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, loadData]);

  return { ...data, loadCompanyUsers };
};

function UserCompanyAssignmentModal({ isOpen, onClose, company, onSuccess }) {
  const { users, companies, companyUsers, loading, loadCompanyUsers } = useCompanyUserData(isOpen, company);

  const [selectedUser, setSelectedUser] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEscapeKey(onClose, isOpen);

  // Initialize selected company when companies load
  useEffect(() => {
    if (companies.length > 0 && !selectedCompany) {
      setSelectedCompany(company?.id || companies[0]?.id);
    }
  }, [companies, company?.id, selectedCompany]);

  // Load company users when selected company changes
  useEffect(() => {
    if (selectedCompany && selectedCompany !== company?.id) {
      loadCompanyUsers(selectedCompany);
    }
  }, [selectedCompany, company?.id, loadCompanyUsers]);

  const getAvailableUsers = useMemo(() => {
    const assignedUserIds = new Set(companyUsers.map(user => user.id || user.username));
    return users.filter(user => !assignedUserIds.has(user.id || user.username));
  }, [users, companyUsers]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const handleStopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleAssignUser = useCallback(async () => {
    if (!selectedUser || !selectedCompany) {
      toast.error('Please select both user and company');
      return;
    }

    setAssigning(true);
    try {
      await ApiService.assignUserToCompany(selectedUser, selectedCompany);
      toast.success('User assigned successfully');
      await loadCompanyUsers(selectedCompany);
      setSelectedUser('');
      onSuccess?.();
    } catch (error) {
      toast.error(error.message || 'Failed to assign user');
    } finally {
      setAssigning(false);
    }
  }, [selectedUser, selectedCompany, loadCompanyUsers, onSuccess]);

  const handleRemoveUser = useCallback(async (userId) => {
    setRemoving(userId);
    try {
      await ApiService.removeUserFromCompany(userId, selectedCompany);
      toast.success('User removed successfully');
      await loadCompanyUsers(selectedCompany);
      onSuccess?.();
    } catch (error) {
      toast.error(error.message || 'Failed to remove user');
    } finally {
      setRemoving(false);
    }
  }, [selectedCompany, loadCompanyUsers, onSuccess]);

  const handleClose = useCallback(() => {
    if (assigning || removing) return;
    setSelectedUser('');
    setSelectedCompany(company?.id || '');
    onClose();
  }, [assigning, removing, company?.id, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={handleStopPropagation}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assign Users to Company</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage user assignments for company: <span className="font-medium">{company?.name}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={assigning || removing}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Assignment Form */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Assign New User
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* User Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Super Admin User
                    </label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      disabled={assigning || loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {loading ? 'Loading users...' : 'Choose a user...'}
                      </option>
                      {getAvailableUsers.map((user) => (
                        <option key={user.id || user.username} value={user.id || user.username}>
                          {user.name || user.username} ({user.username || user.email || 'No username'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Company Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Company
                    </label>
                    <select
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      disabled={assigning || loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {loading ? 'Loading companies...' : 'Choose a company...'}
                      </option>
                      {companies.map((comp) => (
                        <option key={comp.id || comp.name} value={comp.id || comp.name}>
                          {comp.name || 'Unnamed Company'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Assign Button */}
                <button
                  onClick={handleAssignUser}
                  disabled={assigning || !selectedUser || !selectedCompany}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {assigning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assign User
                    </>
                  )}
                </button>
              </div>

              {/* Current Assignments */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Current Assignments for {companies.find(c => c.id === selectedCompany)?.name || company?.name}
                </h3>

                {(!Array.isArray(companyUsers) || companyUsers.length === 0) ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    No users assigned to this company yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {companyUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                            {user.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.username}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveUser(user.id)}
                          disabled={removing === user.id}
                          className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {removing === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserMinus className="w-4 h-4 mr-1" />
                              Remove
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

UserCompanyAssignmentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  company: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string
  }),
  onSuccess: PropTypes.func
};

export { UserCompanyAssignmentModal };
