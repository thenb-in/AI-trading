import { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';

import { useFormModal } from '@startup/components/base_components/master';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { CheckboxTypeField } from '@startup/components/base_components/fields/CheckboxTypeField';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';
import { GEOGRAPHY_LEVELS, levelBelow } from '@startup/constants/geography';
import { geographyService } from '@services/geographyService';

// A place cannot sit under itself or under anything it contains, so its own
// subtree is not offered as a parent. Everything else is, indented by depth so
// the menu reads as the tree it is picking from.
const parentOptions = (rows, record) =>
  rows
    .filter((row) => row.id !== record?.id && !(record?.id && row.path.startsWith(`${record.path} > `)))
    .map((row) => ({
      value: String(row.id),
      label: `${'   '.repeat(row.depth)}${row.name}`,
      searchKeys: [row.name, row.path]
    }));

const LEVEL_OPTIONS = GEOGRAPHY_LEVELS.map((level) => ({ value: level, label: level }));

const startingPlace = (initialData, defaults) => ({
  name: initialData?.name ?? '',
  code: initialData?.code ?? '',
  level: initialData?.level ?? defaults?.level ?? GEOGRAPHY_LEVELS[0],
  parent_id: String(initialData?.parent_id ?? defaults?.parent_id ?? ''),
  is_active: initialData?.is_active ?? true
});

const GeographyMasterForm = ({ isOpen, onClose, initialData, onSaved, rows = [], defaults }) => {
  const [place, setPlace] = useState(() => startingPlace(initialData, defaults));

  const patch = (change) => setPlace((current) => ({ ...current, ...change }));

  // Picking a parent renames the level to the one below it, which is right
  // almost every time and still editable when it is not.
  const onParentChange = (value) => {
    const parent = rows.find((row) => String(row.id) === String(value));
    patch({ parent_id: value ?? '', level: parent ? levelBelow(parent.level) : GEOGRAPHY_LEVELS[0] });
  };

  const submit = async () => {
    const payload = { ...place, parent_id: place.parent_id ? Number(place.parent_id) : null };
    const saved = initialData?.id
      ? await geographyService.update(initialData.id, payload)
      : await geographyService.create(payload);
    toast.success(saved.data?.message || `${place.name} saved`);
    onSaved?.();
    onClose();
  };

  const validate = () => {
    if (!place.name.trim()) return { message: 'A place needs a name', field: 'name' };
    return '';
  };

  useFormModal(submit, place, validate);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="space-y-4">
      <TextTypeField
        name="name"
        label="Name"
        required
        value={place.name}
        onChange={(e) => patch({ name: e.target.value })}
        placeholder="Maharashtra"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SearchableDropdown
          options={LEVEL_OPTIONS}
          value={place.level}
          onChange={(value) => patch({ level: value })}
          optionName="Level"
          allowOptionsOutsideSelectBox
          placeholder="Level"
        />
        <TextTypeField
          name="code"
          label="Code"
          value={place.code}
          onChange={(e) => patch({ code: e.target.value })}
          placeholder="MH"
          hint="What other systems call this place — an ISO code, a plant code."
        />
      </div>

      <div data-field="parent_id">
        <p className="mb-1 text-sm font-medium text-gray-700">Sits under</p>
        <SearchableDropdown
          options={parentOptions(rows, initialData)}
          value={place.parent_id}
          onChange={onParentChange}
          optionName="Place"
          placeholder="Nothing — this is a top level place"
          defaultOptionValue=""
        />
      </div>

      <CheckboxTypeField
        name="is_active"
        label="In use"
        checked={place.is_active}
        onChange={(e) => patch({ is_active: e.target.checked })}
      />
    </div>
  );
};

GeographyMasterForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  onSaved: PropTypes.func,
  /** Every place in the company, so the form can offer them as parents. */
  rows: PropTypes.array,
  /** Where a new place starts from — the node its "add child" button was on. */
  defaults: PropTypes.object
};

export { GeographyMasterForm };
