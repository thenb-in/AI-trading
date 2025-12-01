import { useMultiCompanyModule } from './hooks/useMultiCompanyModule';
import { CompanyCreateForm } from './components/CompanyCreateForm';
import { CompanyList } from './components/CompanyList';
import { AlertMessage } from '../RolePermissions/components/AlertMessage';

const MultiCompanyModule = () => {
  const {
    companies,
    activeCompanyId,
    activeCompanyName,
    loading,
    creating,
    error,
    createError,
    fetchCompanies,
    handleSwitch,
    handleCreate,
  } = useMultiCompanyModule();

  return (
    <div className="p-6 max-w-5xl flex justify-center flex-col mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Multi Company Module</h1>
        <p className="text-gray-600">Create, view, and switch between companies.</p>
      </div>

      {error && (
        <div className="mb-4">
          <AlertMessage type="error" message={String(error)} onDismiss={fetchCompanies} />
        </div>
      )}

      <CompanyCreateForm onCreate={handleCreate} creating={creating} createError={createError} />

      <div className="mt-8">
        <CompanyList
          companies={companies}
          activeCompanyId={activeCompanyId}
          activeCompanyName={activeCompanyName}
          onSwitch={handleSwitch}
          loading={loading}
        />
      </div>
    </div>
  );
};

export { MultiCompanyModule };