import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableSelectDropdownField';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { NBnextDriveAttachment } from '@startup/components/masters/nbnext_drive_master';
import { prescriptionService } from '@services/prescriptionService';
import { toast } from 'react-toastify';

const PrescriptionForm = ({ isOpen, onClose, doctors = [], onSubmit }) => {
  const [formData, setFormData] = useState({
    doctor_id: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    medicine_intake: '',
    next_follow_up: ''
  });

  const [prescriptionId, setPrescriptionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceTimerRef = useRef(null);
  const autoCreateTimerRef = useRef(null);
  const prevDoctorIdRef = useRef(null);

  // Auto-create prescription after doctor selection (1 sec delay)
  useEffect(() => {
    if (!formData.doctor_id) {
      return;
    }

    // Clear previous timer
    if (autoCreateTimerRef.current) {
      clearTimeout(autoCreateTimerRef.current);
    }

    // If doctor changed and prescription exists, update it
    if (prescriptionId && prevDoctorIdRef.current !== formData.doctor_id) {
      autoCreateTimerRef.current = setTimeout(async () => {
        try {
          await prescriptionService.updatePrescription(prescriptionId, {
            doctor_id: formData.doctor_id
          });
          prevDoctorIdRef.current = formData.doctor_id;
        } catch (error) {
          console.error('Error updating doctor:', error);
          toast.error('Failed to update doctor');
        }
      }, 1000);
      return;
    }

    // If no prescription exists yet, create one after 1 sec
    if (!prescriptionId) {
      autoCreateTimerRef.current = setTimeout(async () => {
        try {
          setLoading(true);
          const newPrescription = await prescriptionService.createPrescription({
            doctor_id: formData.doctor_id,
            notes: '',
            date: formData.date,
            medicine_intake: '',
            next_follow_up: ''
          });
          setPrescriptionId(newPrescription.id);
          prevDoctorIdRef.current = formData.doctor_id;
          toast.success('Prescription created');
        } catch (error) {
          console.error('Error creating prescription:', error);
          toast.error('Failed to create prescription');
        } finally {
          setLoading(false);
        }
      }, 1000);
    }

    return () => {
      if (autoCreateTimerRef.current) {
        clearTimeout(autoCreateTimerRef.current);
      }
    };
  }, [formData.doctor_id, prescriptionId]);

  // Auto-save all field changes (1 sec debounce)
  const handleFieldChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value
      }));

      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Only auto-save if prescription exists
      if (!prescriptionId) return;

      debounceTimerRef.current = setTimeout(async () => {
        try {
          await prescriptionService.updatePrescription(prescriptionId, {
            [field]: value
          });
        } catch (error) {
          console.error(`Error updating ${field}:`, error);
          toast.error(`Failed to update ${field}`);
        }
      }, 1000);
    },
    [prescriptionId]
  );

  const handleDoctorChange = (values) => {
    const doctorId = values[0] ? parseInt(values[0], 10) : '';
    handleFieldChange('doctor_id', doctorId);
  };

  const handleManualSave = async () => {
    if (!prescriptionId) {
      toast.error('Prescription not created yet. Please select a doctor.');
      return;
    }

    try {
      setLoading(true);
      await prescriptionService.updatePrescription(prescriptionId, formData);
      toast.success('Prescription saved successfully');
      onSubmit();
    } catch (error) {
      console.error('Error saving prescription:', error);
      toast.error('Failed to save prescription');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Clear all timers
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (autoCreateTimerRef.current) clearTimeout(autoCreateTimerRef.current);
    
    // Reset state
    setFormData({
      doctor_id: '',
      notes: '',
      date: new Date().toISOString().split('T')[0],
      medicine_intake: '',
      next_follow_up: ''
    });
    setPrescriptionId(null);
    prevDoctorIdRef.current = null;
    
    onClose();
  };

  if (!isOpen) return null;

  const isFormDisabled = !formData.doctor_id;
  const doctorOptions = doctors.map((doc) => ({
    value: String(doc.id),
    label: doc.alias
  }));

  const selectedDoctorValue = formData.doctor_id ? [String(formData.doctor_id)] : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">Add Prescription</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form Content */}
        <form className="p-6 space-y-6">
          {/* Doctor Selection - Required First */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Doctor *
            </label>
            <SearchableDropdown
              options={doctorOptions}
              selectedValues={selectedDoctorValue}
              onChange={handleDoctorChange}
              placeholder="Select a doctor to start"
              multiple={false}
            />
            {!formData.doctor_id && (
              <p className="text-xs text-blue-600 mt-2">
                Select a doctor first. Other fields will be enabled after selection.
              </p>
            )}
          </div>

          {/* Prescription Details - Disabled until doctor selected */}
          <div className="space-y-4 opacity-60 pointer-events-none" style={{ pointerEvents: isFormDisabled ? 'none' : 'auto', opacity: isFormDisabled ? 0.6 : 1 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prescription Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleFieldChange('date', e.target.value)}
                  disabled={isFormDisabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Follow-up Date
                </label>
                <input
                  type="date"
                  value={formData.next_follow_up}
                  onChange={(e) => handleFieldChange('next_follow_up', e.target.value)}
                  disabled={isFormDisabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                disabled={isFormDisabled}
                placeholder="Enter prescription notes"
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medicine Intake
              </label>
              <textarea
                value={formData.medicine_intake}
                onChange={(e) => handleFieldChange('medicine_intake', e.target.value)}
                disabled={isFormDisabled}
                placeholder="Enter medicine details and dosage"
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* File Uploads - Only show after prescription is created */}
          {prescriptionId && (
            <div className="border-t pt-6 space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Attachments</h3>

              {/* Prescription Documents */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3">Prescription Documents</h4>
                <NBnextDriveAttachment
                  objectName="Prescription"
                  objectId={prescriptionId}
                  accept="*/*"
                  hint="Upload prescription files (PDF, images, etc. - max 100MB)"
                  showCamera={true}
                  multipleSelect={true}
                  title="Prescription Files"
                />
              </div>

              {/* Audio Notes */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3">Audio Notes</h4>
                <NBnextDriveAttachment
                  objectName="Audio"
                  objectId={prescriptionId}
                  accept="audio/*,video/*"
                  hint="Record or upload audio notes (max 100MB)"
                  showCamera={true}
                  multipleSelect={true}
                  title="Audio Files"
                />
              </div>

              {/* Medical Reports */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3">Medical Reports</h4>
                <NBnextDriveAttachment
                  objectName="Reports"
                  objectId={prescriptionId}
                  accept="*/*"
                  hint="Upload medical reports, lab results, etc. (max 100MB)"
                  showCamera={true}
                  multipleSelect={true}
                  title="Report Files"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={handleManualSave}
              disabled={!prescriptionId || loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
            >
              {loading ? 'Saving...' : 'Save Prescription'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400 disabled:bg-gray-400 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

PrescriptionForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  doctors: PropTypes.array,
  onSubmit: PropTypes.func
};

export { PrescriptionForm };
