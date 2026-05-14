const PRESCRIPTION_COLUMNS = [
  { id: 'id', label: 'Prescription ID', type: 'number', readOnly: true },
  { id: 'doctor_id', label: 'Doctor ID', type: 'number' },
  { id: 'notes', label: 'Notes', type: 'text' },
  { id: 'date', label: 'Prescription Date', type: 'datetime' },
  { id: 'medicine_intake', label: 'Medicine Intake', type: 'text' },
  { id: 'next_follow_up', label: 'Next Follow-up Date', type: 'date' },
  { id: 'created_by', label: 'Created By', type: 'number' },
  { id: 'updated_by', label: 'Updated By', type: 'number' },
  { id: 'created_at', label: 'Created At', type: 'datetime', readOnly: true },
  { id: 'updated_at', label: 'Updated At', type: 'datetime', readOnly: true }
];

module.exports = {
  PRESCRIPTION_COLUMNS
};
