import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@utils/apiErrorMessage';
import { hasPermission } from '@startup/hooks/hasPermission';
import { useDataContext } from '@context/useDataContext';
import { masterKeyOf } from '@startup/utils/masterKey';
import { SearchableDropdown } from './SearchableDropdown';
import { useMasterCreator } from '../master/master_modal/MasterModalProvider';
import { useFieldError } from './shared/formEditable';

/**
 * The picker for any master record, wherever that record is picked.
 *
 * It loads its own rows — on mount, so the current value has a label, and on
 * every open, so a record created elsewhere shows up. `loadRows` is any async
 * function that resolves to the rows — an API call with filters works as is.
 * Pass a cached read for common masters: both loads then become a lookup
 * rather than a round trip, where an uncached call hits the server on every
 * open. Either way the screen holding the picker fetches nothing and keeps no list.
 *
 * Creating a record is part of the picker too: the menu offers a create row,
 * opens the creator registered for the master with what was typed as
 * `defaults.initialName`, reloads, and selects what was just made.
 *
 * Values are record ids as strings, which is what SearchableDropdown works in,
 * unless `getValue` keys the records by something else a form stores instead.
 * `onChange` receives the id (or null) and the record itself — an array of
 * each for `multiple` — so a caller that copies fields off the record does not
 * look it up again.
 *
 * Editing is the same creator: the button beside the field opens the picked
 * record in it by id, over the current screen, so nothing typed there is lost.
 * Both need the master's own permission — create_<master>, read_<master> — and
 * are offered only where the master registered a creator. `masterName` is the
 * master in words ("Cost Center"): the creator is registered under it, and its
 * permissions spell it cost_center.
 * The modal loads the whole record itself (list rows can be lean); after
 * saving the list reloads so the field shows the edited label.
 */

// Creators hand back either the record or the API envelope around it.
const createdIdOf = (created) => created?.id ?? created?.data?.id;

const idOf = (row) => String(row.id);

