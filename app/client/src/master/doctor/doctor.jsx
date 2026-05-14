import { useEffect, useRef, useState } from 'react';
import { MasterHeader } from '@startup/components/base_components/master/master_header/MasterHeader';
import { NbNextDataGrid } from '@startup/components/nbnext_data_grid/NbNextDataGrid';
import { DoctorForm } from './doctorForm';
import { doctorService } from '@services/doctorService';
import { useAppContext } from '@context/AppContext';

const Doctor = () => {
  const [doctors, setDoctors] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const headerRef = useRef(null);
  const { user } = useAppContext();

  // Fetch all doctors
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await doctorService.getAllDoctors();
      setDoctors(response.doctors || []);
      setColumns(response.columns || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Handle add new doctor
  const handleAdd = () => {
    setSelectedDoctorId(null);
    setShowModal(true);
  };

  // Handle row click to edit
  const handleRowClick = (row) => {
    setSelectedDoctorId(row.id);
    setShowModal(true);
  };

  // Handle form submit
  const handleFormSubmit = () => {
    setShowModal(false);
    fetchDoctors();
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDoctorId(null);
  };

  // Convert columns format for grid
  const gridColumns = columns.map((col) => ({
    field: col.id,
    headerName: col.label,
    width: 150,
    type: col.type,
  }));

  return (
    <div className="flex-1 p-4 md:p-6">
      <MasterHeader
        ref={headerRef}
        title="Doctors"
        description="Manage doctors and their schedules"
        onAdd={handleAdd}
        onRefresh={fetchDoctors}
        userData={user}
        showRefresh={true}
        showBack={true}
        backUrl="/admin/master"
      />

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <NbNextDataGrid
          rows={doctors}
          columns={gridColumns}
          height={560}
          onRowSelect={handleRowClick}
          documentName="doctors"
        />
      </div>

      {showModal && (
        <DoctorForm
          doctorId={selectedDoctorId}
          isOpen={showModal}
          onClose={handleCloseModal}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
};

export { Doctor };
