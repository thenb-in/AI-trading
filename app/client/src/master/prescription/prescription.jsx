import { useEffect, useRef, useState } from 'react';
import { MasterHeader } from '@startup/components/base_components/master/master_header/MasterHeader';
import { NbNextDataGrid } from '@startup/components/nbnext_data_grid/NbNextDataGrid';
import { PrescriptionForm } from './prescriptionForm';
import { prescriptionService } from '@services/prescriptionService';
import { doctorService } from '@services/doctorService';

const PrescriptionMaster = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [columns, setColumns] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const headerRef = useRef(null);

  // Fetch all prescriptions
  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await prescriptionService.getAllPrescriptions();
      setPrescriptions(response.prescriptions || []);
      setColumns(response.columns || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all doctors
  const fetchDoctors = async () => {
    try {
      const response = await doctorService.getAllDoctors();
      setDoctors(response.doctors || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
    fetchDoctors();
  }, []);

  // Handle add new prescription
  const handleAdd = () => {
    setShowModal(true);
  };

  // Handle form submit
  const handleFormSubmit = () => {
    setShowModal(false);
    fetchPrescriptions();
  };

  return (
    <div className="space-y-4">
      <MasterHeader
        ref={headerRef}
        title="Prescriptions"
        onAddNew={handleAdd}
      />

      {
        <NbNextDataGrid
          columns={columns}
          data={prescriptions}
          loading={loading}
        />
      }

      <PrescriptionForm
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        doctors={doctors}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
};

export { PrescriptionMaster };
