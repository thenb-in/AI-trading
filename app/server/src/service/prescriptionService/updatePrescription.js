const { Prescription, Doctor } = require('../../model');
const { PRESCRIPTION_MESSAGES } = require('../../constant/prescription');

const updatePrescription = async (prescriptionId, prescriptionData, companyId, userId) => {
  try {
    // Verify prescription exists and belongs to company
    const prescription = await Prescription.findOne({
      where: {
        id: prescriptionId,
        company_id: companyId
      }
    });

    if (!prescription) {
      throw new Error(PRESCRIPTION_MESSAGES.ERROR.PRESCRIPTION_NOT_FOUND);
    }

    // If doctor_id is provided, verify it exists
    if (prescriptionData.doctor_id) {
      const doctor = await Doctor.findOne({
        where: {
          id: prescriptionData.doctor_id,
          company_id: companyId
        }
      });

      if (!doctor) {
        throw new Error('Doctor not found');
      }
    }

    // Update prescription
    const updatedPrescription = await Prescription.update(
      {
        doctor_id: prescriptionData.doctor_id !== undefined ? prescriptionData.doctor_id : prescription.doctor_id,
        notes: prescriptionData.notes !== undefined ? prescriptionData.notes : prescription.notes,
        date: prescriptionData.date !== undefined ? prescriptionData.date : prescription.date,
        medicine_intake: prescriptionData.medicine_intake !== undefined ? prescriptionData.medicine_intake : prescription.medicine_intake,
        next_follow_up: prescriptionData.next_follow_up !== undefined ? prescriptionData.next_follow_up : prescription.next_follow_up,
        updated_by: userId || null
      },
      {
        where: { id: prescriptionId }
      }
    );

    // Fetch the updated prescription with relations
    const result = await Prescription.findOne({
      where: { id: prescriptionId },
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

    return result;
  } catch (error) {
    throw new Error(`${PRESCRIPTION_MESSAGES.ERROR.UPDATE_PRESCRIPTION_ERROR}: ${error.message}`);
  }
};

module.exports = {
  updatePrescription
};
