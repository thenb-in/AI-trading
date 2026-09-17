import { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';

import { useFormModal } from '@startup/components/base_components/master';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { TextareaTypeField } from '@startup/components/base_components/fields/TextareaTypeField';
import { DateTimeTypeField } from '@startup/components/base_components/fields/DateTimeTypeField';
import { CheckboxTypeField } from '@startup/components/base_components/fields/CheckboxTypeField';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';
import { RoleSelector } from '@startup/components/admin/RoleSelector';
import { convertISOToDateTimeLocal, convertToISOString } from '@utils/dateTimeUtils';
import { ANNOUNCEMENT_SEVERITIES } from '@startup/constants/announcements';
import { announcementService } from '@services/announcementService';

const startingAnnouncement = (initialData) => ({
  title: initialData?.title ?? '',
  body: initialData?.body ?? '',
  severity: initialData?.severity ?? ANNOUNCEMENT_SEVERITIES[0].value,
  role_ids: (initialData?.role_ids ?? []).map(String),
  starts_at: convertISOToDateTimeLocal(initialData?.starts_at),
  ends_at: convertISOToDateTimeLocal(initialData?.ends_at),
  is_active: initialData?.is_active ?? true
});

const AnnouncementMasterForm = ({ isOpen, onClose, initialData, onSaved }) => {
  const [announcement, setAnnouncement] = useState(() => startingAnnouncement(initialData));

  const patch = (change) => setAnnouncement((current) => ({ ...current, ...change }));

  const submit = async () => {
    const payload = {
      ...announcement,
      role_ids: announcement.role_ids.map(Number),
      // The inputs speak local time and the server stores an instant, so the
      // window means the same thing wherever it was typed.
      starts_at: convertToISOString(announcement.starts_at),
      ends_at: convertToISOString(announcement.ends_at)
    };
    const saved = initialData?.id
      ? await announcementService.update(initialData.id, payload)
      : await announcementService.create(payload);
    toast.success(saved.data?.message || `${announcement.title} saved`);
    onSaved?.();
    onClose();
  };

  const validate = () => {
    if (!announcement.title.trim()) return { message: 'An announcement needs a title', field: 'title' };
    if (!announcement.body.trim()) return { message: 'Say what the announcement is about', field: 'body' };
    if (announcement.ends_at && announcement.starts_at && announcement.ends_at <= announcement.starts_at) {
      return { message: 'The announcement ends before it starts', field: 'ends_at' };
    }
    return '';
  };

  useFormModal(submit, announcement, validate);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="space-y-4">
      <TextTypeField
        name="title"
        label="Title"
        required
        value={announcement.title}
        onChange={(e) => patch({ title: e.target.value })}
        placeholder="Planned downtime on Saturday"
      />

      <TextareaTypeField
        name="body"
        label="Message"
        required
        rows={4}
        value={announcement.body}
        onChange={(e) => patch({ body: e.target.value })}
        placeholder="What is happening, when, and what the reader should do about it."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div data-field="severity">
          <p className="mb-1 text-sm font-medium text-gray-700">How loud</p>
          <SearchableDropdown
            options={ANNOUNCEMENT_SEVERITIES}
            value={announcement.severity}
            onChange={(value) => patch({ severity: value })}
            optionName="Severity"
            searchable={false}
          />
        </div>
        <div data-field="role_ids">
          <RoleSelector
            value={announcement.role_ids}
            onChange={(value) => patch({ role_ids: value })}
            multiple
            allowCreate={false}
            label="Who sees it"
            placeholder="Everyone in the company"
            className=""
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DateTimeTypeField
          name="starts_at"
          label="Shown from"
          value={announcement.starts_at}
          onChange={(e) => patch({ starts_at: e.target.value })}
          hint="Left empty, it starts the moment it is saved."
        />
        <DateTimeTypeField
          name="ends_at"
          label="Shown until"
          value={announcement.ends_at}
          onChange={(e) => patch({ ends_at: e.target.value })}
          hint="Left empty, it runs until someone stops it."
        />
      </div>

      <CheckboxTypeField
        name="is_active"
        label="Running"
        checked={announcement.is_active}
        onChange={(e) => patch({ is_active: e.target.checked })}
      />
    </div>
  );
};

AnnouncementMasterForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  onSaved: PropTypes.func
};

export { AnnouncementMasterForm };
