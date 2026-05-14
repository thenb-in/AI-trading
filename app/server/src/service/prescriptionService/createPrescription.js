const { Prescription, Doctor } = require('../../model');
const { PRESCRIPTION_MESSAGES } = require('../../constant/prescription');

const createPrescription = async (prescriptionData, companyId, userId) => {
  try {
    // Validate required fields
    if (!prescriptionData.doctor_id || !prescriptionData.date) {
      throw new Error(PRESCRIPTION_MESSAGES.ERROR.DOCTOR_ID_REQUIRED);
    }

    // Verify doctor exists in company
    const doctor = await Doctor.findOne({
      where: {
        id: prescriptionData.doctor_id,
        company_id: companyId
      }
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    // Create prescription
    const prescription = await Prescription.create({
      doctor_id: prescriptionData.doctor_id,
      notes: prescriptionData.notes || null,
      date: prescriptionData.date,
      medicine_intake: prescriptionData.medicine_intake || null,
      next_follow_up: prescriptionData.next_follow_up || null,
      created_by: userId || null,
      updated_by: userId || null,
      company_id: companyId
    });

    // Fetch the created prescription with relations
    const createdPrescription = await Prescription.findOne({
      where: { id: prescription.id },
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

    return createdPrescription;
  } catch (error) {
    throw new Error(`${PRESCRIPTION_MESSAGES.ERROR.CREATE_PRESCRIPTION_ERROR}: ${error.message}`);
  }
};

module.exports = {
  createPrescription
};
