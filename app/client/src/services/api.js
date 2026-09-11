import { api } from '@startup/services/axiosConfig';
import { runViaRunner } from '@startup/socket';
import { sanitizeHTML } from '@utils/formattingUtils';
import { getDeviceLocation } from '../utils/locationUtils';

// --------------------------------------------
// Employee API
// --------------------------------------------
const employeeApi = {
  getAllEmployees: (params = {}) => api.get('/employees', { params }),
  getAllEmployeesBasicData: (params = {}) => api.get('/employees/basic-data', { params }),
  getUnregisteredFaceEmployees: () => api.get('/employees/unregistered-faces'),
  getEmployeeByEmpCode: (empCode) => {
    if (!empCode) throw new Error('Employee code is required');
    return api.get(`/employees/${empCode}`);
  },
  createEmployee: (employeeData) => {
    if (!employeeData) throw new Error('Employee data is required');
    return api.post('/employees', employeeData);
  },
  syncEmployeeFromDevices: (empCode) => {
    if (!empCode) throw new Error('Employee code is required');
    const encoded = encodeURIComponent(String(empCode).trim());
    return api.post(`/employees/${encoded}/sync-from-devices`);
  },
  pushEmployeeToDevices: (empCode) => {
    if (!empCode) throw new Error('Employee code is required');
    const encoded = encodeURIComponent(String(empCode).trim());
    return api.post(`/employees/${encoded}/push-to-devices`);
  },
  getRegisteredTemplates: (empCode) => {
    if (!empCode) throw new Error('Employee code is required');
    const encoded = encodeURIComponent(String(empCode).trim());
    return api.get(`/employees/${encoded}/registered-templates`);
  },
  updateEmployee: (empCode, employeeData) => {
    if (!empCode || !employeeData) throw new Error('Employee code and data are required');
    console.log(`[EmployeeAPI] Updating employee: ${empCode}`);
    if (employeeData.salary_structure_id !== undefined && employeeData.salary_structure_id !== null) {
      console.log(`[EmployeeAPI] Employee ${empCode} - salary_structure_id: ${employeeData.salary_structure_id}`);
    }
    return api.put(`/employees/${empCode}`, employeeData);
  },
  bulkUpdateEmployees: (employeesData) => {
    const firstEmpCode = employeesData[0]?.emp_code;
    if (!firstEmpCode) {
      throw new Error('Employee code is required in employee data');
    }
    console.log(`[EmployeeAPI] Bulk updating ${employeesData.length} employee(s)`);
    console.log(`[EmployeeAPI] Bulk update payload:`, JSON.stringify(employeesData, null, 2));
    
    // Log salary structure updates if present
    const employeesWithSalaryStructure = employeesData.filter(emp => emp.salary_structure_id !== undefined && emp.salary_structure_id !== null);
    if (employeesWithSalaryStructure.length > 0) {
      console.log(`[EmployeeAPI] Found ${employeesWithSalaryStructure.length} employee(s) with salary_structure_id updates:`, 
        employeesWithSalaryStructure.map(emp => `${emp.emp_code}: ${emp.salary_structure_id}`));
    }
    
    return api.put(`/employees/${firstEmpCode}`, employeesData);
  },
  importEmployees: (formData, options = {}) => {
    if (!formData) throw new Error('File data is required');
    const { validateOnly, acceptedEmployees } = options;
    const params = {};
    if (validateOnly) {
      params.validateOnly = 'true';
    }
    
    const config = {
      headers: { 'Content-Type': 'multipart/form-data' },
      params
    };
    
    // If acceptedEmployees is provided (including empty array), add it to formData
    // Empty array means reject all new employees but still update existing ones
    if (acceptedEmployees !== undefined && acceptedEmployees !== null && Array.isArray(acceptedEmployees)) {
      // For multipart/form-data, we need to send acceptedEmployees as JSON string in formData
      formData.append('acceptedEmployees', JSON.stringify(acceptedEmployees));
    }
    
    return api.post('/employees/import', formData, config);
  },
  exportEmployees: (params = {}) => {
    return api.get('/employees/export', { 
      params,
      responseType: 'blob' 
    });
  },
  downloadTemplate: () => {
    return api.get('/employees/import-template', {
      responseType: 'blob'
    });
  },
  deactivateEmployee: (empCode, options = {}) => {
    if (!empCode) throw new Error('Employee code is required');
    const emp_code = Array.isArray(empCode) ? empCode : [empCode];
    const body = { emp_code };
    if (options.software_only) body.software_only = true;
    if (options.resignation_date) body.resignation_date = options.resignation_date;
    if (options.compute_fnf) body.compute_fnf = true;
    return api.post('/employees/deactivate', body);
  },
  stopEmployeePunches: (empCode, options = {}) => {
    if (!empCode) throw new Error('Employee code is required');
    const emp_code = Array.isArray(empCode) ? empCode : [empCode];
    const body = { emp_code };
    if (options.software_only) body.software_only = true;
    return api.post('/employees/stop-punches', body);
  },
  activateEmployee: (empCode, options = {}) => {
    if (!empCode) throw new Error('Employee code is required');
    const emp_code = Array.isArray(empCode) ? empCode : [empCode];
    const body = { emp_code };
    if (options.software_only) body.software_only = true;
    // Sent only when this is a rejoining — it opens a new employment period. Without it the
    // server reopens the period they were already on.
    if (options.joining_date) body.joining_date = options.joining_date;
    return api.post('/employees/activate', body);
  },
  getEmploymentPeriods: (empCode) => {
    if (!empCode) throw new Error('Employee code is required');
    return api.get(`/employees/${empCode}/employment-periods`);
  },
  verifyEmployeeImage: (empCode, imageUrl) => {
    if (!empCode) throw new Error('Employee code is required');
    if (!imageUrl) throw new Error('Image URL is required');
    return api.post(`/employees/${empCode}/verify-image`, { image_url: imageUrl });
  },
  uploadEmployeePhoto: (empCode, photoFile) => {
    if (!empCode) throw new Error('Employee code is required');
    if (!photoFile) throw new Error('Photo file is required');
    const formData = new FormData();
    formData.append('photo', photoFile);
    return api.post(`/employees/${empCode}/register-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteEmployeeImage: (empCode, imageId) => {
    if (!empCode) throw new Error('Employee code is required');
    if (!imageId) throw new Error('Image id is required');
    return api.delete(`/employees/${empCode}/images/${imageId}`);
  },
  recognizeCheckIn: (photoFile, punchState = '0') => {
    if (!photoFile) throw new Error('Photo file is required');
    const formData = new FormData();
    formData.append('photo', photoFile);
    formData.append('punch_state', punchState);
    const { latitude, longitude } = getDeviceLocation();
    if (latitude !== undefined && longitude !== undefined) {
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
    }
    return api.post('/check-in/recognize', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  confirmCheckIn: (empCode, punchState = '0') => {
    if (!empCode) throw new Error('Employee code is required');
    return api.post('/check-in/confirm', { emp_code: empCode, punch_state: punchState, ...getDeviceLocation() }, {
      headers: { 'Content-Type': 'application/json' }
    });
  },
  getEmployeeDashboard: (empCode) => {
    if (!empCode) throw new Error('Employee code is required');
    return api.get('/check-in/employee-dashboard', { params: { emp_code: empCode } });
  },
  listEmployeeDocuments: (empCode) => {
    if (!empCode) throw new Error('Employee code is required');
    return api.get(`/employees/${empCode}/documents`);
  },
  uploadEmployeeDocuments: (empCode, files) => {
    if (!empCode) throw new Error('Employee code is required');
    if (!files || files.length === 0) throw new Error('Files are required');
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return api.post(`/employees/${empCode}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteEmployeeDocument: (empCode, documentId) => {
    if (!empCode) throw new Error('Employee code is required');
    if (!documentId) throw new Error('Document ID is required');
    return api.delete(`/employees/${empCode}/documents/${documentId}`);
  },
  listEmployeeAssets: (empCode) => {
    if (!empCode) throw new Error('Employee code is required');
    return api.get(`/employees/${empCode}/assets`);
  },
  // Always creates a new assignment row, so re-issuing a previously returned
  // asset produces a fresh assign id rather than reopening the old one. Photos
  // are uploaded separately against that id through NBnext Drive.
  assignEmployeeAsset: (empCode, payload) => {
    if (!empCode) throw new Error('Employee code is required');
    if (!payload?.asset_id) throw new Error('Asset is required');
    return api.post(`/employees/${empCode}/assets`, payload);
  },
  returnEmployeeAsset: (empCode, assignmentId, payload = {}) => {
    if (!empCode) throw new Error('Employee code is required');
    if (!assignmentId) throw new Error('Assignment ID is required');
    return api.post(`/employees/${empCode}/assets/${assignmentId}/return`, payload);
  },
};

// --------------------------------------------
// Department & Employee Combined API
// --------------------------------------------
const deptEmpApi = {
  getDepartmentsAndEmployees: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.is_active !== undefined) {
      queryParams.append('is_active', params.is_active.toString());
    }
    const queryString = queryParams.toString();
    return api.get(`/employees/get-departments-employees${queryString ? `?${queryString}` : ''}`);
  },
};

