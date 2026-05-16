import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  Calendar, 
  User, 
  Filter, 
  Clock, 
  FileText,
  ArrowLeft 
} from "lucide-react";
import { pastReportApi } from "@app/services/api";
import { toast } from "react-toastify";
import { parseDateValue } from "@utils/dateTimeUtils";

const PastReportPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
console.log("Rendering PastReportPage");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await pastReportApi.getAllPastReports();
      
      // Check if response is an array
      if (Array.isArray(response.data)) {
        // Verify that each item has id and name
        if (response.data.length > 0 && response.data.every(item => 
          item && typeof item === 'object' && 'id' in item && 'name' in item
        )) {
          setReports(response.data);
        } else {
          setReports([]);
          toast.info('No valid reports found');
        }
      } else {
        setReports([]);
        toast.info('Invalid reports data format');
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      toast.error('Failed to load past reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filterMap = useMemo(() => ({
    employee: { prefix: "Employee", value: (filters) => filters.employee },
    start_date: { prefix: "Start", value: (filters) => filters.start_date },
    end_date: { prefix: "End", value: (filters) => filters.end_date },
    department: { prefix: "Dept", value: (filters) => filters.department },
    employment_type: { prefix: "Type", value: (filters) => filters.employment_type },
    terminal: { prefix: "Terminal", value: (filters) => filters.terminal },
    show_ot_short: { prefix: "OT/Short", value: (filters) => filters.show_ot_short ? "True" : null },
    show_attendance: { prefix: "Attendance", value: (filters) => filters.show_attendance ? "True" : null },
    show_summary_view: { prefix: "Summary", value: (filters) => filters.show_summary_view ? "True" : null },
    show_shift_details: { prefix: "Shift Details", value: (filters) => filters.show_shift_details ? "True" : null },
    show_working_hours: { prefix: "Working Hours", value: (filters) => filters.show_working_hours ? "True" : null },
    show_attendance_timings: { prefix: "Timings", value: (filters) => filters.show_attendance_timings ? "True" : null },
    is_horizontal: { prefix: "Horizontal", value: (filters) => filters.is_horizontal ? "True" : null },
    is_print_view: { prefix: "Print View", value: (filters) => filters.is_print_view ? "True" : null },
    show_late_early: { prefix: "Late/Early", value: (filters) => filters.show_late_early ? "True" : null }
  }), []);

  const formatFilters = useCallback((filters) => {
    if (!filters) return [];
    
    return Object.entries(filterMap)
      .map(([, { prefix, value }]) => {
        const filterValue = value(filters);
        return filterValue ? `${prefix}: ${filterValue}` : null;
      })
      .filter(Boolean);
  }, [filterMap]);

  const handleViewClick = useCallback(async (id) => {
    // const toastId = toast.loading('Loading report data...');
    try {
      const response = await pastReportApi.getReportById(id);
      toast.success('Report data loaded successfully!');
      navigate('/admin/report', { 
        state: { 
          reportData: response.data.report_data, 
          columns: response.data.columns,
          reportName: response.data.name, 
          filters: response.data.filters
        } 
      });
    } catch (err) {
      console.error("Failed to fetch report:", err);
      toast.error('Failed to load report data.');
    }
  }, [navigate]);

  const handleBackClick = useCallback(() => {
    navigate("/admin/report");
  }, [navigate]);

  const formatDate = useCallback((dateString) => {
    const date = parseDateValue(dateString);
    if (!date) return { date: '', time: '' };
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center max-w-md">
          <p className="text-gray-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 w-full">
        {/* Header Section */}
        <div className="mb-8">
          <button
            onClick={handleBackClick}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="font-medium">Back to Reports</span>
          </button>
          
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg shadow">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Past Reports</h1>
          </div>
          <p className="text-gray-600">
            View and manage previously generated reports
          </p>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Reports Available
            </h3>
            <p className="text-gray-500">
              There are no past reports to display.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Reports Overview ({reports.length} total)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Report Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applied Filters
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report, index) => {
                    const { date, time } = formatDate(report.created_at);
                    return (
                      <tr
                        key={report.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                            <span className="text-sm font-semibold text-blue-600">
                              {index + 1}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              <FileText className="h-5 w-5 text-gray-400" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900 mb-1">
                                {report.name}
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <User className="h-3 w-3 mr-1" />
                                Created by {report.user?.username || 'Unknown'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            <div>
                              <div className="font-medium">
                                {date}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {time}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            {formatFilters(report.filters).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {formatFilters(report.filters).map(
                                  (filter, idx) => (
                                    <span 
                                      key={idx} 
                                      className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
                                    >
                                      {filter}
                                    </span>
                                  )
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500 italic">
                                No filters applied
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleViewClick(report.id)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Report
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { PastReportPage };