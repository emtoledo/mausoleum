import React, { useState, useEffect } from 'react';
import userService from '../../services/userService';
import locationService from '../../services/locationService';
import './Admin.css';

/**
 * UsersManagement component for Master Admin Panel
 * Allows viewing all users and managing their roles/locations
 */
const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersResult, locationsResult] = await Promise.all([
        userService.getAllUsers(),
        locationService.getAllLocations()
      ]);

      if (usersResult.success) {
        setUsers(usersResult.data || []);
      } else {
        setError(usersResult.error || 'Failed to load users');
      }

      if (locationsResult.success) {
        setLocations(locationsResult.data || []);
      }
    } catch (err) {
      setError('Error loading data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser({ ...user });
    setSuccessMessage('');
  };

  const handleCloseEdit = () => {
    setSelectedUser(null);
    setSuccessMessage('');
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    setSaving(true);
    setError(null);
    try {
      // Update user account (role and location)
      const result = await userService.updateUserAccount(selectedUser.id, {
        role: selectedUser.role,
        location_id: selectedUser.location_id || null
      });

      if (result.success) {
        // Handle master admin status separately
        const wasMasterAdmin = users.find(u => u.id === selectedUser.id)?.is_master_admin;
        const shouldBeMasterAdmin = selectedUser.role === 'master_admin';

        if (shouldBeMasterAdmin && !wasMasterAdmin) {
          // Add as master admin
          const maResult = await userService.addMasterAdmin(
            selectedUser.id,
            selectedUser.email,
            selectedUser.full_name
          );
          if (!maResult.success) {
            throw new Error(maResult.error);
          }
        } else if (!shouldBeMasterAdmin && wasMasterAdmin) {
          // Remove from master admins
          const maResult = await userService.removeMasterAdmin(selectedUser.id);
          if (!maResult.success) {
            throw new Error(maResult.error);
          }
        }

        setSuccessMessage('User updated successfully!');
        await loadData();
        
        // Keep the edit form open with updated data
        const updatedUsers = await userService.getAllUsers();
        if (updatedUsers.success) {
          const updatedUser = updatedUsers.data.find(u => u.id === selectedUser.id);
          if (updatedUser) {
            setSelectedUser(updatedUser);
          }
        }
      } else {
        setError(result.error || 'Failed to update user');
      }
    } catch (err) {
      setError(err.message || 'Error saving user');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = (role) => {
    setSelectedUser(prev => ({
      ...prev,
      role: role
    }));
  };

  const handleLocationChange = (locationId) => {
    setSelectedUser(prev => ({
      ...prev,
      location_id: locationId === '' ? null : locationId
    }));
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    if (filterLocation !== 'all' && user.location_id !== filterLocation) {
      if (filterLocation === 'none' && user.location_id !== null) return false;
      if (filterLocation !== 'none' && user.location_id !== filterLocation) return false;
    }
    if (filterRole !== 'all') {
      if (filterRole === 'master_admin' && !user.is_master_admin) return false;
      if (filterRole !== 'master_admin' && user.role !== filterRole) return false;
    }
    return true;
  });

  const getRoleBadgeClass = (user) => {
    if (user.is_master_admin) return 'role-badge master-admin';
    if (user.role === 'admin') return 'role-badge location-admin';
    if (user.role === 'project_manager') return 'role-badge project-manager';
    return 'role-badge sales';
  };

  const getRoleDisplay = (user) => {
    if (user.is_master_admin) return 'Master Admin';
    if (user.role === 'admin') return 'Location Admin';
    if (user.role === 'project_manager') return 'Project Manager';
    return 'Sales';
  };

  if (loading) {
    return <div className="admin-loading">Loading users...</div>;
  }

  return (
    <div className="admin-management users-management">
      <div className="admin-page-header">
        <h2>Users</h2>
        <div className="admin-actions">
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="admin-select"
          >
            <option value="all">All Locations</option>
            <option value="none">No Location</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="admin-select"
          >
            <option value="all">All Roles</option>
            <option value="master_admin">Master Admins</option>
            <option value="admin">Location Admins</option>
            <option value="project_manager">Project Managers</option>
            <option value="sales">Sales</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="admin-error" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div className="admin-management-content">
        <div className="admin-list">
          <table className="admin-table users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Location</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className={`user-row ${selectedUser?.id === user.id ? 'selected' : ''}`}
                  >
                    <td className="user-name">
                      <strong>{user.full_name || 'No Name'}</strong>
                    </td>
                    <td className="user-email">{user.email}</td>
                    <td className="user-location">
                      {user.is_master_admin ? (
                        <span style={{ color: '#667eea', fontWeight: '500' }}>Global</span>
                      ) : user.location?.name || (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>No location</span>
                      )}
                    </td>
                    <td>
                      <span className={getRoleBadgeClass(user)}>
                        {getRoleDisplay(user)}
                      </span>
                    </td>
                    <td className="user-date">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedUser && (
          <div className="admin-form-panel">
            <div className="admin-edit-form">
              <div className="form-header">
                <h3>Edit User</h3>
                <button className="close-btn" onClick={handleCloseEdit}>×</button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }}>
                {successMessage && (
                  <div className="form-success" style={{ 
                    background: '#d4edda', 
                    color: '#155724', 
                    padding: '12px 16px', 
                    borderRadius: '4px', 
                    marginBottom: '16px' 
                  }}>
                    {successMessage}
                  </div>
                )}

                <div className="form-section">
           
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={selectedUser.full_name || ''}
                      disabled
                      style={{ backgroundColor: '#f5f5f5' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={selectedUser.email || ''}
                      disabled
                      style={{ backgroundColor: '#f5f5f5' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>User ID</label>
                    <input
                      type="text"
                      value={selectedUser.id}
                      disabled
                      style={{ backgroundColor: '#f5f5f5', fontFamily: 'monospace', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div className="form-section">


                  <div className="form-group">
                    <label>Role</label>
                    <select
                      value={selectedUser.is_master_admin ? 'master_admin' : selectedUser.role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="form-select"
                    >
                      <option value="sales">Sales</option>
                      <option value="project_manager">Project Manager</option>
                      <option value="admin">Location Admin</option>
                      <option value="master_admin">Master Admin</option>
                    </select>
                    <span className="form-help">
                      {selectedUser.role === 'master_admin' || selectedUser.is_master_admin
                        ? 'Master admins have full access to all locations and the master admin panel.'
                        : selectedUser.role === 'admin'
                        ? 'Location admins can manage products, artwork, and templates for their assigned location.'
                        : selectedUser.role === 'project_manager'
                        ? 'Project managers can create and manage projects in their location.'
                        : 'Sales users can create and manage their own projects.'}
                    </span>
                  </div>

                  {selectedUser.role !== 'master_admin' && !selectedUser.is_master_admin && (
                    <div className="form-group">
                      <label>Assigned Location</label>
                      <select
                        value={selectedUser.location_id || ''}
                        onChange={(e) => handleLocationChange(e.target.value)}
                        className="form-select"
                      >
                        <option value="">No Location</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="admin-btn secondary"
                    onClick={handleCloseEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersManagement;
