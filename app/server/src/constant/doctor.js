const DOCTOR_MESSAGES = {
  // Success messages
  SUCCESS: {
    DOCTORS_FETCHED: 'Doctors fetched successfully',
    DOCTOR_FETCHED: 'Doctor fetched successfully',
    DOCTOR_CREATED: 'Doctor created successfully',
    DOCTOR_UPDATED: 'Doctor updated successfully',
    DOCTOR_DELETED: 'Doctor and associated timings deleted successfully',
    DOCTOR_TIMING_DELETED: 'Doctor timing deleted successfully',
    DOCTOR_TIMINGS_DELETED: 'Doctor timings deleted successfully'
  },

  // Error messages
  ERROR: {
    DOCTOR_NOT_FOUND: 'Doctor not found',
    FETCH_DOCTORS_ERROR: 'Error fetching doctors',
    FETCH_DOCTOR_ERROR: 'Error fetching doctor',
    CREATE_DOCTOR_ERROR: 'Error creating doctor',
    UPDATE_DOCTOR_ERROR: 'Error updating doctor',
    DELETE_DOCTOR_ERROR: 'Error deleting doctor',
    DELETE_DOCTOR_TIMING_ERROR: 'Error deleting doctor timing',
    ALIAS_AND_TYPE_REQUIRED: 'Doctor alias and type are required',
    TIMING_NOT_FOUND: 'Doctor timing not found'
  }
};

module.exports = {
  DOCTOR_MESSAGES
};
