import { useMemo, useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMasterModules, getMasterCategories } from "@data/getMasterModules";
import { getAppModuleDefinitions } from "@data/getAppModules";
import { reports as reportModules, categories as reportCategories } from "@data/getReportModules";
import { getModulePermissionName } from "@data/getModulePermissionName";
import { canSeeModule } from "@data/canSeeModule";
import { useDataContext } from "@context/useDataContext";
import { ApiService } from "@services/ApiService";
import { getPermissionSubscriptionStatusByName } from "@startup/components/admin/role_permissions/utils/permissionUtils";

const isSuperadminCategory = (module) =>
  (module?.category || "").toLowerCase() === "superadmin";

/**
 * `{ subscriptionStatus, isSubscribed, isHidden }` for a card, or null to say
 * "do not show this one" — a hidden permission is subscribed but advertised to
 * support staff only, so everyone else never sees the card.
 */
function resolveSubscriptionStatus(permissionName, companySubscriptions, userData) {
  if (!permissionName || companySubscriptions.length === 0) {
    return { subscriptionStatus: null, isSubscribed: true, isHidden: false };
  }
  const subscriptionStatus = getPermissionSubscriptionStatusByName(companySubscriptions, permissionName);
  const isHidden = subscriptionStatus === 'hidden';
  if (isHidden) {
    if (!userData?.isSupportUser) return null;
    return { subscriptionStatus, isSubscribed: true, isHidden };
  }
  return { subscriptionStatus, isSubscribed: subscriptionStatus === 'subscribed', isHidden };
}

const useNavigatorData = (searchTerm, categoryFilter) => {
  const navigate = useNavigate();
  const { userData } = useDataContext();
  const [companySubscriptions, setCompanySubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const companyId = userData?.companyId || userData?.company?.id;
    if (!companyId) {
      setCompanySubscriptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    ApiService.getCompanySubscriptions(companyId)
      .then((response) => setCompanySubscriptions(response?.data?.data || response?.data || []))
      .catch((error) => {
        console.error(`Navigator: could not load subscriptions for company ${companyId}`, error);
        setCompanySubscriptions([]);
      })
      .finally(() => setLoading(false));
  }, [userData]);

  const handleOpenMaster = useCallback((path) => {
    navigate(`/admin/master/${path}`);
  }, [navigate]);

  // Source data
  const masterModules = useMemo(() => getMasterModules(handleOpenMaster), [handleOpenMaster]);
  const masterCategories = useMemo(() => getMasterCategories(), []);
  const appModuleDefinitions = useMemo(() => getAppModuleDefinitions(), []);
  const appCategories = useMemo(() => {
    const categoryCounts = {};
    appModuleDefinitions.forEach((module) => {
      if (isSuperadminCategory(module)) return;
      const category = module.category || "Uncategorized";
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [appModuleDefinitions]);
  const reportCategoriesData = useMemo(
    () => reportCategories.filter((c) => c.id !== "all"),
    []
  );

  // Combined categories for filter
  const allCategories = useMemo(() => {
    const masterCats = masterCategories.map(cat => ({ id: `master-${cat.name}`, name: cat.name, type: 'master' }));
    const appCats = appCategories.map(cat => ({ id: `module-${cat.name}`, name: cat.name, type: 'module' }));
    const reportCats = reportCategoriesData.map(cat => ({ id: `report-${cat.id}`, name: cat.name, type: 'report' }));
    return [{ id: 'all', name: 'All Categories', type: 'all' }, ...appCats, ...masterCats, ...reportCats];
  }, [appCategories, masterCategories, reportCategoriesData]);

  // Search filter
  const matchesSearch = useCallback((text) => {
    const term = searchTerm.trim().toLowerCase();
    if (term.length < 2) return true;
    return text.toLowerCase().includes(term);
  }, [searchTerm]);

  /**
   * A card, as the navigator shows it: may they open it, and if not, why —
   * their role lacks the permission, or their plan does not carry it. Returns
   * null for a definition that should not be listed at all: it does not match
   * the search, is filtered out by category, or is hidden from this user.
   */
  const enrich = useCallback((definition, { searchText, categoryPrefix }) => {
    const permissionName = getModulePermissionName(definition);
    const subscription = resolveSubscriptionStatus(permissionName, companySubscriptions, userData);
    if (subscription === null) return null;
    if (!matchesSearch(searchText.filter(Boolean).join(" "))) return null;

    if (categoryFilter !== "all") {
      if (!categoryFilter.startsWith(`${categoryPrefix}-`)) return null;
      if (definition.category !== categoryFilter.replace(`${categoryPrefix}-`, "")) return null;
    }

    const hasPermissionAccess = canSeeModule(definition, userData);
    return {
      ...definition,
      // Opening a card needs both: the role grants it and the plan carries it.
      // They are kept apart so the card can say which one is missing.
      hasAccess: hasPermissionAccess && subscription.isSubscribed,
      hasPermissionAccess,
      permissionName,
      ...subscription
    };
  }, [companySubscriptions, userData, matchesSearch, categoryFilter]);

  const byTitle = (a, b) => a.title.localeCompare(b.title);

  const allMasters = useMemo(
    () => masterModules
      .map((module) => enrich(module, {
        searchText: [module.title, module.description, module.keywords, ...(module.tags || [])],
        categoryPrefix: "master"
      }))
      .filter(Boolean)
      .sort(byTitle),
    [masterModules, enrich]
  );

  const allAppModules = useMemo(
    () => appModuleDefinitions
      .filter((module) => !isSuperadminCategory(module))
      .map((module) => {
        const enriched = enrich(module, {
          searchText: [module.title, module.description, module.keywords, ...(module.tags || [])],
          categoryPrefix: "module"
        });
        return enriched && { ...enriched, onClick: () => navigate(module.navigatePath) };
      })
      .filter(Boolean)
      .sort(byTitle),
    [appModuleDefinitions, enrich, navigate]
  );

  const allReports = useMemo(
    () => reportModules
      .map((report) => enrich(report, {
        searchText: [report.title, report.desc],
        categoryPrefix: "report"
      }))
      .filter(Boolean)
      .sort(byTitle),
    [enrich]
  );

  const countAccess = (items) => ({
    total: items.length,
    accessible: items.filter((item) => item.hasAccess).length,
    restricted: items.filter((item) => !item.hasAccess).length
  });

  const masterStats = useMemo(() => countAccess(allMasters), [allMasters]);
  const reportStats = useMemo(() => countAccess(allReports), [allReports]);
  const appModuleStats = useMemo(() => countAccess(allAppModules), [allAppModules]);

  // Handle clicks
  const handleReportClick = useCallback(
    (report) => {
      if (report.hasAccess) {
        navigate(`/admin/report/${report.slug}`);
      }
    },
    [navigate]
  );

  const handleMasterClick = useCallback((module) => {
    if (module.hasAccess && module.onClick) {
      module.onClick();
    }
  }, []);

  const handleAppModuleClick = useCallback((module) => {
    if (module.hasAccess && module.onClick) {
      module.onClick();
    }
  }, []);

  return {
    allCategories,
    allAppModules,
    allMasters,
    allReports,
    appModuleStats,
    masterStats,
    reportStats,
    handleAppModuleClick,
    handleMasterClick,
    handleReportClick,
    loading,
  };
};

export { useNavigatorData };

