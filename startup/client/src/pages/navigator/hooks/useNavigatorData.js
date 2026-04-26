import { useMemo, useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMasterModules, getMasterCategories } from "@data/getMasterModules";
import { getAppModuleDefinitions } from "@data/getAppModules";
import { reports as reportModules, categories as reportCategories } from "@data/getReportModules";
import { useDataContext, hasPermission } from "@context/useDataContext";
import { ApiService } from "@services/ApiService";
import { getPermissionSubscriptionStatus } from "@startup/components/admin/role_permissions/utils/permissionUtils";

const getAppModuleColorByNature = (module) => {
  const category = (module?.category || "").toLowerCase();
  const title = (module?.title || "").toLowerCase();

  if (category.includes("navigation") || title.includes("navigator")) return "indigo";
  if (category.includes("attendance") || title.includes("biometric")) return "teal";
  if (category.includes("analytics") || title.includes("dashboard")) return "purple";
  if (category.includes("reports") || title.includes("report")) return "orange";
  if (category.includes("masters") || title.includes("master")) return "blue";
  if (category.includes("administration") || title.includes("permission") || title.includes("user")) return "red";
  if (category.includes("wagemaster") || title.includes("activity")) return "warning";
  if (category.includes("superadmin") || title.includes("subscription")) return "secondary";
  if (category.includes("help") || title.includes("guide")) return "green";

  return "primary";
};

const isSuperadminCategory = (module) =>
  (module?.category || "").toLowerCase() === "superadmin";

/**
 * Resolves subscription status for a permission.
 * Returns null if the module should be hidden from the current user.
 */
function resolveSubscriptionStatus(permissionId, companySubscriptions, userData) {
  let subscriptionStatus = null;
  let isSubscribed = true;
  let isHidden = false;

  if (permissionId && companySubscriptions.length > 0) {
    subscriptionStatus = getPermissionSubscriptionStatus(companySubscriptions, permissionId);
    isHidden = subscriptionStatus === 'hidden';

    if (isHidden) {
      if (!userData?.isSupportUser) return null;
      isSubscribed = true;
    } else {
      isSubscribed = subscriptionStatus === 'subscribed';
    }
  }

  return { subscriptionStatus, isSubscribed, isHidden };
}

function buildTextBucket(module) {
  return [module.title, module.description, module.keywords, ...(module.tags || [])]
    .filter(Boolean)
    .join(' ');
}

