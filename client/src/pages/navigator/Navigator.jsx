import { useState, useRef } from "react";
import { SearchHeader } from "./components/SearchHeader";
import { ModuleGrid } from "./components/ModuleGrid";
import { useNavigatorData } from "./hooks/useNavigatorData";

const Navigator = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const headerRef = useRef(null);

  const {
    allCategories,
    allMasters,
    allReports,
    masterStats,
    reportStats,
    handleMasterClick,
    handleReportClick,
  } = useNavigatorData(searchTerm, categoryFilter);

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
            masters={allMasters}
            reports={allReports}
            masterStats={masterStats}
            reportStats={reportStats}
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