// --------------------------------------------
// Formula API
// --------------------------------------------
const FormulaApi = {
  getAllFormulas: (params = {}) => {
    return api.get('/formulas', { params });
  },
  getFormulaById: (id) => {
    if (!id) throw new Error('Formula ID is required');
    return api.get(`/formulas/${id}`);
  },
  createFormula: (formulaData) => {
    if (!formulaData) throw new Error('Formula data is required');
    return api.post('/formulas', formulaData);
  },
  updateFormula: (id, formulaData) => {
    if (!id || !formulaData) throw new Error('Formula ID and data are required');
    return api.put(`/formulas/${id}`, formulaData);
  },
  deleteFormula: (id) => {
    if (!id) throw new Error('Formula ID is required');
    return api.delete(`/formulas/${id}`);
  },
  getFormulaTypes: () => {
    return api.get('/formulas/types');
  },
  testFormula: (payload) => {
    if (!payload?.employee_code || !payload?.start_date || !payload?.end_date || !payload?.formula) {
      throw new Error('All fields are required: employee_code, start_date, end_date, formula');
    }
    return api.post('/formulas/test', payload);
  },
};

// --------------------------------------------
// Holiday API
// --------------------------------------------
const holidayApi = {
  // Lists
  getAllHolidayLists: (params = {}) => api.get('/holidays/lists', { params }),
  createHolidayList: (data) => api.post('/holidays/lists', data),
  updateHolidayList: (listId, data) => api.put(`/holidays/lists/${listId}`, data),
  deleteHolidayList: (listId) => api.delete(`/holidays/lists/${listId}`),
  // Entries within a list
  getHolidaysByList: (listId) => api.get(`/holidays/lists/${listId}/entries`),
  createHolidayEntry: (listId, data) => api.post(`/holidays/lists/${listId}/entries`, data),
  updateHolidayEntry: (id, data) => api.put(`/holidays/${id}`, data),
  deleteHolidayEntry: (id) => api.delete(`/holidays/${id}`),
};

