import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useFormModal } from '@startup/components/base_components/master';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { NumberTypeField } from '@startup/components/base_components/fields/NumberTypeField';
import { CheckboxTypeField } from '@startup/components/base_components/fields/CheckboxTypeField';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';
import { namingSeriesService } from '@services/namingSeriesService';
import { getApiErrorMessage } from '@utils/apiErrorMessage';

const EMPTY_SERIES = { master: '', template: '', count: 0, is_default: false };

// The code the next record gets, by the same rule the server formats with: the # run is
// replaced by the number, padded to the run's width.
const previewNextCode = (template, count) => {
  const run = String(template || '').match(/#+/);
  return run ? template.replace(/#+/, String(Number(count || 0) + 1).padStart(run[0].length, '0')) : '';
};

const toMasterLabel = (master) =>
  master.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const NamingSeriesMasterForm = ({ isOpen, onClose, initialData, defaults = {}, onSaved }) => {
  const [series, setSeries] = useState(EMPTY_SERIES);
  const [masterOptions, setMasterOptions] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const isEditMode = Boolean(initialData?.id);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setSeries(initialData
      ? {
        master: initialData.master,
        template: initialData.template,
        count: initialData.count,
        is_default: initialData.is_default
      }
      : { ...EMPTY_SERIES, ...defaults });
    namingSeriesService.masters()
      .then((response) => setMasterOptions(
        (response.data?.data?.masters ?? []).map(({ master }) => ({ value: master, label: toMasterLabel(master) }))
      ))
      .catch((error) => setErrorMessage(
        getApiErrorMessage(error, 'Could not load the masters that use a naming series')
      ));
  }, [isOpen, initialData, defaults.master]);

  const patchSeries = (changes) => setSeries((prev) => ({ ...prev, ...changes }));
  const handleInputChange = (e) => patchSeries({ [e.target.name]: e.target.value });

  const submit = async () => {
    setErrorMessage(null);
    const payload = { template: series.template, count: Number(series.count || 0), is_default: series.is_default };
    try {
      if (isEditMode) {
        await namingSeriesService.update(initialData.id, payload);
      } else {
        await namingSeriesService.create({ ...payload, master: series.master });
      }
      onSaved();
      onClose();
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, `Failed to ${isEditMode ? 'update' : 'create'} naming series ${series.template}`)
      );
    }
  };

  const validate = () => (
    !isEditMode && !series.master ? { message: 'Pick the master this series numbers.', field: 'master' } : ''
  );

  useFormModal(submit, series, validate);

  if (!isOpen) return null;

  const nextCode = previewNextCode(series.template, series.count);

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-3 rounded text-sm bg-red-50 border border-red-200 text-red-700">
          {errorMessage}
        </div>
      )}

      <div data-field="master">
        <label className="block text-sm font-medium text-gray-700 mb-1">Master *</label>
        <SearchableDropdown
          options={masterOptions}
          value={series.master}
          multiple={false}
          disabled={isEditMode || Boolean(defaults.master)}
          placeholder="Select the master to number…"
          onChange={(master) => patchSeries({ master: master ?? '' })}
        />
      </div>

      <TextTypeField
        name="template"
        label="Template"
        placeholder="EMP-####"
        value={series.template}
        onChange={handleInputChange}
        hint="Text around one run of # — the # are replaced by the number, so EMP-#### gives EMP-0001."
        required
      />

      <NumberTypeField
        name="count"
        label="Last Number Used"
        value={series.count}
        onChange={handleInputChange}
        numberMode="int"
        min={0}
        hint="The next record gets this number + 1. Raise it to carry on after codes already in use."
      />

      <div>
        <CheckboxTypeField
          name="is_default"
          label="Default for this master"
          checked={series.is_default}
          onChange={(e) => patchSeries({ is_default: e.target.checked })}
        />
        <p className="mt-1 text-xs text-gray-500">
          New records are numbered from the default series. A master&apos;s first series becomes its default.
        </p>
      </div>

      {nextCode && (
        <div className="p-3 rounded text-sm bg-blue-50 border border-blue-200 text-blue-800">
          Next code: <span className="font-mono font-semibold">{nextCode}</span>
        </div>
      )}
    </div>
  );
};

NamingSeriesMasterForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  // Fields the caller fixes up front, e.g. { master: 'bom' } when adding a series from a BOM form.
  defaults: PropTypes.object
};

export { NamingSeriesMasterForm };
