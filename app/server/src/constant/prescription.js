const PRESCRIPTION_MESSAGES = {
  // Success messages
  SUCCESS: {
    PRESCRIPTIONS_FETCHED: 'Prescriptions fetched successfully',
    PRESCRIPTION_FETCHED: 'Prescription fetched successfully',
    PRESCRIPTION_CREATED: 'Prescription created successfully',
    PRESCRIPTION_UPDATED: 'Prescription updated successfully',
    PRESCRIPTION_DELETED: 'Prescription deleted successfully'
  },

  // Error messages
  ERROR: {
    PRESCRIPTION_NOT_FOUND: 'Prescription not found',
    FETCH_PRESCRIPTIONS_ERROR: 'Error fetching prescriptions',
    FETCH_PRESCRIPTION_ERROR: 'Error fetching prescription',
    CREATE_PRESCRIPTION_ERROR: 'Error creating prescription',
    UPDATE_PRESCRIPTION_ERROR: 'Error updating prescription',
    DELETE_PRESCRIPTION_ERROR: 'Error deleting prescription',
    DOCTOR_ID_REQUIRED: 'Doctor ID is required',
    DATE_REQUIRED: 'Prescription date is required'
  }
};

module.exports = {
  PRESCRIPTION_MESSAGES
};
