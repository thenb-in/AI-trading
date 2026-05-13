const { Doctor, DoctorTimings } = require('../../model');

const deleteDoctorTimings = async (timingId, doctorId, companyId) => {
  try {
    // Verify doctor exists and belongs to company
    const doctor = await Doctor.findOne({
      where: {
        id: doctorId,
        company_id: companyId
      }
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    // Find and verify the timing belongs to the doctor
    const timing = await DoctorTimings.findOne({
      where: {
        id: timingId,
        doctor_id: doctorId
      }
    });

    if (!timing) {
      throw new Error('Doctor timing not found');
    }

    // Delete the specific timing
    await DoctorTimings.destroy({
      where: {
        id: timingId
      }
    });

    return {
      message: 'Doctor timing deleted successfully',
      deletedTimingId: timingId,
      doctorId: doctorId
    };
  } catch (error) {
    throw new Error(`Error deleting doctor timing: ${error.message}`);
  }
};

module.exports = {
  deleteDoctorTimings
};