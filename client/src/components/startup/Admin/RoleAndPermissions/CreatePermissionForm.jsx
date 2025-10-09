import { Save, ArrowLeft, Loader2, X } from 'lucide-react';
import { useCreatePermission } from './hooks/useCreatePermission';
import AlertMessage from './components/AlertMessage';

const CreatePermissionForm = () => {
  const {
    formData,
    loading,
    error,
    success,
    validationErrors,
    handleInputChange,
    handleSubmit,
    handleBack,
    clearMessages
  } = useCreatePermission();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                <Save className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create New Permission</h1>
                <p className="text-gray-600 mt-1">Define a new permission for role-based access control</p>
              </div>
            </div>
            <button
              onClick={handleBack}
              className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Management
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                />
              )}
            </div>
          )}

          {/* Form Content */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-3">
                  Permission Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter permission name (e.g., read_users, write_posts)"
                  className={`w-full px-4 py-4 border-2 rounded-xl focus:outline-none focus:bg-white bg-gray-50 transition-all duration-200 text-lg ${
                    validationErrors.name 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-emerald-500'
                  }`}
                />
                {validationErrors.name && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <X className="h-4 w-4 mr-1" />
                    {validationErrors.name}
                  </p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  {formData.name.length}/50 characters
                </p>
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-3">
                  Type *
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-4 border-2 rounded-xl focus:outline-none focus:bg-white bg-gray-50 transition-all duration-200 text-lg ${
                    validationErrors.type 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-emerald-500'
                  }`}
                >
                  <option value="module">module</option>
                  <option value="action">action</option>
                </select>
                {validationErrors.type && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <X className="h-4 w-4 mr-1" />
                    {validationErrors.type}
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-3">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Enter permission description (optional)"
                  className={`w-full px-4 py-4 border-2 rounded-xl focus:outline-none focus:bg-white bg-gray-50 transition-all duration-200 resize-vertical min-h-[120px] text-lg ${
                    validationErrors.description 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-emerald-500'
                  }`}
                />
                {validationErrors.description && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <X className="h-4 w-4 mr-1" />
                    {validationErrors.description}
                  </p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  {formData.description.length}/500 characters
                </p>
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-xl disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 border-b-2 border-white mr-3 animate-spin" />
                      Creating Permission...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Save className="mr-3" size={24} />
                      Create Permission
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePermissionForm;
