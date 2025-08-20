import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Users, MessageSquare, Trash2, Search, AlertTriangle, CheckSquare, Square, Menu } from 'lucide-react';
import ApiService from '../../services/ApiService';
import { CleaningServices } from '@mui/icons-material';
import { useDataContext } from '../../context/AuthContext';
export default function GroupManagement() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [deleteType, setDeleteType] = useState(''); // 'group' or 'messages'
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState({ category: '', action: '' }); // category: 'total'|'active'|'inactive', action: 'group'|'messages'
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [bulkActionDialog, setBulkActionDialog] = useState({
    show: false,
    selectedRooms: [],
    action: '' // 'group' or 'messages'
  });
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const { setHamburgerMenu, hamburgerMenu } = useDataContext();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getRoomsWithAdminDetails();
      setRooms(response.data);
      setError('');
    } catch (error) {
      setError('Failed to fetch rooms');
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (room, type) => {
    setSelectedRoom(room);
    setDeleteType(type);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (deleteType === 'group') {
        // First delete all messages in the room
        await ApiService.deleteRoomMessages(selectedRoom.id);
        // Then delete the room
        await ApiService.deleteRoom(selectedRoom.id);
        toast.success('Group and its messages deleted successfully');
      } else if(deleteType === 'unsavedMessages'){
        console.log("unsavedMessages")
        await ApiService.deleteRoomMessages(selectedRoom.id);
        toast.success('Messages deleted successfully');
      } else{
        await ApiService.deleteRoomMessages(selectedRoom.id,"true")
      }
      setDeleteDialogOpen(false);
      fetchRooms();
    } catch (error) {
      toast.error(`Failed to delete ${deleteType}`);
      console.error('Error deleting:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No messages';
    return new Date(dateString).toLocaleString();
  };

  const isMessageOlderThan30Days = (dateString) => {
    if (!dateString) return true;
    const messageDate = new Date(dateString);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return messageDate < thirtyDaysAgo;
  };

  // Filter rooms by search query
  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.adminName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalRooms = rooms.length;
  const roomsWithMessages = rooms.filter(room => room.lastMessage).length;
  const activeRooms = rooms.filter(room => room.lastMessageTime && !isMessageOlderThan30Days(room.lastMessageTime)).length;
  const inactiveRooms = totalRooms - activeRooms;

  // Add new function for bulk delete
  const handleBulkDelete = async () => {
    console.log("bulkDeleteType",bulkDeleteType)
    try {
      const { category, action } = bulkDeleteType;
      let roomsToProcess = [];

      switch (category) {
        case 'total':
          roomsToProcess = rooms;
          break;
        case 'active':
          roomsToProcess = rooms.filter(room => room.lastMessageTime && !isMessageOlderThan30Days(room.lastMessageTime));
          break;
        case 'inactive':
          roomsToProcess = rooms.filter(room => !room.lastMessageTime || isMessageOlderThan30Days(room.lastMessageTime));
          break;
      }

      if (action === 'group') {
        // First delete all messages, then delete rooms
        for (const room of roomsToProcess) {
          await ApiService.deleteRoomMessages(room.id);
          await ApiService.deleteRoom(room.id);
        }
        toast.success(`Successfully deleted all ${category} groups and their messages`);
      } else if(action === 'messages'){
        // Delete only messages
        for (const room of roomsToProcess) {
          await ApiService.deleteRoomMessages(room.id,"true");
        }
        toast.success(`Successfully deleted all messages in ${category} groups`);
      } else{
        for (const room of roomsToProcess) {
          await ApiService.deleteRoomMessages(room.id);
        }
      }

      setBulkDeleteDialogOpen(false);
      fetchRooms();
    } catch (error) {
      toast.error(`Failed to delete ${bulkDeleteType.action} from ${bulkDeleteType.category} groups`);
      console.error('Error in bulk delete:', error);
    }
  };

  // Bulk action functions for selected rooms
  const handleBulkAction = async () => {
    try {
      const { selectedRooms, action } = bulkActionDialog;
      
      if (action === 'group') {
        // Delete groups and their messages
        for (const roomId of selectedRooms) {
          await ApiService.deleteRoomMessages(roomId);
          await ApiService.deleteRoom(roomId);
        }
        toast.success(`Successfully deleted ${selectedRooms.length} groups and their messages`);
      } else if(action === 'messages'){
        // Delete only messages
        for (const roomId of selectedRooms) {
          await ApiService.deleteRoomMessages(roomId,"true");
        }
        toast.success(`Successfully deleted messages from ${selectedRooms.length} groups`);
      } else{
        for (const roomId of selectedRooms) {
          await ApiService.deleteRoomMessages(roomId);
        }
      }

      setBulkActionDialog({ show: false, selectedRooms: [], action: '' });
      setBulkDeleteMode(false);
      setSelectedRooms([]);
      fetchRooms();
    } catch (error) {
      toast.error(`Failed to perform bulk ${bulkActionDialog.action} operation`);
      console.error('Error in bulk action:', error);
    }
  };

  // Toggle room selection
  const toggleRoomSelection = (roomId) => {
    setSelectedRooms(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  // Select all rooms from specific table
  const selectAllRoomsFromTable = (tableRooms) => {
    const tableRoomIds = tableRooms.map(room => room.id);
    setSelectedRooms(prev => [...new Set([...prev, ...tableRoomIds])]);
  };

  // Deselect all rooms from specific table
  const deselectAllRoomsFromTable = (tableRooms) => {
    const tableRoomIds = tableRooms.map(room => room.id);
    setSelectedRooms(prev => prev.filter(id => !tableRoomIds.includes(id)));
  };

  // Show bulk action confirmation
  const showBulkActionConfirmation = (action) => {
    if (selectedRooms.length === 0) return;
    setBulkActionDialog({ show: true, selectedRooms, action });
  };

  // Table Row Status Badge
  const StatusBadge = ({ isInactive }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
      isInactive
        ? 'bg-orange-50 text-orange-600 border border-orange-100'
        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isInactive ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
      {isInactive ? 'Inactive' : 'Active'}
    </span>
  );

  // Bulk Action Confirmation Dialog
  const BulkActionConfirmationDialog = () => {
    if (!bulkActionDialog.show) return null;

    const { selectedRooms, action } = bulkActionDialog;
    const totalSelected = selectedRooms.length;
    const actionText = action === 'group' ? 'groups and their messages' : 'messages from groups';
    const message = `Are you sure you want to delete ${actionText} for ${totalSelected} selected group(s)? This action cannot be undone.`;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
          <div className="flex items-center mb-4">
            <div className={`rounded-full p-3 ${action === 'group' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
              {action === 'group' ? <Trash2 size={24} /> : <MessageSquare size={24} />}
            </div>
            <h3 className="text-xl font-semibold ml-3">
              Bulk {action === 'group' ? 'Delete Groups' : 'Delete Messages'}
            </h3>
          </div>
          
          <p className="text-gray-600 mb-6">{message}</p>
          
          <div className="flex justify-end space-x-3">
            <button 
              onClick={() => setBulkActionDialog({ show: false, selectedRooms: [], action: '' })}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleBulkAction}
              className={`px-4 py-2 text-white rounded-md transition-colors ${
                action === 'group' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              Delete Selected
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Table for Groups
  const GroupTable = ({ groups }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800">Groups</h3>
        
        {bulkDeleteMode && groups.length > 0 && (
          <div className="flex items-center space-x-2">
            {selectedRooms.length > 0 && (
              <>
                <span className="text-gray-400">|</span>
                <button
                  onClick={() => showBulkActionConfirmation('group')}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Delete Groups ({selectedRooms.length})
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={() => showBulkActionConfirmation('messages')}
                  className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                >
                  Delete All Messages ({selectedRooms.length})
                </button>
                <button
                  onClick={() => showBulkActionConfirmation('unsavedMessages')}
                  className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                >
                  Delete Unsaved Messages ({selectedRooms.length})
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      <table className="min-w-full font-sans text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {bulkDeleteMode && (
              <th className="px-4 py-2 text-center">
                <input
                  type="checkbox"
                  checked={groups.every(room => selectedRooms.includes(room.id)) && groups.length > 0}
                  onChange={() => {
                    const allTableRoomsSelected = groups.every(room => selectedRooms.includes(room.id));
                    if (allTableRoomsSelected) {
                      deselectAllRoomsFromTable(groups);
                    } else {
                      selectAllRoomsFromTable(groups);
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
            )}
            <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Group Name</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Admin</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Participants</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Last Message</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Last Message Time</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-2 text-right font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {groups.map((room) => {
            const isInactive = room.lastMessageTime && isMessageOlderThan30Days(room.lastMessageTime);
            return (
              <tr key={room.id} className="hover:bg-blue-50 transition-colors">
                {bulkDeleteMode && (
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedRooms.includes(room.id)}
                      onChange={() => toggleRoomSelection(room.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                )}
                <td className="px-4 py-2 whitespace-nowrap text-gray-900 font-medium">{room.name}</td>
                <td className="px-4 py-2 whitespace-nowrap text-gray-700">{room.adminName}</td>
                <td className="px-4 py-2 whitespace-nowrap text-gray-700">{room.participants.length}</td>
                <td className="px-4 py-2 whitespace-nowrap text-gray-700 max-w-xs truncate">{room.lastMessage || 'No messages yet'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-gray-500">{formatDate(room.lastMessageTime)}</td>
                <td className="px-4 py-2 whitespace-nowrap"><StatusBadge isInactive={isInactive} /></td>
                <td className="px-4 py-2 whitespace-nowrap text-right">
                  {!bulkDeleteMode && (
                    <>
                      <button
                        onClick={() => handleDeleteClick(room, 'group')}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-[11px] font-medium rounded text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-1 focus:ring-red-200 transition mr-1"
                      >
                        <Trash2 size={12} className="mr-1" />
                        Delete Group
                      </button>
                      <button
                        onClick={() => handleDeleteClick(room, 'unsavedMessages')}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-[11px] font-medium rounded text-orange-600 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-1 focus:ring-orange-200 transition"
                      >
                        <MessageSquare size={12} className="mr-1" />
                        Delete Unsaved Msg
                      </button>
                      <button
                        onClick={() => handleDeleteClick(room, 'messages')}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-[11px] font-medium rounded text-orange-600 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-1 focus:ring-orange-200 transition"
                      >
                        <MessageSquare size={12} className="mr-1" />
                        Delete All Msg
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Confirmation Dialog
  const ConfirmationDialog = () => {
    if (!deleteDialogOpen) return null;
    
    const isGroup = deleteType === 'group';
    const title = isGroup ? 'Delete Group' : 'Delete Messages';
    const message = isGroup 
      ? `Are you sure you want to delete the group "${selectedRoom.name}"? This action cannot be undone.` 
      : `Are you sure you want to delete all messages in "${selectedRoom.name}"?`;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
          <div className="flex items-center mb-4">
            <div className={`rounded-full p-3 ${isGroup ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
              {isGroup ? <Trash2 size={24} /> : <MessageSquare size={24} />}
            </div>
            <h3 className="text-xl font-semibold ml-3">{title}</h3>
          </div>
          
          <p className="text-gray-600 mb-6">{message}</p>
          
          <div className="flex justify-end space-x-3">
            <button 
              onClick={() => setDeleteDialogOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleDeleteConfirm}
              className={`px-4 py-2 text-white rounded-md transition-colors ${
                isGroup ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filtered groups - ensure mutual exclusivity
  const activeGroups = filteredRooms.filter(room => {
    // Active: has last message time AND message is not older than 30 days
    const isActive = room.lastMessageTime && !isMessageOlderThan30Days(room.lastMessageTime);
    console.log(`Room ${room.name}: lastMessageTime=${room.lastMessageTime}, isOlderThan30Days=${isMessageOlderThan30Days(room.lastMessageTime)}, isActive=${isActive}`);
    return isActive;
  });
  
  const inactiveGroups = filteredRooms.filter(room => {
    // Inactive: no last message time OR message is older than 30 days
    const isInactive = !room.lastMessageTime || isMessageOlderThan30Days(room.lastMessageTime);
    console.log(`Room ${room.name}: lastMessageTime=${room.lastMessageTime}, isOlderThan30Days=${isMessageOlderThan30Days(room.lastMessageTime)}, isInactive=${isInactive}`);
    return isInactive;
  });

  // Ensure no overlap between active and inactive groups
  const activeGroupIds = new Set(activeGroups.map(room => room.id));
  const finalInactiveGroups = inactiveGroups.filter(room => !activeGroupIds.has(room.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <ConfirmationDialog />
      <BulkActionConfirmationDialog />
      
      {/* Add Bulk Delete Dialog */}
      {bulkDeleteDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className={`rounded-full p-3 ${bulkDeleteType.action === 'group' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                {bulkDeleteType.action === 'group' ? <Trash2 size={24} /> : <MessageSquare size={24} />}
              </div>
              <h3 className="text-xl font-semibold ml-3">
                Delete All {bulkDeleteType.action === 'group' ? 'Groups' : 'Messages'} - {bulkDeleteType.category}
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete all {bulkDeleteType.action === 'group' ? 'groups' : 'messages'} in the {bulkDeleteType.category} category? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setBulkDeleteDialogOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkDelete}
                className={`px-4 py-2 text-white rounded-md transition-colors ${
                  bulkDeleteType.action === 'group' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-800 flex items-center" onClick={() => setHamburgerMenu(!hamburgerMenu)}>
            {isMobileView ? <Menu className="mr-3 text-black-600 text-bold" /> : <Users className="mr-3 text-blue-600" />}
            Group Management
          </h2>
          
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 text-sm"
              />
            </div>
            
            <button
              onClick={() => setBulkDeleteMode(!bulkDeleteMode)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                bulkDeleteMode 
                  ? 'bg-red-100 text-red-700 border border-red-200' 
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {bulkDeleteMode ? 'Cancel' : 'Bulk Delete'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg flex items-start">
            <AlertTriangle size={20} className="mr-3 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-blue-500 to-blue-700 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Total Groups</h3>
                <Users size={24} />
              </div>
              <p className="text-3xl font-bold mt-2">{totalRooms}</p>
            </div>
            <div className="px-6 py-4 bg-white">
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => {
                    setBulkDeleteType({ category: 'total', action: 'group' });
                    setBulkDeleteDialogOpen(true);
                  }}
                  className="w-full flex items-center justify-center px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={18} className="mr-2" />
                  Delete All Groups
                </button>
                <button
                  onClick={() => {
                    setBulkDeleteType({ category: 'total', action: 'messages' });
                    setBulkDeleteDialogOpen(true);
                  }}
                  className="w-full flex items-center justify-center px-4 py-2 bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 transition-colors"
                >
                  <MessageSquare size={18} className="mr-2" />
                  Delete All Messages
                </button>
                <button
                  onClick={() => {
                    setBulkDeleteType({ category: 'total', action: 'unsavedMessages' });
                    setBulkDeleteDialogOpen(true);
                  }}
                  className="w-full flex items-center justify-center px-4 py-2 bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 transition-colors"
                >
                  <MessageSquare size={18} className="mr-2" />
                  Delete Unsaved Messages
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-green-500 to-green-700 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Active Groups</h3>
                <MessageSquare size={24} />
              </div>
              <p className="text-3xl font-bold mt-2">{activeRooms}</p>
            </div>
            <div className="px-6 py-4 bg-white">
              <p className="text-sm text-gray-500">
                {totalRooms > 0 
                  ? `${Math.round((activeRooms / totalRooms) * 100)}% of total groups` 
                  : 'No groups found'}
              </p>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => {
                    setBulkDeleteType({ category: 'active', action: 'group' });
                    setBulkDeleteDialogOpen(true);
                  }}
                  className="w-full flex items-center justify-center px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={18} className="mr-2" />
                  Delete Active Groups
                </button>
                <button
                  onClick={() => {
                    setBulkDeleteType({ category: 'active', action: 'messages' });
                    setBulkDeleteDialogOpen(true);
                  }}
                  className="w-full flex items-center justify-center px-4 py-2 bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 transition-colors"
                >
                  <MessageSquare size={18} className="mr-2" />
                  Delete Active Messages
                </button>
                <button
                  onClick={() => {
                    setBulkDeleteType({ category: 'total', action: 'unsavedMessages' });
                    setBulkDeleteDialogOpen(true);
                  }}
                  className="w-full flex items-center justify-center px-4 py-2 bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 transition-colors"
                >
                  <MessageSquare size={18} className="mr-2" />
                  Delete Unsaved Messages
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-orange-500 to-orange-700 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Inactive Groups</h3>
                <MessageSquare size={24} />
              </div>
              <p className="text-3xl font-bold mt-2">{inactiveRooms}</p>
            </div>
            <div className="px-6 py-4 bg-white">
              <p className="text-sm text-gray-500">
                {totalRooms > 0 
                  ? `${Math.round((inactiveRooms / totalRooms) * 100)}% of total groups` 
                  : 'No groups found'}
              </p>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => {
                    setBulkDeleteType({ category: 'inactive', action: 'group' });
                    setBulkDeleteDialogOpen(true);
                  }}
                  className="w-full flex items-center justify-center px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={18} className="mr-2" />
                  Delete Inactive Groups
                </button>
                <button
                  onClick={() => {
                    setBulkDeleteType({ category: 'inactive', action: 'messages' });
                    setBulkDeleteDialogOpen(true);
                  }}
                  className="w-full flex items-center justify-center px-4 py-2 bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 transition-colors"
                >
                  <MessageSquare size={18} className="mr-2" />
                  Delete Inactive Messages
                </button>
                <button
                  onClick={() => {
                    setBulkDeleteType({ category: 'total', action: 'unsavedMessages' });
                    setBulkDeleteDialogOpen(true);
                  }}
                  className="w-full flex items-center justify-center px-4 py-2 bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 transition-colors"
                >
                  <MessageSquare size={18} className="mr-2" />
                  Delete Unsaved Messages
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Groups Table */}
        {filteredRooms.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Users size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500">No groups found.</p>
          </div>
        ) : (
          <>
            {/* Active Groups Table */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center font-sans">
                <div className="w-1.5 h-5 bg-emerald-500 rounded-full mr-2"></div>
                Active Groups
              </h3>
              <GroupTable groups={activeGroups} />
            </div>
            {/* Inactive Groups Table */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center font-sans">
                <div className="w-1.5 h-5 bg-orange-500 rounded-full mr-2"></div>
                Inactive Groups
              </h3>
              <GroupTable groups={finalInactiveGroups} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
