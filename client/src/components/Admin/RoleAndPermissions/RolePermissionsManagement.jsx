import { Plus, Shield, Users, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRolePermissions } from './hooks/useRolePermissions';
import { usePermissionAssignment } from './hooks/usePermissionAssignment';
import RoleCard from './components/RoleCard';
import EmptyState from './components/EmptyState';
import PermissionSelector from './components/PermissionSelector';
import AlertMessage from './components/AlertMessage';
import LoadingState from './components/LoadingState';

const RolePermissionsManagement = () => {
  const navigate = useNavigate();
  
  const {
    roles,
    allPermissions,
    loading,
    error,
    success,
    retryCount,
    fetchData,
    addPermissionsToRole,
    removePermissionFromRole,
    clearMessages
  } = useRolePermissions();

  const {
    selectedRoleId,
    selectedPermissions,
    submitting,
    handleRoleChange,
    handlePermissionToggle,
    validateSelection,
    resetSelection,
    setSubmitting
  } = usePermissionAssignment(roles);

  const handleAddPermissions = async (e) => {
    e.preventDefault();
    
    const validation = validateSelection();
    if (!validation.valid) {
      return;
    }

    setSubmitting(true);
    clearMessages();

    const result = await addPermissionsToRole(selectedRoleId, selectedPermissions);
    
    if (result.success) {
      resetSelection();
    }
    
    setSubmitting(false);
  };

  const handleRemovePermission = async (roleId, permissionId) => {
    clearMessages();
    await removePermissionFromRole(roleId, permissionId);
  };

  if (loading) {
    return <LoadingState retryCount={retryCount} onRetry={fetchData} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Role & Permission Management</h1>
                <p className="text-gray-600 mt-1">Manage user roles and their associated permissions</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/admin/create-role')}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Role
              </button>
              <button
                onClick={() => navigate('/admin/create-permission')}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-medium rounded-lg hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Permission
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Alert Messages */}
          {(error || success) && (
            <div className="p-6 border-b border-gray-200">
              {error && (
                <AlertMessage 
                  type="error" 
                  message={error} 
                  onDismiss={() => clearMessages()} 
                />
              )}
              {success && (
                <AlertMessage 
                  type="success" 
                  message={success} 
                  onDismiss={() => clearMessages()} 
                />
              )}
            </div>
          )}

          {/* Main Content Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              {/* Current Roles & Permissions - Left Column */}
              <div className="xl:col-span-2">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">Current Roles & Permissions</h3>
                        <p className="text-sm text-gray-600">View and manage existing role-permission assignments</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {roles.length} {roles.length === 1 ? 'role' : 'roles'}
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                    {roles.length > 0 ? (
                      roles.map(role => (
                        <RoleCard
                          key={role.id}
                          role={role}
                          onRemovePermission={handleRemovePermission}
                        />
                      ))
                    ) : (
                      <EmptyState type="roles" />
                    )}
                  </div>
                </div>
              </div>

              {/* Add Permission Form - Right Column */}
              <div className="xl:col-span-1">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 sticky top-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Plus className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Add Permissions</h3>
                      <p className="text-sm text-gray-600">Assign permissions to roles</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleAddPermissions} className="space-y-6">
                    <div>
                      <label htmlFor="roleSelect" className="block text-sm font-medium text-gray-700 mb-3">
                        Select Role
                      </label>
                      <select
                        id="roleSelect"
                        value={selectedRoleId}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 bg-white transition-all duration-200 shadow-sm"
                      >
                        <option value="">Choose a role...</option>
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <PermissionSelector
                      allPermissions={allPermissions}
                      selectedPermissions={selectedPermissions}
                      onPermissionToggle={handlePermissionToggle}
                    />

                    <button
                      type="submit"
                      disabled={submitting || !selectedRoleId || selectedPermissions.length === 0}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg disabled:transform-none"
                    >
                      {submitting ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-5 w-5 border-b-2 border-white mr-2 animate-spin" />
                          Adding Permissions...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Plus className="mr-2" size={20} />
                          Add Selected Permissions ({selectedPermissions.length})
                        </div>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionsManagement;
