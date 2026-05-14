const { Prescription, Doctor } = require('../../model');
const { PRESCRIPTION_MESSAGES } = require('../../constant/prescription');

const listPrescriptions = async (companyId) => {
  try {
    const prescriptions = await Prescription.findAll({
      where: {
        company_id: companyId
      },
      include: [
        {
          model: Doctor,
          as: 'doctor',
          attributes: ['id', 'alias', 'type']
        },
        {
          association: 'company',
          attributes: ['id', 'name']
        }
      ]
    });
    return prescriptions;
  } catch (error) {
    throw new Error(`${PRESCRIPTION_MESSAGES.ERROR.FETCH_PRESCRIPTIONS_ERROR}: ${error.message}`);
  }
};

const getPrescriptionById = async (prescriptionId, companyId) => {
  try {
    const prescription = await Prescription.findOne({
      where: {
        id: prescriptionId,
        company_id: companyId
      },
      include: [
        {
          model: Doctor,
          as: 'doctor',
          attributes: ['id', 'alias', 'type']
        },
        {
          association: 'company',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!prescription) {
      throw new Error(PRESCRIPTION_MESSAGES.ERROR.PRESCRIPTION_NOT_FOUND);
    }

    return prescription;
  } catch (error) {
    throw new Error(`${PRESCRIPTION_MESSAGES.ERROR.FETCH_PRESCRIPTION_ERROR}: ${error.message}`);
  }
};

module.exports = {
  listPrescriptions,
  getPrescriptionById
};
