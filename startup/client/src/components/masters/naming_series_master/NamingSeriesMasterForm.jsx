import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FormFooter } from '@startup/components/base_components/master';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { NumberTypeField } from '@startup/components/base_components/fields/NumberTypeField';
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

const NamingSeriesMasterForm = ({ isOpen, onClose, initialData, onSaved }) => {
  const [series, setSeries] = useState(EMPTY_SERIES);
  const [masterOptions, setMasterOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
      : EMPTY_SERIES);
    namingSeriesService.masters()
      .then((response) => setMasterOptions(
        (response.data?.data?.masters ?? []).map(({ master }) => ({ value: master, label: toMasterLabel(master) }))
      ))
      .catch((error) => setErrorMessage(
        getApiErrorMessage(error, 'Could not load the masters that use a naming series')
      ));
  }, [isOpen, initialData]);

  const patchSeries = (changes) => setSeries((prev) => ({ ...prev, ...changes }));
  const handleInputChange = (e) => patchSeries({ [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!isEditMode && !series.master) {
      setErrorMessage('Pick the master this series numbers.');
      return;
    }
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const nextCode = previewNextCode(series.template, series.count);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="p-3 rounded text-sm bg-red-50 border border-red-200 text-red-700">
          {errorMessage}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Master *</label>
        <SearchableDropdown
          options={masterOptions}
          value={series.master}
          multiple={false}
          disabled={isEditMode}
          placeholder="Select the master to number…"
          onChange={(master) => patchSeries({ master })}
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
        <label className="flex items-center">
          <input
            type="checkbox"
            name="is_default"
            checked={series.is_default}
            onChange={(e) => patchSeries({ is_default: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">Default for this master</span>
        </label>
        <p className="mt-1 text-xs text-gray-500">
          New records are numbered from the default series. A master&apos;s first series becomes its default.
        </p>
      </div>

      {nextCode && (
        <div className="p-3 rounded text-sm bg-blue-50 border border-blue-200 text-blue-800">
          Next code: <span className="font-mono font-semibold">{nextCode}</span>
        </div>
      )}

      <FormFooter
        onClose={onClose}
        isLoading={isLoading}
        isEditMode={isEditMode}
        createLabel="Create Series"
        updateLabel="Update Series"
        iconVariant="checkmark"
      />
    </form>
  );
};

NamingSeriesMasterForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
  initialData: PropTypes.object
};

export { NamingSeriesMasterForm };