function MasterSelector({
  value,
  onChange,
  loadRows,
  toOption,
  getValue = idOf,
  filter,
  sort,
  describeMissing,
  creatorDefaults,
  masterName,
  label,
  placeholder,
  multiple = false,
  allowCreate = true,
  allowEdit = true,
  disabled = false,
  required = false,
  error: errorProp,
  name = '',
  renderOption,
  autoOpen = false,
  onClose,
  allowOptionsOutsideSelectBox = false,
  className = '',
}) {
  const error = useFieldError(name, errorProp);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // `loading` is the first load only — later reloads refresh what is already
  // on screen rather than blanking the field.
  const load = useCallback(() => loadRows()
    .then((list) => {
      setRows(list);
      return list;
    })
    .catch((loadError) => {
      toast.error(getApiErrorMessage(loadError, `Could not load ${masterName} list`));
      return [];
    })
    .finally(() => setLoading(false)), [loadRows, masterName]);

  useEffect(() => {
    load();
  }, [load]);

  const rowsByValue = useMemo(() => new Map(rows.map((row) => [getValue(row), row])), [rows, getValue]);
  const selectedValues = useMemo(() => {
    if (multiple) return (value || []).map(String);
    return value === null || value === undefined || value === '' ? '' : String(value);
  }, [multiple, value]);

  const options = useMemo(() => {
    const ordered = sort ? [...rows].sort(sort) : rows;
    const listed = ordered.map((row) => ({ ...toOption(row), value: getValue(row) }));
    // A stored value the master no longer lists still shows, when the caller says how.
    const isMissing = describeMissing && !multiple && !loading && selectedValues !== '' && !rowsByValue.has(selectedValues);
    return isMissing ? [...listed, { value: selectedValues, label: describeMissing(selectedValues) }] : listed;
  }, [rows, sort, toOption, getValue, describeMissing, multiple, loading, selectedValues, rowsByValue]);

  // The dropdown filters options; a selector's filter is written against its records.
  // A value the master does not list has no record, so it is tested as the option itself.
  const recordFilter = useMemo(
    () => filter && ((option) => filter(rowsByValue.get(option.value) ?? option)),
    [filter, rowsByValue]
  );

  const handleChange = useCallback((next) => {
    if (multiple) {
      onChange(next, next.map((each) => rowsByValue.get(each)));
      return;
    }
    const picked = next === '' || next === undefined ? null : String(next);
    onChange(picked, picked === null ? null : rowsByValue.get(picked));
  }, [onChange, multiple, rowsByValue]);

  const masterKey = masterKeyOf(masterName);
  const { openMasterModal, hasCreator } = useMasterCreator();
  const { userData } = useDataContext();
  // Nothing would open without a creator, so don't offer the row at all.
  const isCreatable = hasCreator(masterName);
  const canCreate = allowCreate && isCreatable && hasPermission(`create_${masterKey}`, userData);

  // Reload before selecting, so the new record is in the list by the time it
  // is the value — a value with no matching option renders as an empty field.
  const selectCreated = useCallback((created) => load().then((list) => {
    const createdId = createdIdOf(created);
    const record = list.find((row) => String(row.id) === String(createdId));
    if (!record) return;
    const picked = getValue(record);
    if (multiple) {
      const values = [...selectedValues, picked];
      onChange(values, values.map((each) => list.find((row) => getValue(row) === each)));
      return;
    }
    onChange(picked, record);
  }), [load, onChange, multiple, selectedValues, getValue]);

  const openCreator = useCallback((searchTerm) => openMasterModal({
    masterName,
    defaults: { ...creatorDefaults, initialName: searchTerm || '' },
    onSuccess: selectCreated,
  }), [openMasterModal, masterName, creatorDefaults, selectCreated]);

  // Typed text has no record to edit, so only a listed pick gets the button.
  const pickedRecord = rowsByValue.get(selectedValues);
  const canEdit = allowEdit && isCreatable && Boolean(pickedRecord) && hasPermission(`read_${masterKey}`, userData);

  const openEditor = useCallback(
    () => openMasterModal({ masterName, recordId: pickedRecord.id, onSuccess: load }),
    [openMasterModal, masterName, pickedRecord, load]
  );

  return (
    <div className={className} data-field={name || undefined}>
      {label ? (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required ? <span className="text-red-500 ml-1">*</span> : null}
        </label>
      ) : null}
      <SearchableDropdown
        options={options}
        value={selectedValues}
        onChange={handleChange}
        placeholder={placeholder || `Select ${masterName}`}
        multiple={multiple}
        disabled={disabled || loading}
        loading={loading}
        onOpen={load}
        autoOpen={autoOpen}
        onClose={onClose}
        optionName={masterName}
        onCreate={canCreate ? openCreator : undefined}
        renderOption={renderOption}
        filter={recordFilter}
        onNavigate={canEdit ? openEditor : undefined}
        allowOptionsOutsideSelectBox={allowOptionsOutsideSelectBox}
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

MasterSelector.propTypes = {
  /** One id for single-select, an array of them for `multiple`. */
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  ]),
  /** (value | null, record) for single-select, (values, records) for multiple. */
  onChange: PropTypes.func.isRequired,
  /** () => Promise<rows>. Keep it stable (module level or memoised) and cached. */
  loadRows: PropTypes.func.isRequired,
  /**
   * (row) => ({ label, searchKeys?, ...anything renderOption draws }). `label` is
   * what the field shows; `searchKeys` are what the row is found by, strongest
   * first (code, then name), and default to the label. The value comes from
   * `getValue`. Keep it stable as well.
   */
  toOption: PropTypes.func.isRequired,
  /** (row) => string the field stores. Defaults to the id. Keep it stable. */
  getValue: PropTypes.func,
  /** (value) => label for a stored value the master does not list, so it still shows. */
  describeMissing: PropTypes.func,
  /** (record) => bool — leaves records out of the menu (the one being edited, the pick on another field); a picked one keeps its label. */
  filter: PropTypes.func,
  /** (a, b) => number — orders the rows, e.g. the ones that can cover a need first. */
  sort: PropTypes.func,
  /** Extra defaults handed to the creator along with the typed name. */
  creatorDefaults: PropTypes.object,
  /**
   * The master being picked, in words ("Cost Center") — a masters constant.
   * Phrases the placeholder and create row, opens the creator registered under
   * it, and checks its create_ / read_ permissions (create_cost_center).
   */
  masterName: PropTypes.string.isRequired,
  /** Field label. Omit where the surrounding layout already labels it. */
  label: PropTypes.string,
  placeholder: PropTypes.string,
  multiple: PropTypes.bool,
  /** Typed text is a value of its own; `onChange` then gets the text and no record. */
  allowOptionsOutsideSelectBox: PropTypes.bool,
  /** Set false where creating from the picker makes no sense. */
  allowCreate: PropTypes.bool,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  error: PropTypes.string,
  /** The form field it fills (itemGroupId): a form's validate names it to show its reason here and take the user to it. */
  name: PropTypes.string,
  /** (option) => node for its menu row. Keep it stable. */
  renderOption: PropTypes.func,
  /** Opens the menu on mount, for a field shown only while it is being edited. */
  autoOpen: PropTypes.bool,
  /** Called when the menu closes. */
  onClose: PropTypes.func,
  /** Set false where editing the pick makes no sense, like a filter bar. */
  allowEdit: PropTypes.bool,
  className: PropTypes.string,
};

export { MasterSelector };