// --------------------------------------------
// Salary Structure API
// --------------------------------------------
const SalaryStructureApi = {
  getAllSalaryStructures: (params = {}) => {
    return api.get('/salary-structure', { params });
  },
  getSalaryStructureById: (id) => {
    if (!id) throw new Error('Salary structure ID is required');
    return api.get(`/salary-structure/${id}`);
  },
  createSalaryStructure: (salaryStructureData) => {
    if (!salaryStructureData) throw new Error('Salary structure data is required');
    return api.post('/salary-structure', salaryStructureData);
  },
  updateSalaryStructure: (id, salaryStructureData) => {
    if (!id || !salaryStructureData) throw new Error('Salary structure ID and data are required');
    return api.put(`/salary-structure/${id}`, salaryStructureData);
  },
  deleteSalaryStructure: (id) => {
    if (!id) throw new Error('Salary structure ID is required');
    return api.delete(`/salary-structure/${id}`);
  },
  getHeadTypes: () => {
    return api.get('/salary-structure/head-types');
  },
  testSalaryStructure: (testData) => {
    if (!testData?.salary_structure_id || !testData?.employee_code || !testData?.start_date || !testData?.end_date) {
      throw new Error('All fields are required: salary_structure_id, employee_code, start_date, end_date');
    }
    return api.post('/salary-structure/test', testData);
  },
  exportSalaryStructure: async (id) => {
    if (!id) throw new Error('Salary structure ID is required');
    const response = await api.get(`/salary-structure/${id}/export`);
    
    // Create a blob URL and trigger download
    const jsonString = JSON.stringify(response.data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `salary_structure_${id}_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response;
  },
  importSalaryStructure: (importData) => {
    if (!importData) throw new Error('Import data is required');
    return api.post('/salary-structure/import', importData);
  },
};


// --------------------------------------------
// raw punch API
// --------------------------------------------
const rawPunch = {
  getAllPunches: (params = {}) => {
    // Ensure pagination parameters are included
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 200,
      ...params
    };
    return api.get('/raw-punch', { params: queryParams });
  },
  getPunchById: (id) => {
    return api.get(`/raw-punch/${id}`);
  },
};

// --------------------------------------------
// Canteen Token Print Master - canteen-machine punches and manual token entry
// --------------------------------------------
const canteenToken = {
  getTokens: (params = {}) => {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 200,
      ...params
    };
    return api.get('/canteen-token', { params: queryParams });
  },
  createToken: (payload) => api.post('/canteen-token', payload),
  // Set the Meal Type (stored as the punch `comment`) on a single token.
  updateMealType: (id, mealType) => api.patch(`/canteen-token/${id}/meal-type`, { meal_type: mealType }),
  rejectToken: (id) => api.delete(`/canteen-token/${id}`),
};


// --------------------------------------------
// Report API - Now routes through Node.js server
// --------------------------------------------
const reportApi = {
  getReportData: (url, filters = {}) => {
    if (!url) throw new Error('Report name is required');
    return api.get(`/reports/${url}`, {
      params: filters,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
      },
    }).catch(error => {
      // The interceptor will handle 401 responses
      console.error('Error in getReportData:', error);
      return Promise.reject(error);
    });
  },

  updateAttendanceStatus: async ({
    employee_code,
    attendance_date,
    status,
    old_status,
    additional_statuses,
    validate_only,
    remarks,
    from_accountability_modal,
    gatepass
  }) => {
    if (!employee_code || !attendance_date || !status) {
      console.error('Missing required fields:', { employee_code, attendance_date, status });
      throw new Error('All fields are required: employee_code, attendance_date, status');
    }

    const payload = {
      emp_code: employee_code,
      att_date: attendance_date,
      status: status.trim(),
      old_status: sanitizeHTML(old_status).trim(),
      additional_statuses: additional_statuses ? additional_statuses.map(s => sanitizeHTML(s).trim()) : [],
      validate_only: validate_only === true,
    };
    if (remarks !== undefined) {
      payload.remarks = typeof remarks === 'string' ? sanitizeHTML(remarks).trim() : '';
    }
    if (from_accountability_modal === true) {
      payload.from_accountability_modal = true;
    }
    if (gatepass) {
      payload.gatepass = gatepass;
    }

    try {
      const response = await api.post('/report-actions/attendance/update', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

    return response.data;
   } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      'Attendance update failed';

    console.error('API Error:', errorMessage, 'Status:', error?.response?.status);
    console.error('Full error object:', error);
    
    // Preserve the original error with all properties for proper error handling
    // If it's already an axios error, just re-throw it
    if (error?.response) {
      // It's an axios error, preserve it as-is
      throw error;
    }
    
    // Otherwise, create enhanced error with response info
    const enhancedError = new Error(errorMessage);
    enhancedError.response = error?.response;
    enhancedError.status = error?.response?.status;
    enhancedError.config = error?.config;
    throw enhancedError;
  }
},

  lockAttendance: async ({ employee_code, attendance_date, current_status, att_data, filter }) => {
    if (!employee_code || !attendance_date || !current_status) {
      console.error('Missing required fields:', { employee_code, attendance_date, current_status });
      throw new Error('All fields are required: employee_code, attendance_date, current_status');
    }

    const payload = {
      emp_code: employee_code,
      att_date: attendance_date,
      current_status: current_status,
    };
    if (att_data != null) payload.att_data = att_data;
    if (filter != null) payload.filter = filter;

    try {
      const response = await api.post('/report-actions/attendance/lock', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Attendance lock failed';

      console.error('API Error:', errorMessage);
      throw new Error(errorMessage);
    }
  }
};

// --------------------------------------------
// Unregistered Faces Report API
// --------------------------------------------
const unregisteredFacesReportApi = {
  deleteImage: (payload) => {
    const fileName = payload?.file_name;
    const category = payload?.category;
    if (!fileName) throw new Error('file_name is required');
    if (!category) throw new Error('category is required');
    return api.post('/reports/unregistered-faces-report/delete', {
      file_name: fileName,
      category
    });
  },
  assignImage: (payload) => {
    const fileName = payload?.file_name;
    const empCode = payload?.emp_code;
    const category = payload?.category;
    if (!fileName || !empCode) {
      throw new Error('file_name and emp_code are required');
    }
    if (!category) {
      throw new Error('category is required');
    }
    return api.post('/reports/unregistered-faces-report/assign', {
      file_name: fileName,
      emp_code: empCode,
      category
    });
  },
};

// --------------------------------------------
// Biotemplate Report API
// --------------------------------------------
const biotemplateReportApi = {
  getReport: (params = {}) => {
    return api.get('/reports/biotemplate-report', { params });
  },
  register: (payload) => {
    const empCode = payload?.emp_code;
    const bioType = payload?.bio_type;
    const areaName = payload?.area_name;
    const terminalId = payload?.terminal_id;
    if (!empCode || !bioType || (!areaName && !terminalId)) {
      throw new Error('emp_code, bio_type, and either area_name or terminal_id are required');
    }
    return api.post('/reports/biotemplate-report/register', {
      emp_code: empCode,
      bio_type: bioType,
      area_name: areaName,
      major_ver: payload?.major_ver,
      terminal_id: terminalId,
    });
  },
  push: (payload) => {
    const empCode = payload?.emp_code;
    const bioType = payload?.bio_type;
    const terminalId = payload?.terminal_id;
    if (!empCode || !bioType || !terminalId) {
      throw new Error('emp_code, bio_type, and terminal_id are required');
    }
    return api.post('/reports/biotemplate-report/push', {
      emp_code: empCode,
      bio_type: bioType,
      terminal_id: terminalId,
    });
  },
  delete: (payload) => {
    const empCode = payload?.emp_code;
    const bioType = payload?.bio_type;
    const terminalId = payload?.terminal_id;
    if (!empCode || !bioType || !terminalId) {
      throw new Error('emp_code, bio_type, and terminal_id are required');
    }
    return api.post('/reports/biotemplate-report/delete', {
      emp_code: empCode,
      bio_type: bioType,
      terminal_id: terminalId,
      major_ver: payload?.major_ver,
    });
  },
};

const pastReportApi = {
  getAllPastReports: () => api.get('/pastreport/get_all_past_report'),
  getReportById: (id) => api.get(`/pastreport/get_report/${id}`),
};

// --------------------------------------------
// Gate Pass API
// --------------------------------------------
const gatePassApi = {
  getAllGatePass: (filters = {}) => api.get(`/gatepass`, { params: filters }),
  createGatePass: (gatePassData) => api.post(`/gatepass`, gatePassData),
  updateGatePass: (gatePassId, gatePassData) => api.put(`/gatepass/${gatePassId}`, gatePassData),
  updateGatePassStatus: (gatePassId, status) => api.put(`/gatepass/${gatePassId}/status`, { status }),
  deleteGatePass: (gatePassId) => api.delete(`/gatepass/${gatePassId}`),
};

// --------------------------------------------
// Department API
// --------------------------------------------
const departmentApi = {
  getAllDepartments: (params = {}) => api.get(`/department`, { params }),
  createDepartment: (departmentData) => api.post(`/department`, departmentData),
  updateDepartment: (departmentId, departmentData) => api.put(`/department/${departmentId}`, departmentData),
  deleteDepartment: (departmentId) => api.delete(`/department/${departmentId}`),
};

// --------------------------------------------
// Position API
// --------------------------------------------
const positionApi = {
  getAllPositions: () => api.get(`/position`),
  createPosition: (positionData) => api.post(`/position`, positionData),
  updatePosition: (positionId, positionData) => api.put(`/position/${positionId}`, positionData),
  deletePosition: (positionId) => api.delete(`/position/${positionId}`),
};

// --------------------------------------------
// Asset API
// --------------------------------------------
const assetApi = {
  getAllAssets: () => api.get(`/asset`),
  getAllAllocations: (filters = {}) => api.get(`/asset/allocations`, { params: filters }),
  getAssetCustodyHistory: (assetId) => api.get(`/asset/${assetId}/allocations`),
  createAsset: (assetData) => api.post(`/asset`, assetData),
  updateAsset: (assetId, assetData) => api.put(`/asset/${assetId}`, assetData),
  deleteAsset: (assetId) => api.delete(`/asset/${assetId}`),
};

// --------------------------------------------
// Leave Type API
// --------------------------------------------
const leaveTypeApi = {
  getAllLeaveTypes: () => api.get(`/leave-type`),
  createLeaveType: (leaveTypeData) => api.post(`/leave-type`, leaveTypeData),
  updateLeaveType: (leaveTypeId, leaveTypeData) => api.put(`/leave-type/${leaveTypeId}`, leaveTypeData),
  deleteLeaveType: (leaveTypeId) => api.delete(`/leave-type/${leaveTypeId}`),
};

// --------------------------------------------
// Allowance Type API
// --------------------------------------------
const allowanceTypeApi = {
  getAllAllowanceTypes: (filters = {}) => api.get(`/allowance-type`, { params: filters }),
  createAllowanceType: (allowanceTypeData) => api.post(`/allowance-type`, allowanceTypeData),
  updateAllowanceType: (allowanceTypeId, allowanceTypeData) => api.put(`/allowance-type/${allowanceTypeId}`, allowanceTypeData),
  deleteAllowanceType: (allowanceTypeId) => api.delete(`/allowance-type/${allowanceTypeId}`),
};

// --------------------------------------------
// Job Offer Salary Structure API
// --------------------------------------------
const jobOfferSalaryStructureApi = {
  getAllComponents: () => api.get(`/job-offer-salary-structure`),
  getComponentById: (id) => api.get(`/job-offer-salary-structure/${id}`),
  createComponent: (componentData) => api.post(`/job-offer-salary-structure`, componentData),
  updateComponent: (id, componentData) => api.put(`/job-offer-salary-structure/${id}`, componentData),
  deleteComponent: (id) => api.delete(`/job-offer-salary-structure/${id}`),
  calculateBreakdown: (grossSalary) => api.post(`/job-offer-salary-structure/calculate`, { gross_salary: grossSalary }),
  getJobOfferSettings: () => api.get(`/job-offer-salary-structure/settings`),
  updateJobOfferSettings: (settings) => api.put(`/job-offer-salary-structure/settings`, settings),
};

// --------------------------------------------
// Canteen Meal Type API
// --------------------------------------------
const canteenMealTypeApi = {
  getAllCanteenMealTypes: (filters = {}) => api.get(`/canteen-meal-type`, { params: filters }),
  createCanteenMealType: (canteenMealTypeData) => api.post(`/canteen-meal-type`, canteenMealTypeData),
  updateCanteenMealType: (canteenMealTypeId, canteenMealTypeData) => api.put(`/canteen-meal-type/${canteenMealTypeId}`, canteenMealTypeData),
  deleteCanteenMealType: (canteenMealTypeId) => api.delete(`/canteen-meal-type/${canteenMealTypeId}`),
};

// --------------------------------------------
// Purpose Type API
// --------------------------------------------
const purposeTypeApi = {
  getAllPurposeTypes: (filters = {}) => api.get(`/purpose-type`, { params: filters }),
  createPurposeType: (purposeTypeData) => api.post(`/purpose-type`, purposeTypeData),
  updatePurposeType: (purposeTypeId, purposeTypeData) => api.put(`/purpose-type/${purposeTypeId}`, purposeTypeData),
  deletePurposeType: (purposeTypeId) => api.delete(`/purpose-type/${purposeTypeId}`),
};

// --------------------------------------------
// Performance Management API — appraisal cycles, the KRA / competency catalogue,
// and the appraisals themselves
// --------------------------------------------
const performanceCycleApi = {
  getAllPerformanceCycles: (filters = {}) => api.get(`/performance-cycle`, { params: filters }),
  createPerformanceCycle: (cycleData) => api.post(`/performance-cycle`, cycleData),
  updatePerformanceCycle: (cycleId, cycleData) => api.put(`/performance-cycle/${cycleId}`, cycleData),
  deletePerformanceCycle: (cycleId) => api.delete(`/performance-cycle/${cycleId}`),
};

const performanceParameterApi = {
  getAllPerformanceParameters: (filters = {}) => api.get(`/performance-parameter`, { params: filters }),
  createPerformanceParameter: (parameterData) => api.post(`/performance-parameter`, parameterData),
  updatePerformanceParameter: (parameterId, parameterData) => api.put(`/performance-parameter/${parameterId}`, parameterData),
  deletePerformanceParameter: (parameterId) => api.delete(`/performance-parameter/${parameterId}`),
};

const performanceReviewApi = {
  getAllPerformanceReviews: (filters = {}) => api.get(`/performance-review`, { params: filters }),
  getPerformanceReview: (reviewId) => api.get(`/performance-review/${reviewId}`),
  createPerformanceReview: (reviewData) => api.post(`/performance-review`, reviewData),
  // Opens a whole cycle's appraisals at once. Re-runnable — already-reviewed employees
  // are skipped, so this is also how joiners are picked up mid-round.
  generatePerformanceReviews: (payload) => api.post(`/performance-review/generate`, payload),
  // Same thing across every open cycle — monthly reviews and a yearly appraisal at once.
  generateAllPerformanceReviews: (payload = {}) => api.post(`/performance-review/generate-all`, payload),
  updatePerformanceReview: (reviewId, reviewData) => api.put(`/performance-review/${reviewId}`, reviewData),
  updateStatus: (reviewId, status) => api.patch(`/performance-review/${reviewId}/status`, { status }),
  finalise: (reviewId) => api.post(`/performance-review/${reviewId}/finalise`),
  reopen: (reviewId) => api.post(`/performance-review/${reviewId}/reopen`),
  deletePerformanceReview: (reviewId) => api.delete(`/performance-review/${reviewId}`),
  // Employee self-service. These need no HR permission — the server scopes them to the
  // logged-in user's own employee record, so there is no id to pass and none to trust.
  getMyReviews: () => api.get(`/performance-review/my`),
  getMyTeamReviews: () => api.get(`/performance-review/my-team`),
  getMyReview: (reviewId) => api.get(`/performance-review/my/${reviewId}`),
  saveMySelfAppraisal: (reviewId, payload) => api.put(`/performance-review/my/${reviewId}`, payload),
  submitMySelfAppraisal: (reviewId) => api.post(`/performance-review/my/${reviewId}/submit`),
};

// --------------------------------------------
// Operation Cycle API
// --------------------------------------------
const operationCycleApi = {
  getAllOperationCycles: (filters = {}) => api.get(`/operation-cycle`, { params: filters }),
  createOperationCycle: (operationCycleData) => api.post(`/operation-cycle`, operationCycleData),
  updateOperationCycle: (operationCycleId, operationCycleData) => api.put(`/operation-cycle/${operationCycleId}`, operationCycleData),
  deleteOperationCycle: (operationCycleId) => api.delete(`/operation-cycle/${operationCycleId}`),
};

// --------------------------------------------
// Role & Responsibility API
// --------------------------------------------
const roleResponsibilityApi = {
  getAllRoleResponsibilities: (filters = {}) => api.get(`/role-responsibility`, { params: filters }),
  createRoleResponsibility: (roleData) => api.post(`/role-responsibility`, roleData),
  updateRoleResponsibility: (roleId, roleData) => api.put(`/role-responsibility/${roleId}`, roleData),
  deleteRoleResponsibility: (roleId) => api.delete(`/role-responsibility/${roleId}`),
};

// --------------------------------------------
// Service Offering API
// --------------------------------------------
const serviceOfferingApi = {
  getAllServiceOfferings: (filters = {}) => api.get(`/service-offering`, { params: filters }),
  createServiceOffering: (offeringData) => api.post(`/service-offering`, offeringData),
  updateServiceOffering: (offeringId, offeringData) => api.put(`/service-offering/${offeringId}`, offeringData),
  deleteServiceOffering: (offeringId) => api.delete(`/service-offering/${offeringId}`),
};

// --------------------------------------------
// Customer API (multipart for company_logo)
// --------------------------------------------
const customerApi = {
  getAllCustomers: (filters = {}) => api.get(`/customer`, { params: filters }),
  createCustomer: (formData) => api.post(`/customer`, formData),
  updateCustomer: (customerId, formData) => api.put(`/customer/${customerId}`, formData),
  deleteCustomer: (customerId) => api.delete(`/customer/${customerId}`),
};

// --------------------------------------------
// Company Profile API (attendance aliases, statutory compliance defaults,
// external-system credentials, emp_code_basis). Owned by app now; hits the
// app server's /api/v1/company-profile routes.
// --------------------------------------------
const companyProfileApi = {
  get: () => api.get(`/company-profile`),
  update: (profile) => api.put(`/company-profile`, profile),
};

// --------------------------------------------
// Workorder API (nested under a customer)
// --------------------------------------------
const workorderApi = {
  getByCustomer: (customerId, params = {}) => api.get(`/workorder/by-customer/${customerId}`, { params }),
  save: (customerId, workorders) => api.post(`/workorder/save`, { customer_id: customerId, workorders }),
  delete: (id) => api.delete(`/workorder/${id}`),
};

// --------------------------------------------
// Leaves Taken API
// --------------------------------------------
const leavesTakenApi = {
  getAllLeavesTaken: (filters = {}) => api.get(`/leaves-taken`, { params: filters }),
  createLeavesTaken: (leavesTakenData) => api.post(`/leaves-taken`, leavesTakenData),
  updateLeavesTaken: (leavesTakenId, leavesTakenData) => api.put(`/leaves-taken/${leavesTakenId}`, leavesTakenData),
  deleteLeavesTaken: (leavesTakenId) => api.delete(`/leaves-taken/${leavesTakenId}`),
};

// --------------------------------------------
// Leave List API
// --------------------------------------------
const leaveListApi = {
  getAllLeaveLists: (filters = {}) => api.get(`/leave-list`, { params: filters }),
  createLeaveList: (leaveListData) => api.post(`/leave-list`, leaveListData),
  updateLeaveList: (leaveListId, leaveListData) => api.put(`/leave-list/${leaveListId}`, leaveListData),
  deleteLeaveList: (leaveListId) => api.delete(`/leave-list/${leaveListId}`),
};

// --------------------------------------------
// Employee Merge API
// --------------------------------------------
const employeeMergeApi = {
  createEmployeeMerge: (data) => api.post('/employee-merge', data),
  createEmployeeAndMerge: (data) => api.post('/employee-merge/create-and-merge', data),
  getAllEmployeeMerges: (filters = {}) => api.get('/employee-merge', { params: filters }),
  deleteEmployeeMerge: (id) => api.delete(`/employee-merge/${id}`),
};
// --------------------------------------------
// Weekly Off API
// --------------------------------------------
const weeklyOffApi = {
  getAllWeeklyOffs: () => api.get(`/weekly-off`),
  createWeeklyOff: (weeklyOffData) => api.post(`/weekly-off`, weeklyOffData),
  updateWeeklyOff: (weeklyOffId, weeklyOffData) => api.put(`/weekly-off/${weeklyOffId}`, weeklyOffData),
  deleteWeeklyOff: (weeklyOffId) => api.delete(`/weekly-off/${weeklyOffId}`),
};

// --------------------------------------------
// Employee Weekly Off API
// --------------------------------------------
const employeeWeeklyOffApi = {
  getEmployeeWeeklyOffs: (employeeId) => api.get(`/employee-weekly-off/employee/${employeeId}`),
  createEmployeeWeeklyOff: (employeeWeeklyOffData) => api.post(`/employee-weekly-off`, employeeWeeklyOffData),
  updateEmployeeWeeklyOff: (id, employeeWeeklyOffData) => api.put(`/employee-weekly-off/${id}`, employeeWeeklyOffData),
  deleteEmployeeWeeklyOff: (id) => api.delete(`/employee-weekly-off/${id}`),
};

// --------------------------------------------
// Timetable Api
// --------------------------------------------
const timetableApi = {
  getAllTimetables: (filters = {}) => api.get('/timetable', { params: filters }),
  getTimetableById: (id) => api.get(`/timetable/${id}`),
  createTimetable: (timetableData) => api.post('/timetable', timetableData),
  updateTimetable: (timetableId, timetableData) => api.put(`/timetable/${timetableId}`, timetableData),
  deleteTimetable: (timetableId) => api.delete(`/timetable/${timetableId}`),
};

// --------------------------------------------
// Manual punches API (resource path: /manual-log)
// --------------------------------------------
const manualLogApi = {
  getAllManualLogs: (filters = {}) => api.get('/manual-log', { params: filters }),
  createManualLog: (manualLogData) => api.post('/manual-log', manualLogData),
  updateManualLog: (manualLogId, manualLogData) => api.put(`/manual-log/${manualLogId}`, manualLogData),
  deleteManualLog: (manualLogId) => api.delete(`/manual-log/${manualLogId}`),
  updateManualLogStatus: (manualLogId, status) => api.put(`/manual-log/${manualLogId}/status`, { status }),
};

// --------------------------------------------
// Manual salaries API (resource path: /manual-log-entry-master)
// --------------------------------------------
const manualLogEntryMasterApi = {
  getAllManualLogEntryMasters: (filters = {}) => api.get('/manual-log-entry-master', { params: filters }),
  getEmployeeComponents: (employeeId, params = {}) => api.get(`/manual-log-entry-master/employee-components/${employeeId}`, { params }),
  getManualLogEntryMasterById: (id) => api.get(`/manual-log-entry-master/${id}`),
  createManualLogEntryMaster: (manualLogEntryMasterData) => api.post('/manual-log-entry-master', manualLogEntryMasterData),
  updateManualLogEntryMaster: (manualLogEntryMasterId, manualLogEntryMasterData) => api.put(`/manual-log-entry-master/${manualLogEntryMasterId}`, manualLogEntryMasterData),
  deleteManualLogEntryMaster: (manualLogEntryMasterId) => api.delete(`/manual-log-entry-master/${manualLogEntryMasterId}`),
};

// --------------------------------------------
// Vastram daily counter API (resource path: /vastram-daily-counter)
// Powers the Vastram Daily Performance report tally + its master.
// --------------------------------------------
const vastramDailyCounterApi = {
  getAllVastramDailyCounters: (filters = {}) => api.get('/vastram-daily-counter', { params: filters }),
  getVastramDailyCounterById: (id) => api.get(`/vastram-daily-counter/${id}`),
  createVastramDailyCounter: (data) => api.post('/vastram-daily-counter', data),
  updateVastramDailyCounter: (id, data) => api.put(`/vastram-daily-counter/${id}`, data),
  deleteVastramDailyCounter: (id) => api.delete(`/vastram-daily-counter/${id}`),
  // action: 'customer' | 'sale' | 'left'
  incrementVastramCounter: ({ emp_code, date, action }) => api.post('/vastram-daily-counter/increment', { emp_code, date, action }),
  undoVastramCounter: ({ emp_code, date }) => api.post('/vastram-daily-counter/undo', { emp_code, date }),
};

// --------------------------------------------
// Manual Attendance Api
// --------------------------------------------
const manualAttendanceApi = {
  getAll: (filters = {}) => api.get('/manual-attendance', { params: filters }),
  create: (data) => api.post('/manual-attendance', data),
  update: (id, data) => api.put(`/manual-attendance/${id}`, data),
  remove: (id) => api.delete(`/manual-attendance/${id}`),
  status: (id, status) => api.post(`/manual-attendance/status/${id}`, { status: status }), // status: 1 = Approved, 2 = Rejected
  approve: (id, remarks) =>
    api.post(`/manual-attendance/status/${id}`, {
      status: 1,
      remarks: remarks
    }),
  reject: (id, remarks) =>
    api.post(`/manual-attendance/status/${id}`, {
      status: 2,
      ...(remarks !== undefined && remarks !== null ? { remarks } : {}),
    }),
};

// --------------------------------------------
// report action API
// --------------------------------------------
const reportActionApi = {
  toggleAttendance: (emp_code, punch_time, terminal_sn, current_direction) =>
    api.post('/report-actions/toggle-attendance', { emp_code, punch_time, terminal_sn, current_direction }),
  updateDirection: (emp_code, punch_time, direction, terminal_sn, current_direction) =>
    api.post('/report-actions/update-direction', { emp_code, punch_time, direction, terminal_sn, current_direction }),
  updatePunchMetadata: (data) => api.post('/report-actions/update-punch-metadata', data),
  lockSalaryRegister: (data) => api.post('/report-actions/salary-register/lock', data),
  checkLockedStatus: (data) => api.post('/report-actions/salary-register/check-locked', data),
  getYtdSalaryData: (data) => api.post('/report-actions/salary-register/ytd', data),
};

// --------------------------------------------
// Shift API
// --------------------------------------------
const shiftApi = {
  getAllShifts: () => api.get('/shifts'),
};

// --------------------------------------------
// Employee Schedule API
// --------------------------------------------
const employeeScheduleApi = {
  getAllEmployeeSchedules: () => api.get('/employee-schedule'),
  createEmployeeSchedule: (employeeScheduleData) => api.post('/employee-schedule', employeeScheduleData),
  updateEmployeeSchedule: (employeeScheduleId, employeeScheduleData) => api.put(`/employee-schedule/${employeeScheduleId}`, employeeScheduleData),
  deleteEmployeeSchedule: (employeeScheduleId) => api.delete(`/employee-schedule/${employeeScheduleId}`),
};

// --------------------------------------------
// Department Schedule API
// --------------------------------------------
const departmentScheduleApi = {
  getDepartmentSchedules: (departmentId) => api.get(`/department-schedule/${departmentId}`),
  createDepartmentSchedule: (data) => api.post('/department-schedule', data),
  updateDepartmentSchedule: (id, data) => api.put(`/department-schedule/${id}`, data),
  deleteDepartmentSchedule: (id) => api.delete(`/department-schedule/${id}`),
};

// --------------------------------------------
// Department Weekly Off API
// --------------------------------------------
const departmentWeeklyOffApi = {
  getDepartmentWeeklyOffs: (departmentId) => api.get(`/department-weekly-off/${departmentId}`),
  createDepartmentWeeklyOff: (data) => api.post('/department-weekly-off', data),
  updateDepartmentWeeklyOff: (id, data) => api.put(`/department-weekly-off/${id}`, data),
  deleteDepartmentWeeklyOff: (id) => api.delete(`/department-weekly-off/${id}`),
};

// --------------------------------------------
// Company Schedule / Weekly Off API — company-wide fallbacks, so the company comes
// from the token and never from the path.
// --------------------------------------------
const companyScheduleApi = {
  getCompanySchedules: () => api.get('/company-schedule'),
  createCompanySchedule: (data) => api.post('/company-schedule', data),
  updateCompanySchedule: (id, data) => api.put(`/company-schedule/${id}`, data),
  deleteCompanySchedule: (id) => api.delete(`/company-schedule/${id}`),
};

const companyWeeklyOffApi = {
  getCompanyWeeklyOffs: () => api.get('/company-weekly-off'),
  createCompanyWeeklyOff: (data) => api.post('/company-weekly-off', data),
  updateCompanyWeeklyOff: (id, data) => api.put(`/company-weekly-off/${id}`, data),
  deleteCompanyWeeklyOff: (id) => api.delete(`/company-weekly-off/${id}`),
};

// --------------------------------------------
// Compound Shift API
// --------------------------------------------
const compoundShiftApi = {
  getAllCompoundShifts: () => api.get('/compound-shift'),
  createCompoundShift: (compoundShiftData) => api.post('/compound-shift', compoundShiftData),
  updateCompoundShift: (compoundShiftId, compoundShiftData) => api.put(`/compound-shift/${compoundShiftId}`, compoundShiftData),
  deleteCompoundShift: (compoundShiftId) => api.delete(`/compound-shift/${compoundShiftId}`),
};

// Holiday Type API
// --------------------------------------------
const holidayTypeApi = {
  getAllHolidayTypes: () => api.get('/holiday-type'),
  createHolidayType: (holidayTypeData) => api.post('/holiday-type', holidayTypeData),
  updateHolidayType: (holidayTypeId, holidayTypeData) => api.put(`/holiday-type/${holidayTypeId}`, holidayTypeData),
  deleteHolidayType: (holidayTypeId) => api.delete(`/holiday-type/${holidayTypeId}`),
};

// --------------------------------------------
// Reimbursement API
// --------------------------------------------
const reimbursementApi = {
  getAll: (filters = {}) => api.get('/reimbursements', { params: filters }),
  create: (formData) => api.post('/reimbursements', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.put(`/reimbursements/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id) => api.delete(`/reimbursements/${id}`),
};

// --------------------------------------------
// WageMaster API
// --------------------------------------------
const wageMasterApi = {
  // GET /api/v1/wagemaster/wagemaster-dashboard?date=YYYY-MM-DD
  getDashboard: (params = {}) => api.get('/wagemaster/wagemaster-dashboard', { params }),
  // GET /api/v1/wagemaster/details/:userId?timeFrame=day|week|month|year&currentDate=YYYY-MM-DD
  getUserDetails: (userId, params = {}) => api.get(`/wagemaster/details/${userId}`, { params }),
  // PUT /api/v1/wagemaster/wage/:wageId
  updateWage: (wageId, { distance, da, ta }) => api.put(`/wagemaster/wage/${wageId}`, { distance, da, ta }),
  // POST /api/v1/wagemaster/executive/:userId/approve-duration
  approveCallDuration: (userId, { date, approvedDuration }) => api.post(`/wagemaster/executive/${userId}/approve-duration`, { date, approvedDuration }),
  // GET /api/v1/wagemaster/coordinates?userId=...&date=...
  getCoordinates: (params = {}) => api.get('/wagemaster/coordinates', { params }),
  // GET /api/v1/wagemaster/activity-log?userId=...&startDate=...&endDate=...
  getActivityLog: (params = {}) => api.get('/wagemaster/activity-log', { params }),
  // GET /api/v1/wagemaster/identifyimages?layout=...&startDate=...&endDate=...
  getIdentifyImages: (params = {}) => api.get('/wagemaster/identifyimages', { params }),
  // POST /api/v1/wagemaster/trigger-sync/:userId
  triggerSync: (userId) => api.post(`/wagemaster/trigger-sync/${userId}`),
};

// --------------------------------------------
// WhatsApp Template API
// --------------------------------------------
const whatsappTemplateApi = {
  getAllTemplates: () => api.get('/whatsapp-template'),
  createTemplate: (data) => api.post('/whatsapp-template', data),
  updateTemplate: (id, data) => api.put(`/whatsapp-template/${id}`, data),
  deleteTemplate: (id) => api.delete(`/whatsapp-template/${id}`),
};

// --------------------------------------------
// Contact API (master: /contact; callBuddy: /callBuddy for assign/bulk)
// --------------------------------------------
const contactApi = {
  // Contact master (base master pattern)
  getAllContacts: (params = {}) => api.get('/contact', { params }),
  createContact: (contactData) => api.post('/contact', contactData),
  updateContact: (contactData) => api.put(`/contact/${contactData.id}`, contactData),
  deleteContact: (id) => api.delete(`/contact/${id}`),
  // CallBuddy flows (assign, bulk, users, payment)
  bulkCreateContacts: (contactsData) => api.post('/callBuddy/bulk_add_and_assing_contacts', contactsData),
  assignContactsToUser: (contactId, userIds) => api.post('/callBuddy/contacts/assign', { contactId, userIds }),
  unassignContactFromUser: (assignmentId) => api.delete(`/callBuddy/assign_contacts/${assignmentId}`),
  getUsers: () => api.get('/callBuddy/users'),
  addPayment: (paymentData) => api.post('/callBuddy/addPayment', paymentData),
};

// --------------------------------------------
// Advance API
// --------------------------------------------
const advanceApi = {
  getAll: (filters = {}) => api.get('/advance', { params: filters }),
  getById: (id) => api.get(`/advance/${id}`),
  create: (data) => api.post('/advance', data),
  update: (id, data) => api.put(`/advance/${id}`, data),
  approve: (id) => api.post(`/advance/${id}/approve`),
  reject: (id) => api.post(`/advance/${id}/reject`),
  createRepayment: (data) => api.post('/advance/repayments', data),
  updateRepayment: (id, data) => api.put(`/advance/repayments/${id}`, data),
  deleteRepayment: (id) => api.delete(`/advance/repayments/${id}`),
  getScheduledPaymentsByEmployeeCode: (employee_code) => api.get(`/advance/scheduled-payments/employee/${employee_code}`),
};

// --------------------------------------------
// Location / Log History API
// --------------------------------------------
const locationApi = {
  // GET /api/v1/location/log-history?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  getLogHistory: (params = {}) => api.get('/location/log-history', { params }),
};

// --------------------------------------------
// Users API (Feedback, Dealer details)
// --------------------------------------------
const usersApi = {
  // GET /api/v1/users/getDealerName?locationId=...
  getDealerName: (locationId) => {
    if (!locationId) throw new Error('locationId is required');
    return api.get('/location/getDealerName', { params: { locationId } });
  },
  // POST /api/v1/users/complete_milestone
  completeMilestone: (payload) => {
    if (!payload) throw new Error('payload is required');
    return api.post('/location/complete_milestone', payload);
  },
};

// --------------------------------------------
// Iclock Terminal API
// --------------------------------------------
const iclockTerminalApi = {
  getAllTerminals: () => api.get('/iclock-terminal'),
  createTerminal: (terminalData) => api.post('/iclock-terminal', terminalData),
  updateTerminal: (terminalId, terminalData) => api.put(`/iclock-terminal/${terminalId}`, terminalData),
  deleteTerminal: (terminalId) => api.delete(`/iclock-terminal/${terminalId}`),
  syncTerminal: (terminalId, data) => api.post(`/iclock-terminal/${terminalId}/sync`, data),
  syncAllTerminals: (data) => api.post('/iclock-terminal/sync-all', data),
  syncDataToDevice: (data) => api.post('/iclock-terminal/sync-data-to-device', data),
  rebootTerminal: (terminalId) => api.post(`/iclock-terminal/${terminalId}/reboot`),
  clearDeviceData: (terminalId, data) => api.post(`/iclock-terminal/${terminalId}/clear-data`, data),
  getUserDataFromDevice: (terminalId, data) => api.post(`/iclock-terminal/${terminalId}/get-user-data`, data),
  initialSync: (terminalId, data) => api.post(`/iclock-terminal/${terminalId}/initial-sync`, data),
  pushDefaultTimezone: (terminalId) => api.post(`/iclock-terminal/${terminalId}/push-default-timezone`),
  pushDefaultTimezoneToAll: () => api.post('/iclock-terminal/push-default-timezone-all'),
  queryTimezone: (terminalId) => api.post(`/iclock-terminal/${terminalId}/query-timezone`),
  queryFirstCard: (terminalId) => api.post(`/iclock-terminal/${terminalId}/query-first-card`),
  runCommand: (terminalId, content) => api.post(`/iclock-terminal/${terminalId}/run-command`, { content }),
  changeTerminalCompany: (terminalId, companyId) => api.put(`/iclock-terminal/${terminalId}/change-company`, { company_id: companyId }),
  setTerminalEnabled: (terminalId, enabled) => api.put(`/iclock-terminal/${terminalId}/enabled`, { enabled }),
  // TCP-pull mode (server initiates connection to device on port 4370 by
  // default, configurable per-terminal via pull_port). Coexists with the
  // iClock push path on the same terminal.
  testTcpConnection: (terminalId) => api.post(`/iclock-terminal/${terminalId}/tcp/test`),
  tcpPullAttendance: (terminalId, data) => api.post(`/iclock-terminal/${terminalId}/tcp/pull-attendance`, data),
  tcpPullAllAttendance: () => api.post('/iclock-terminal/tcp/pull-all-attendance'),
  tcpPullUsers: (terminalId, data) => api.post(`/iclock-terminal/${terminalId}/tcp/pull-users`, data),
  tcpInitialSync: (terminalId, data) => api.post(`/iclock-terminal/${terminalId}/tcp/initial-sync`, data),
};

// --------------------------------------------
// Terminal Command API
// --------------------------------------------
const terminalCommandApi = {
  getTerminalCommands: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    return api.get(`/terminal-commands?${params.toString()}`);
  },
  getTerminalCommandErrors: () => {
    return api.get('/terminal-commands/errors');
  },
  getUnverifiedEmployees: () => {
    return api.get('/terminal-commands/unverified-employees');
  },
  getEmployeesWithoutBiotemplates: () => {
    return api.get('/terminal-commands/employees-without-biotemplates');
  },
  getEmployeeSyncComparison: (params = {}) => {
    const query = {};
    if (params.emp_code != null && String(params.emp_code).trim() !== '') {
      query.emp_code = String(params.emp_code).trim();
    }
    return api.get('/terminal-commands/employee-sync-comparison', { params: query });
  },
  deleteTerminalCommand: (id) => api.delete(`/terminal-commands/${id}`),
  clearTerminalCommands: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    return api.delete(`/terminal-commands/bulk?${params.toString()}`);
  },
  resendTerminalCommand: (id) => api.post(`/terminal-commands/${id}/resend`),
};