const useNavigatorData = (searchTerm, categoryFilter) => {
  const navigate = useNavigate();
  const dataContext = useDataContext();
  const { userData } = dataContext;
  const [companySubscriptions, setCompanySubscriptions] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch company subscriptions and permissions
  useEffect(() => {
    const fetchSubscriptions = async () => {
      setLoading(true);
      try {
        const companyId = userData?.companyId || userData?.company?.id;
        if (companyId) {
          const [subscriptionsResponse, permissionsResponse] = await Promise.all([
            ApiService.getCompanySubscriptions(companyId),
            ApiService.getPermissions(),
          ]);
          
          const subscriptionsData = subscriptionsResponse?.data?.data || subscriptionsResponse?.data || [];
          const permissionsData = permissionsResponse?.data?.data || permissionsResponse?.data || [];
          
          setCompanySubscriptions(subscriptionsData);
          setPermissions(permissionsData);
        } else {
          // No company ID, set empty arrays
          setCompanySubscriptions([]);
          setPermissions([]);
        }
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        // On error, set empty arrays
        setCompanySubscriptions([]);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
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

  // Create permission name to ID mapping
  const permissionNameToIdMap = useMemo(() => {
    const map = {};
    if (permissions && Array.isArray(permissions)) {
      permissions.forEach(perm => {
        if (perm.name) {
          map[perm.name.toLowerCase()] = perm.id;
        }
      });
    }
    return map;
  }, [permissions]);

  // Process masters with permissions and category filtering
  const allMasters = useMemo(() => {
    return masterModules
      .map((module) => {
        let permission = module.permissionName;
        if (!permission) {
          permission = module.id
            ? `read_${module.id}`
            : `read_${module.title.toLowerCase().replace(/ /g, "_")}`;
        }

        const hasPermissionAccess = module.skipPermissionCheck || hasPermission(permission, dataContext);
        
        // Check subscription status
        const permissionId = permissionNameToIdMap[permission.toLowerCase()];
        const subStatus = resolveSubscriptionStatus(permissionId, companySubscriptions, userData);
        if (!subStatus) return null;
        const { subscriptionStatus, isSubscribed, isHidden } = subStatus;

        if (!matchesSearch(buildTextBucket(module))) return null;

        // hasAccess = has permission AND is subscribed (for enabling/disabling)
        // hasPermissionAccess = whether they have the role permission (for showing correct message)
        const enrichedModule = {
          ...module,
          hasAccess: hasPermissionAccess && isSubscribed, // Must have both permission and subscription to access
          hasPermissionAccess, // Track permission separately for tooltip
          permissionName: permission,
          subscriptionStatus,
          isSubscribed,
          isHidden,
        };

        // Filter by category if not "all"
        if (categoryFilter !== 'all') {
          if (categoryFilter.startsWith('master-')) {
            const filterCategory = categoryFilter.replace('master-', '');
            if (module.category !== filterCategory) return null;
          } else {
            return null; // If filtering by report category, exclude masters
          }
        }

        return enrichedModule;
      })
      .filter(Boolean)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [dataContext, masterModules, matchesSearch, categoryFilter, companySubscriptions, permissionNameToIdMap, userData]);

  // Process app modules with permissions and category filtering
  const allAppModules = useMemo(() => {
    return appModuleDefinitions
      .map((module) => {
        if (isSuperadminCategory(module)) {
          return null;
        }

        const permissionName = module.permissionName || `read_${module.id}`;
        const hasPermissionAccess = module.requireSupportUser
          ? Boolean(userData?.isSupportUser)
          : (module.skipPermissionCheck || hasPermission(permissionName, dataContext));

        const permissionId = permissionNameToIdMap[permissionName.toLowerCase()];
        const subStatus = resolveSubscriptionStatus(permissionId, companySubscriptions, userData);
        if (!subStatus) return null;
        const { subscriptionStatus, isSubscribed, isHidden } = subStatus;

        if (!matchesSearch(buildTextBucket(module))) return null;

        const enrichedModule = {
          ...module,
          color: module.color || getAppModuleColorByNature(module),
          hasAccess: hasPermissionAccess && isSubscribed,
          hasPermissionAccess,
          permissionName,
          subscriptionStatus,
          isSubscribed,
          isHidden,
          onClick: () => navigate(module.navigatePath),
        };

        if (categoryFilter !== "all") {
          if (categoryFilter.startsWith("module-")) {
            const filterCategory = categoryFilter.replace("module-", "");
            if (module.category !== filterCategory) return null;
          } else {
            return null;
          }
        }

        return enrichedModule;
      })
      .filter(Boolean)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [appModuleDefinitions, categoryFilter, companySubscriptions, dataContext, matchesSearch, navigate, permissionNameToIdMap, userData]);

  // Process reports with permissions and category filtering
  const allReports = useMemo(() => {
    return reportModules
      .map((report) => {
        const permissionName = report.permissionName || `read_${report.id}`;
        const hasPermissionAccess = hasPermission(permissionName, dataContext);
        
        // Check subscription status
        const permissionId = permissionNameToIdMap[permissionName.toLowerCase()];
        let subscriptionStatus = null;
        let isSubscribed = true;
        let isHidden = false;
        
        if (permissionId && companySubscriptions.length > 0) {
          subscriptionStatus = getPermissionSubscriptionStatus(companySubscriptions, permissionId);
          isHidden = subscriptionStatus === 'hidden';
          
          // Hidden means subscribed but hidden - only show to superadmins
          if (isHidden) {
            if (!userData?.isSupportUser) {
              return null; // Hide this report from non-superadmins
            }
            // For superadmins, hidden permissions are subscribed (enabled)
            isSubscribed = true;
          } else {
            isSubscribed = subscriptionStatus === 'subscribed';
          }
        }

        const textBucket = [report.title, report.desc].filter(Boolean).join(" ");
        if (!matchesSearch(textBucket)) return null;

        // hasAccess = has permission AND is subscribed (for enabling/disabling)
        // hasPermissionAccess = whether they have the role permission (for showing correct message)
        const enrichedReport = {
          ...report,
          hasAccess: hasPermissionAccess && isSubscribed, // Must have both permission and subscription to access
          hasPermissionAccess, // Track permission separately for tooltip
          permissionName,
          subscriptionStatus,
          isSubscribed,
          isHidden,
        };

        // Filter by category if not "all"
        if (categoryFilter !== 'all') {
          if (categoryFilter.startsWith('report-')) {
            const filterCategory = categoryFilter.replace('report-', '');
            if (report.category !== filterCategory) return null;
          } else {
            return null; // If filtering by master category, exclude reports
          }
        }

        return enrichedReport;
      })
      .filter(Boolean)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [dataContext, matchesSearch, categoryFilter, companySubscriptions, permissionNameToIdMap, userData]);

  // Calculate statistics
  const masterStats = useMemo(() => {
    const total = allMasters.length;
    const accessible = allMasters.filter(module => module.hasAccess).length;
    return { total, accessible, restricted: total - accessible };
  }, [allMasters]);

  const reportStats = useMemo(() => {
    const total = allReports.length;
    const accessible = allReports.filter(report => report.hasAccess).length;
    return { total, accessible, restricted: total - accessible };
  }, [allReports]);

  const appModuleStats = useMemo(() => {
    const total = allAppModules.length;
    const accessible = allAppModules.filter(module => module.hasAccess).length;
    return { total, accessible, restricted: total - accessible };
  }, [allAppModules]);

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

