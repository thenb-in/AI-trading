import PropTypes from 'prop-types';
import { FormModal } from '@startup/components/base_components/master';
import { MASTERS } from '@startup/constants/masters';
import { namingSeriesService } from '@services/namingSeriesService';
import { NamingSeriesMasterForm } from './NamingSeriesMasterForm';

const loadSeriesRecord = (id) =>
  namingSeriesService.list()
    .then((response) => (response.data?.data?.namingSeries ?? []).find((row) => String(row.id) === String(id)));

/**
 * The series form on its own modal, for the master-creator registry — opened from any form
 * whose master has no series yet, with `defaults.master` naming which master to add one for.
 */
const AddNamingSeriesModal = ({ isOpen, modalData, recordId, defaults, onClose, onSuccess = () => {} }) => (
  <FormModal
    masterName={MASTERS.NAMING_SERIES}
    isOpen={isOpen}
    onClose={onClose}
    record={modalData}
    recordId={recordId}
    loadRecord={loadSeriesRecord}
    maxWidth="sm"
  >
    {(record) => (
      <NamingSeriesMasterForm
        isOpen={isOpen}
        initialData={record}
        defaults={defaults}
        onClose={onClose}
        onSaved={onSuccess}
      />
    )}
  </FormModal>
);

AddNamingSeriesModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  modalData: PropTypes.object,
  recordId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaults: PropTypes.shape({ master: PropTypes.string }),
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func
};

export { AddNamingSeriesModal };
