import { BaseMaster } from '@startup/components/base_components/master';
import { MASTERS } from '@startup/constants/masters';
import { announcementService } from '@services/announcementService';
import { AnnouncementMasterForm } from './AnnouncementMasterForm';

const PERMISSION_KEYS = {
  read: 'read_announcement',
  create: 'create_announcement',
  update: 'update_announcement',
  delete: 'delete_announcement'
};

const loadAnnouncements = () => announcementService.list();
const deleteAnnouncement = (id) => announcementService.remove(id);

const AnnouncementMaster = () => (
  <BaseMaster
    masterName={MASTERS.ANNOUNCEMENT}
    title="Announcements"
    description="Tell everyone something once — a banner across the app, for the roles you choose, between the dates you set."
    addButtonText="Add Announcement"
    searchPlaceholder="Search announcements by title, message or audience..."
    auditHead="Announcement"
    permissionKeys={PERMISSION_KEYS}
    rowsKey="announcements"
    loadRows={loadAnnouncements}
    deleteRow={deleteAnnouncement}
    deleteConfirmText="Delete this announcement? It stops being shown to everyone at once."
    unauthorizedDeleteToast="You are not authorized to delete an announcement"
    fetchFailureToast="Failed to load announcements"
    FormComponent={AnnouncementMasterForm}
    formSuccessProp="onSaved"
    createLabel="Create Announcement"
    updateLabel="Update Announcement"
    modalMaxWidth="lg"
    initialSortKey="starts_at"
    initialSortDirection="desc"
    exportReport={{ title: 'Announcements', slug: 'announcements' }}
  />
);

export { AnnouncementMaster };
