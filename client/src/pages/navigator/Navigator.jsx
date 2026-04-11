import { useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { SearchHeader } from "./components/SearchHeader";
import { ModuleGrid } from "./components/ModuleGrid";
import { useNavigatorData } from "./hooks/useNavigatorData";

const Navigator = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const headerRef = useRef(null);

  const {
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
  } = useNavigatorData(searchTerm, categoryFilter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading navigator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-[1700px] mx-auto w-full">
        <SearchHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          allCategories={allCategories}
          headerRef={headerRef}
        />

        <div className="mt-4">
          <ModuleGrid
            appModules={allAppModules}
            masters={allMasters}
            reports={allReports}
            appModuleStats={appModuleStats}
            masterStats={masterStats}
            reportStats={reportStats}
            onAppModuleClick={handleAppModuleClick}
            onMasterClick={handleMasterClick}
            onReportClick={handleReportClick}
            searchTerm={searchTerm}
          />
        </div>
      </div>
    </div>
  );
};

export { Navigator };
