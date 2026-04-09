import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';

/**
 * Shared hook for master CRUD pages that follow the columns+data pattern.
 *
 * @param {Object} options
 * @param {Function} options.fetchService  - async fn returning { columns, data }
 * @param {Object}   options.initialFormData - default form state on add/reset
 * @param {string[]} options.searchKeys     - row keys to match against the search query
 * @param {string}   [options.errorMessage] - toast message on fetch failure
 */
function useMasterData({ fetchService, initialFormData, searchKeys, errorMessage = 'Failed to fetch data' }) {
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchService();

      if (response.columns && response.data) {
        setColumns(response.columns);
        setData(response.data);
      } else {
        setData(response.data || response || []);
      }
    } catch (error) {
      toast.error(error?.error || error?.response?.data?.error || errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchService, errorMessage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormChange = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const openModal = useCallback(() => {
    setFormData(initialFormData);
    setIsModalOpen(true);
  }, [initialFormData]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return data;
    }
    const query = searchQuery.toLowerCase();
    return data.filter(row =>
      searchKeys.some(key => row[key] && String(row[key]).toLowerCase().includes(query))
    );
  }, [data, searchQuery, searchKeys]);

  const tableColumns = useMemo(() =>
    columns.map(col => ({
      key: col.key,
      label: col.display_name || col.label || col.key,
      type: col.type || 'string'
    })),
  [columns]);

  return {
    columns,
    tableColumns,
    data,
    filteredData,
    loading,
    searchQuery,
    setSearchQuery,
    isModalOpen,
    formData,
    setFormData,
    handleFormChange,
    openModal,
    closeModal,
    fetchData,
  };
}

export { useMasterData };
