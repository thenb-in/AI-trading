const { Doctor } = require('../../model');
const { DOCTOR_MESSAGES } = require('../../constant/doctor');

const listDoctors = async (companyId) => {
  try {
    const doctors = await Doctor.findAll({
      where: {
        company_id: companyId
      },
      include: [
        {
          association: 'company',
          attributes: ['id', 'name']
        }
      ]
    });
    return doctors;
  } catch (error) {
    throw new Error(`${DOCTOR_MESSAGES.ERROR.FETCH_DOCTORS_ERROR}: ${error.message}`);
  }
};

const getDoctorById = async (doctorId, companyId) => {
  try {
    const doctor = await Doctor.findOne({
      where: {
        id: doctorId,
        company_id: companyId
      },
      include: [
        {
          association: 'company',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!doctor) {
      throw new Error(DOCTOR_MESSAGES.ERROR.DOCTOR_NOT_FOUND);
    }

    return doctor;
  } catch (error) {
    throw new Error(`${DOCTOR_MESSAGES.ERROR.FETCH_DOCTOR_ERROR}: ${error.message}`);
  }
};

module.exports = {
  listDoctors,
  getDoctorById
};
