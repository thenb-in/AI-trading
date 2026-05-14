import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import PropTypes from 'prop-types';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { NumberTypeField } from '@startup/components/base_components/fields/NumberTypeField';
import { EmailTypeField } from '@startup/components/base_components/fields/EmailTypeField';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableSelectDropdownField';
import { doctorService } from '@services/doctorService';
import { DAYS_OF_WEEK, DOCTOR_TYPES } from './constants';

const DoctorForm = ({ doctorId, isOpen, onClose, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    alias: '',
    type: '',
    mobile_number: '',
    email: '',
    adress: '',
    alternate_number: ''
  });

  const [timings, setTimings] = useState([]);
  const [newTiming, setNewTiming] = useState({
    day: 'Monday',
    start_time: '09:00',
    end_time: '17:00'
  });

  // Fetch doctor data when editing
  useEffect(() => {
    if (isOpen && doctorId) {
      fetchDoctorData();
    } else if (isOpen && !doctorId) {
      // Reset for new doctor
      setFormData({
        alias: '',
        type: '',
        mobile_number: '',
        email: '',
        adress: '',
        alternate_number: ''
      });
      setTimings([]);
    }
  }, [isOpen, doctorId]);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const doctor = await doctorService.getDoctorById(doctorId);
      setFormData({
        alias: doctor.alias || '',
        type: doctor.type || '',
        mobile_number: doctor.mobile_number || '',
        email: doctor.email || '',
        adress: doctor.adress || '',
        alternate_number: doctor.alternate_number || ''
      });
      setTimings(doctor.timings || []);
    } catch (error) {
      console.error('Error fetching doctor:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNewTimingChange = (e) => {
    const { name, value } = e.target;
    setNewTiming((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTimingChange = (index, field, value) => {
    const updatedTimings = [...timings];
    updatedTimings[index] = {
      ...updatedTimings[index],
      [field]: value
    };
    setTimings(updatedTimings);
  };

  const handleAddTiming = () => {
    if (newTiming.day && newTiming.start_time && newTiming.end_time) {
      setTimings((prev) => [...prev, { ...newTiming }]);
      setNewTiming({
        day: 'Monday',
        start_time: '09:00',
        end_time: '17:00'
      });
    }
  };

  const handleRemoveTiming = (index) => {
    setTimings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (doctorId) {
        // Update doctor
        await doctorService.updateDoctor(doctorId, formData, timings);
      } else {
        // Create doctor
        await doctorService.createDoctor(formData, timings);
      }
      onSubmit();
    } catch (error) {
      console.error('Error submitting doctor:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">
            {doctorId ? 'Edit Doctor' : 'Add New Doctor'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Doctor Information Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Doctor Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextTypeField
                id="alias"
                name="alias"
                label="Doctor Name *"
                value={formData.alias}
                onChange={handleInputChange}
                placeholder="Enter doctor name"
                required
              />

              <SearchableDropdown
                id="type"
                options={DOCTOR_TYPES}
                selectedValues={formData.type ? [formData.type] : []}
                onChange={(values) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: values[0] || ''
                  }))
                }
                placeholder="Select doctor type"
                multiple={false}
              />

              <NumberTypeField
                id="mobile_number"
                name="mobile_number"
                label="Mobile Number"
                value={formData.mobile_number}
                onChange={handleInputChange}
                placeholder="Enter mobile number"
              />

              <EmailTypeField
                id="email"
                name="email"
                label="Email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email"
              />

              <TextTypeField
                id="adress"
                name="adress"
                label="Address"
                value={formData.adress}
                onChange={handleInputChange}
                placeholder="Enter address"
              />

              <NumberTypeField
                id="alternate_number"
                name="alternate_number"
                label="Alternate Number"
                value={formData.alternate_number}
                onChange={handleInputChange}
                placeholder="Enter alternate number"
              />
            </div>
          </div>

          {/* Timings Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Work Timings</h3>

            {/* Existing Timings */}
            {timings.length > 0 && (
              <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
                {timings.map((timing, index) => (
                  <div key={index} className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg">
                    <div className="flex-1">
                      <SearchableDropdown
                        options={DAYS_OF_WEEK}
                        selectedValues={[timing.day]}
                        onChange={(values) => handleTimingChange(index, 'day', values[0])}
                        placeholder="Select day"
                        multiple={false}
                      />
                    </div>
                    <input
                      type="time"
                      value={timing.start_time}
                      onChange={(e) => handleTimingChange(index, 'start_time', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="time"
                      value={timing.end_time}
                      onChange={(e) => handleTimingChange(index, 'end_time', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTiming(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Timing */}
            <div className="flex gap-2 items-end bg-blue-50 p-3 rounded-lg">
              <div className="flex-1">
                <SearchableDropdown
                  options={DAYS_OF_WEEK}
                  selectedValues={[newTiming.day]}
                  onChange={(values) => setNewTiming((prev) => ({ ...prev, day: values[0] }))}
                  placeholder="Select day"
                  multiple={false}
                />
              </div>
              <input
                type="time"
                value={newTiming.start_time}
                onChange={handleNewTimingChange}
                name="start_time"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="time"
                value={newTiming.end_time}
                onChange={handleNewTimingChange}
                name="end_time"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddTiming}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {loading ? 'Saving...' : doctorId ? 'Update Doctor' : 'Create Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

DoctorForm.propTypes = {
  doctorId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};

export { DoctorForm };
