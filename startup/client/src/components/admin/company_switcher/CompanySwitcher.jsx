import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader2, Check, Building2 } from 'lucide-react';
import { ApiService } from '@services/ApiService';
import { useDataContext } from '@context/useDataContext';
import { getApiErrorMessage } from '@utils/apiErrorMessage';

// A switch-only view of the companies this user is assigned to. Unlike the
// support-staff Multi-Company Setup page it carries no create/assign/subscription
// tools — it only lets a group business user move their active company.
const CompanySwitcher = () => {
  const { userData } = useDataContext();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(null);

  const activeCompanyId = useMemo(
    () => userData?.companyId || userData?.company?.id || null,
    [userData]
  );

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.getUserCompanies();
      const list = res?.data?.companies || [];
      setCompanies([...list].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to load your companies'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSwitch = useCallback(async (companyId) => {
    if (companyId === activeCompanyId) return;
    setSwitching(companyId);
    try {
      await ApiService.switchCompany(companyId);
      // A full reload reissues role & permissions for the new company.
      window.location.reload();
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to switch company'));
      setSwitching(null);
    }
  }, [activeCompanyId]);

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Switch Company</h1>
      <p className="text-sm text-gray-600 mb-6">Move your active company to any you are assigned to.</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border">
          You are not assigned to any company yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {companies.map((company) => {
            const isActive = company.id === activeCompanyId;
            return (
              <div key={company.id} className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{company.name}</div>
                    <div className="text-xs text-gray-500">{company.id}</div>
                  </div>
                </div>
                {isActive ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
                    <Check className="w-4 h-4" /> Current
                  </span>
                ) : (
                  <button
                    onClick={() => handleSwitch(company.id)}
                    disabled={Boolean(switching)}
                    className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {switching === company.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Switch
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export { CompanySwitcher };
