const { Doctor, DoctorTimings } = require('../../model');
const { DOCTOR_MESSAGES } = require('../../constant/doctor');

const deleteDoctor = async (doctorId, companyId) => {
  try {
    // Check if doctor exists
    const doctor = await Doctor.findOne({
      where: {
        id: doctorId,
        company_id: companyId
      }
    });

    if (!doctor) {
      throw new Error(DOCTOR_MESSAGES.ERROR.DOCTOR_NOT_FOUND);
    }

    // Delete doctor - timings will be deleted automatically due to CASCADE constraint
    await Doctor.destroy({
      where: {
        id: doctorId,
        company_id: companyId
      }
    });

    return {
      message: DOCTOR_MESSAGES.SUCCESS.DOCTOR_DELETED,
      deletedDoctorId: doctorId
    };
  } catch (error) {
    throw new Error(`${DOCTOR_MESSAGES.ERROR.DELETE_DOCTOR_ERROR}: ${error.message}`);
  }
};



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
      throw new Error(DOCTOR_MESSAGES.ERROR.DOCTOR_NOT_FOUND);
    }

    // Find and verify the timing belongs to the doctor
    const timing = await DoctorTimings.findOne({
      where: {
        id: timingId,
        doctor_id: doctorId
      }
    });

    if (!timing) {
      throw new Error(DOCTOR_MESSAGES.ERROR.TIMING_NOT_FOUND);
    }

    // Delete the specific timing
    await DoctorTimings.destroy({
      where: {
        id: timingId
      }
    });

    return {
      message: DOCTOR_MESSAGES.SUCCESS.DOCTOR_TIMING_DELETED,
      deletedTimingId: timingId,
      doctorId: doctorId
    };
  } catch (error) {
    throw new Error(`${DOCTOR_MESSAGES.ERROR.DELETE_DOCTOR_TIMING_ERROR}: ${error.message}`);
  }
};

module.exports = {
  deleteDoctor,
  deleteDoctorTimings
};