// --------------------------------------------
// Cost Center API
// --------------------------------------------
const costCenterApi = {
  getAllCostCenters: () => api.get('/cost-center'),
  createCostCenter: (data) => api.post('/cost-center', data),
  updateCostCenter: (id, data) => api.put(`/cost-center/${id}`, data),
  deleteCostCenter: (id) => api.delete(`/cost-center/${id}`),
};

// --------------------------------------------
// Personnel Area API
// --------------------------------------------
const personnelAreaApi = {
  getAllPersonnelAreas: () => api.get('/personnel-areas'),
  getAreas: () => api.get('/personnel-areas'),
  createPersonnelArea: (data) => api.post('/personnel-areas', data),
  updatePersonnelArea: (id, data) => api.put(`/personnel-areas/${id}`, data),
  deletePersonnelArea: (id) => api.delete(`/personnel-areas/${id}`),
};

// --------------------------------------------
// Employee Area Assignment API
// --------------------------------------------
const employeeAreaAssignmentApi = {
  getAllAssignments: () => api.get('/employee-area-assignments'),
  createAssignments: (data) => api.post('/employee-area-assignments', data),
  deleteAssignment: (id) => api.delete(`/employee-area-assignments/${id}`),
};


const hrDashboardApi = {
  getTrends: () => runViaRunner('hr-dashboard/trends'),
  getActivityHeatmap: () => runViaRunner('hr-dashboard/activity-heatmap'),
  getAttendanceCorrectionDeptWise: () => runViaRunner('hr-dashboard/attendance-correction-dept-wise'),
  getShiftDisciplineDeptWise: () => runViaRunner('hr-dashboard/shift-discipline-dept-wise'),
  getEmployeesNotSeenRecently: () => runViaRunner('hr-dashboard/employees-not-seen-recently'),
  snapshot: {
    newEmployees:    () => runViaRunner('hr-dashboard/snapshot/new-employees'),
    todayPunches:    () => runViaRunner('hr-dashboard/snapshot/today-punches'),
    onLeaveToday:    () => runViaRunner('hr-dashboard/snapshot/on-leave-today'),
    yesterday:       () => runViaRunner('hr-dashboard/snapshot/yesterday'),
    activeTerminals: () => runViaRunner('hr-dashboard/snapshot/active-terminals'),
    appraisalCycle:  () => runViaRunner('hr-dashboard/snapshot/appraisal-cycle')
  },
  upcoming: {
    birthdays:     () => runViaRunner('hr-dashboard/upcoming/birthdays'),
    anniversaries: () => runViaRunner('hr-dashboard/upcoming/anniversaries'),
    leaves:        () => runViaRunner('hr-dashboard/upcoming/leaves')
  }
};

