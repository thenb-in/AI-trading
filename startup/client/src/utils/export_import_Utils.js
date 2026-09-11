import { toast } from "react-toastify";
import { showUndoToast } from "@startup/components/base_components/undo/UndoToast";
import { convertToISOString } from "@utils/dateTimeUtils";


const cellText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value !== 'object') {
    return String(value);
  }
  if (value instanceof Date) {
    return convertToISOString(value) ?? '';
  }
  // Hyperlink: what was typed is `text`, the mailto:/http: form is the machine's addition.
  if (typeof value.text === 'string') {
    return value.text;
  }
  // Rich text: one cell split into runs because part of it is bold, coloured, ...
  if (Array.isArray(value.richText)) {
    return value.richText.map((run) => run.text ?? '').join('');
  }
  // Formula: the computed value is what the reader sees, not the expression.
  if (value.formula !== undefined) {
    return value.result === null || value.result === undefined ? '' : String(value.result);
  }
  // An #N/A-style error cell has no usable text.
  if (value.error !== undefined) {
    return '';
  }
  return String(value);
};

// Generic handleImport function for bulk uploads
const handleImport = async ({
  event,
  file, // Optional: can pass file directly instead of from event
  apiCall,
  fetchData,
  setImporting,
  successMessage = "Data imported successfully",
  acceptedFileTypes = ".csv,.xlsx,.xls",
  // Callers may still pass `validateHeaders`; it is ignored — header validation
  // is the backend's job, so nothing here reads it.
  maxFileSize = 10 * 1024 * 1024, // 10MB
  onResults, // Optional callback to handle results (for modal display)
}) => {
  // Get file from parameter or event
  const selectedFile = file || (event?.target?.files?.[0]);

  if (!selectedFile) {
    toast.error("No file selected");
    return;
  }

  const validTypes = acceptedFileTypes.split(",").map((type) => type.trim().toLowerCase());
  const fileExtension = `.${selectedFile.name.split(".").pop().toLowerCase()}`;

  if (!validTypes.includes(fileExtension)) {
    toast.error(`Invalid file type. Allowed: ${acceptedFileTypes}`);
    return;
  }

  if (selectedFile.size > maxFileSize) {
    toast.error(`File size exceeds limit of ${maxFileSize / (1024 * 1024)}MB.`);
    return;
  }

  try {
    setImporting(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await apiCall(formData);
    if (response.status === 200 || response.status === 201) {
      const responseData = response?.data || {};
      const { message, errors } = responseData;

      // If onResults callback is provided, use it instead of toast notifications
      if (onResults) {
        onResults(responseData);
        if (fetchData) await fetchData();
        return;
      }

      // Default behavior: show toast notifications
      // Check if message indicates failure (no data processed)
      const isFailure = message && (
        message.toLowerCase().includes('no valid data') ||
        message.toLowerCase().includes('no valid') ||
        (errors && errors.length > 0 && message.toLowerCase().includes('errors encountered') && !message.toLowerCase().includes('successfully'))
      );

      // Show success message with error count if any
      if (errors && errors.length > 0) {
        // If it's a failure (no data processed), don't show success message
        if (!isFailure && message) {
          toast.success(message);
        } else if (isFailure && message) {
          // Show the failure message as error
          toast.error(message, { autoClose: 8000 });
        }
        
        // Show each error separately for better visibility
        errors.forEach(err => {
          const empCode = err.emp_code && err.emp_code !== 'N/A' ? err.emp_code : 'N/A';
          toast.error(
            `Row ${err.row} (Employee: ${empCode}): ${err.error}`,
            { autoClose: 10000 }
          );
        });
      } else if (responseData.batchId && responseData.created > 0) {
        // Imports run through createImportFunction come back tagged with the
        // batch they wrote, so the confirmation can carry its own way back.
        showUndoToast({ message: message || successMessage, batchId: responseData.batchId, onUndone: fetchData });
      } else {
        toast.success(message || successMessage);
      }

      if (fetchData) await fetchData();
    } else {
      throw new Error(response.data?.error || `Unexpected status code: ${response.status}`);
    }
  } catch (err) {
    const { response } = err;
    let errorMessage = "Import failed";
    let errorResults = null;

    // Handle error response structure
    if (response?.data) {
      const { error, errors, message, created, updated } = response.data;
      
      // Build error results object if onResults callback is provided
      if (onResults) {
        errorResults = {
          message: message || error || "Import failed",
          created: created || [],
          updated: updated || [],
          errors: errors || (error ? [{ row: 0, emp_code: 'N/A', error }] : []),
        };
      }
      
      if (errors && Array.isArray(errors) && errors.length > 0) {
        // Show first error in the main toast, then show others separately
        const firstError = errors[0];
        errorMessage = `Row ${firstError.row} (Employee: ${firstError.emp_code || 'N/A'}): ${firstError.error}`;
        
        // Show remaining errors as separate toasts only if not using modal
        if (!onResults) {
          errors.slice(1).forEach(err => {
            toast.error(
              `Row ${err.row} (Employee: ${err.emp_code || 'N/A'}): ${err.error}`,
              { autoClose: 10000 }
            );
          });
        }
      } else if (error) {
        errorMessage = error;
      } else if (message) {
        errorMessage = message;
      }
    } else if (err.message) {
      errorMessage = err.message;
      if (onResults) {
        errorResults = {
          message: errorMessage,
          created: [],
          updated: [],
          errors: [{ row: 0, emp_code: 'N/A', error: errorMessage }],
        };
      }
    }

    // Use onResults callback if provided, otherwise show toast
    if (onResults && errorResults) {
      onResults(errorResults);
    } else {
      console.error('export_import_Utils: Error during import', {
        fileName: selectedFile?.name,
        fileSize: selectedFile?.size,
        error: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error(errorMessage, { autoClose: 10000 });
    }
  } finally {
    setImporting(false);
    // Reset file input only if event exists
    if (event?.target) {
      event.target.value = "";
    }
  }
};

// Generic handleExport function
const handleExport = async ({
  apiCall,
  setLoading,
  successMessage,
  responseType = "blob",
  isExcel = true,
  params = {},
}) => {
  try {
    setLoading(true);
    const response = await apiCall(params);

    if (response.status === 200) {
      let blob;

      // Use response data directly if already a Blob
      if (responseType === "blob") {
        blob = response.data;
      } else {
        // Create blob from plain text
        blob = new Blob([response.data], {
          type: isExcel
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv",
        });
      }

      // Extract filename from Content-Disposition header if available
      const contentDisposition = response.headers["content-disposition"];
      let fileName = "download";
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch?.[1]) {
          fileName = decodeURIComponent(fileNameMatch[1]);
        }
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(successMessage);
    } else {
      throw new Error(response.data?.error || `Unexpected status code: ${response.status}`);
    }
  } catch (err) {
    let errorMessage = "Failed to export data";
    if (err.response) {
      const { status, data } = err.response;
      if (status === 400) errorMessage = data?.error || "Invalid export request";
      else if (status === 500) errorMessage = "Server error during export";
      else errorMessage = data?.error || err.message;
    } else {
      errorMessage = err.message || "Network error during export";
    }
    console.error('export_import_Utils: Error during export', {
      responseType,
      error: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    toast.error(errorMessage);
  } finally {
    setLoading(false);
  }
};

export { handleImport, handleExport, cellText };
