const { Doctor, DoctorTimings, sequelize } = require('../../model');
const { DOCTOR_MESSAGES } = require('../../constant/doctor');

const createDoctor = async (doctorData, timingsArray, companyId) => {
  const transaction = await sequelize.transaction();

  try {
    // Validate required fields
    if (!doctorData.alias || !doctorData.type) {
      throw new Error(DOCTOR_MESSAGES.ERROR.ALIAS_AND_TYPE_REQUIRED);
    }

    // Create doctor
    const doctor = await Doctor.create(
      {
        alias: doctorData.alias,
        type: doctorData.type,
        mobile_number: doctorData.mobile_number || null,
        email: doctorData.email || null,
        adress: doctorData.adress || null,
        alternate_number: doctorData.alternate_number || null,
        company_id: companyId
      },
      { transaction }
    );

    // Create doctor timings if provided
    if (timingsArray && Array.isArray(timingsArray) && timingsArray.length > 0) {
      const timingsData = timingsArray.map((timing) => ({
        doctor_id: doctor.id,
        day: timing.day,
        start_time: timing.start_time,
        end_time: timing.end_time
      }));

      await DoctorTimings.bulkCreate(timingsData, { transaction });
    }

    // Commit transaction
    await transaction.commit();

    // Fetch the created doctor with timings
    const createdDoctor = await Doctor.findOne({
      where: { id: doctor.id },
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

    return createdDoctor;
  } catch (error) {
    await transaction.rollback();
    throw new Error(`${DOCTOR_MESSAGES.ERROR.CREATE_DOCTOR_ERROR}: ${error.message}`);
  }
};

module.exports = {
  createDoctor
};