// The checklist worklist — its own page, its own permission, its own prefix.
// Every item shares one response shape, so it takes the segment
// ('daily/no-shift', 'monthly/payroll-bank', …) rather than repeating fifteen
// identical wrappers. Segments live in CHECKLIST_ITEMS.
const hrChecklistApi = {
  run: (segment) => runViaRunner(`hr-checklist/${segment}`)
};

export { api, employeeApi, deptEmpApi, FormulaApi, holidayApi, SalaryStructureApi, rawPunch, canteenToken, reportApi, pastReportApi, unregisteredFacesReportApi, biotemplateReportApi, gatePassApi, departmentApi, positionApi, assetApi, leaveTypeApi, allowanceTypeApi, jobOfferSalaryStructureApi, purposeTypeApi, operationCycleApi, roleResponsibilityApi, canteenMealTypeApi, serviceOfferingApi, customerApi, companyProfileApi, workorderApi, leavesTakenApi, leaveListApi, employeeMergeApi, weeklyOffApi, employeeWeeklyOffApi, timetableApi, manualLogApi, manualLogEntryMasterApi, vastramDailyCounterApi, manualAttendanceApi, reportActionApi, shiftApi, employeeScheduleApi, departmentScheduleApi, departmentWeeklyOffApi, companyScheduleApi, companyWeeklyOffApi, compoundShiftApi, holidayTypeApi, reimbursementApi, advanceApi, wageMasterApi, contactApi, locationApi, usersApi, iclockTerminalApi, terminalCommandApi, costCenterApi, personnelAreaApi, employeeAreaAssignmentApi, whatsappTemplateApi,hrDashboardApi, hrChecklistApi, performanceCycleApi, performanceParameterApi, performanceReviewApi };
