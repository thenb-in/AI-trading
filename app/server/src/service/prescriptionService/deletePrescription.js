const { Prescription } = require('../../model');
const { PRESCRIPTION_MESSAGES } = require('../../constant/prescription');

const deletePrescription = async (prescriptionId, companyId) => {
  try {
    // Check if prescription exists
    const prescription = await Prescription.findOne({
      where: {
        id: prescriptionId,
        company_id: companyId
      }
    });

    if (!prescription) {
      throw new Error(PRESCRIPTION_MESSAGES.ERROR.PRESCRIPTION_NOT_FOUND);
    }

    // Delete prescription
    await Prescription.destroy({
      where: {
        id: prescriptionId,
        company_id: companyId
      }
    });

    return {
      message: PRESCRIPTION_MESSAGES.SUCCESS.PRESCRIPTION_DELETED,
      deletedPrescriptionId: prescriptionId
    };
  } catch (error) {
    throw new Error(`${PRESCRIPTION_MESSAGES.ERROR.DELETE_PRESCRIPTION_ERROR}: ${error.message}`);
  }
};

module.exports = {
  deletePrescription
};
