import PropTypes from 'prop-types';
import { FormModal } from '../master/master_modal/FormModal';

/**
 * A master's form as the creator its pickers open (registerMasterCreators): the
 * same form its BaseMaster shows, in a FormModal of its own. Opened with a
 * `recordId` it loads that record through `loadRecord` and edits it.
 *
 * The form is rendered the way BaseMaster renders it — `isOpen`, `onClose`,
 * `initialData`, and the success callback under `successProp` (a BaseMaster's
 * formSuccessProp). The form should hand what it saved to that callback (the
 * record or the API envelope around it), so the picker selects it.
 *
 * `formProps` are extra props the form needs; `modalProps` go to the FormModal
 * (maxWidth, createLabel, updateLabel).
 */
const masterFormCreator = ({
  FormComponent,
  masterName,
  loadRecord,
  successProp = 'onSuccess',
  formProps = {},
  modalProps = {},
}) => {
  const Creator = ({ isOpen, recordId, onClose, onSuccess }) => (
    <FormModal
      {...modalProps}
      isOpen={isOpen}
      masterName={masterName}
      recordId={recordId}
      loadRecord={loadRecord}
      onClose={onClose}
    >
      {(record) => (
        <FormComponent
          isOpen
          onClose={onClose}
          initialData={record}
          {...{ [successProp]: onSuccess }}
          {...formProps}
        />
      )}
    </FormModal>
  );

  Creator.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    recordId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
  };
  Creator.displayName = `${masterName.replace(/ /g, '')}Creator`;

  return Creator;
};

/** A loadRecord for masters with no read-by-id endpoint: the list read, searched for the id. */
const findInList = (loadList) => (id) =>
  loadList().then((list) => list.find((row) => String(row.id) === String(id)));

export { masterFormCreator, findInList };
