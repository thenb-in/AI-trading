const { Doctor, DoctorTimings, sequelize } = require('../../model');
const { DOCTOR_MESSAGES } = require('../../constant/doctor');

const updateDoctor = async (doctorId, doctorData, timingsArray, companyId) => {
  const transaction = await sequelize.transaction();

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

    // Update doctor information
    const updatedDoctor = await Doctor.update(
      {
        alias: doctorData.alias !== undefined ? doctorData.alias : doctor.alias,
        type: doctorData.type !== undefined ? doctorData.type : doctor.type,
        mobile_number: doctorData.mobile_number !== undefined ? doctorData.mobile_number : doctor.mobile_number,
        email: doctorData.email !== undefined ? doctorData.email : doctor.email,
        adress: doctorData.adress !== undefined ? doctorData.adress : doctor.adress,
        alternate_number: doctorData.alternate_number !== undefined ? doctorData.alternate_number : doctor.alternate_number
      },
      {
        where: { id: doctorId },
        transaction
      }
    );

    // Handle timings if provided
    if (timingsArray && Array.isArray(timingsArray) && timingsArray.length > 0) {
      for (const timing of timingsArray) {
        if (timing.id) {
          // Update existing timing
          await DoctorTimings.update(
            {
              day: timing.day,
              start_time: timing.start_time,
              end_time: timing.end_time
            },
            {
              where: {
                id: timing.id,
                doctor_id: doctorId
              },
              transaction
            }
          );
        } else {
          // Create new timing
          await DoctorTimings.create(
            {
              doctor_id: doctorId,
              day: timing.day,
              start_time: timing.start_time,
              end_time: timing.end_time
            },
            { transaction }
          );
        }
      }
    }

    // Commit transaction
    await transaction.commit();

    // Fetch the updated doctor with timings
    const result = await Doctor.findOne({
      where: { id: doctorId },
      include: [
        {
          association: 'company',
          attributes: ['id', 'name']
        },
        {
          model: DoctorTimings,
          as: 'timings',
          attributes: ['id', 'day', 'start_time', 'end_time'],
          required: false
        }
      ]
    });

    return result;
  } catch (error) {
    await transaction.rollback();
    throw new Error(`${DOCTOR_MESSAGES.ERROR.UPDATE_DOCTOR_ERROR}: ${error.message}`);
  }
};

module.exports = {
  updateDoctor
};
