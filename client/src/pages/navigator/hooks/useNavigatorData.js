import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getMasterModules, getMasterCategories } from "@data/getMasterModules";
import { reports as reportModules, categories as reportCategories } from "@data/getReportModules";
import { useDataContext, hasPermission } from "@context/startup/useDataContext";

const useNavigatorData = (searchTerm, categoryFilter) => {
  const navigate = useNavigate();
  const dataContext = useDataContext();

  const handleOpenMaster = useCallback((path) => {
    navigate(`/admin/master/${path}`);
  }, [navigate]);

  // Source data
  const masterModules = useMemo(() => getMasterModules(handleOpenMaster), [handleOpenMaster]);
  const masterCategories = useMemo(() => getMasterCategories(), []);
  const reportCategoriesData = useMemo(
    () => reportCategories.filter((c) => c.id !== "all"),
    []
  );

  // Combined categories for filter
  const allCategories = useMemo(() => {
    const masterCats = masterCategories.map(cat => ({ id: `master-${cat.name}`, name: cat.name, type: 'master' }));
    const reportCats = reportCategoriesData.map(cat => ({ id: `report-${cat.id}`, name: cat.name, type: 'report' }));
    return [{ id: 'all', name: 'All Categories', type: 'all' }, ...masterCats, ...reportCats];
  }, [masterCategories, reportCategoriesData]);

  // Search filter
  const matchesSearch = useCallback((text) => {
    const term = searchTerm.trim().toLowerCase();
    if (term.length < 2) return true;
    return text.toLowerCase().includes(term);
  }, [searchTerm]);

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

        const hasAccess = module.skipPermissionCheck || hasPermission(permission, dataContext);

        const textBucket = [
          module.title,
          module.description,
          module.keywords,
          ...(module.tags || []),
        ]
          .filter(Boolean)
          .join(" ");

        if (!matchesSearch(textBucket)) return null;

        const enrichedModule = {
          ...module,
          hasAccess,
          permissionName: permission,
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
  }, [dataContext, masterModules, matchesSearch, categoryFilter]);

  // Process reports with permissions and category filtering
  const allReports = useMemo(() => {
    return reportModules
      .map((report) => {
        const permissionName = report.permissionName || `read_${report.id}`;
        const hasAccess = hasPermission(permissionName, dataContext);

        const textBucket = [report.title, report.desc].filter(Boolean).join(" ");
        if (!matchesSearch(textBucket)) return null;

        const enrichedReport = {
          ...report,
          hasAccess,
          permissionName,
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
  }, [dataContext, matchesSearch, categoryFilter]);

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

  return {
    allCategories,
    allMasters,
    allReports,
    masterStats,
    reportStats,
    handleMasterClick,
    handleReportClick,
  };
};

export { useNavigatorData };

