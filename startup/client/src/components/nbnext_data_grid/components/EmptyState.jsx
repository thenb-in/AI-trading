import { Table } from "lucide-react";

function EmptyState() {
  return (
    <div className="flex flex-col h-[380px] w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <strong className="text-sm font-semibold text-slate-900">NbNext DataGrid</strong>
          <span className="text-xs text-gray-500">0 rows • 0 columns</span>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-slate-50 to-white p-6">
        <div className="text-center max-w-sm">
          {/* Icon */}
          <div className="mx-auto mb-4 w-20 h-20 flex items-center justify-center 
                          rounded-full bg-indigo-50 ring-1 ring-indigo-100 shadow-sm">
            <Table size={36} className="text-indigo-600" />
          </div>

          <h2 className="text-xl font-semibold text-slate-900">No data to display</h2>

          <p className="text-gray-600 text-sm mt-1">
            Try adjusting your filters or loading a different dataset.
          </p>

        </div>
      </div>
    </div>
  );
}

export { EmptyState };
