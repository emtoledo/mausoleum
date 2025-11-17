import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const AccountSettingsView = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false });
  const [isDeleting, setIsDeleting] = useState(false);

  // Load user data
  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setName(user.user_metadata?.full_name || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const updates = {};
      
      // Update name if changed
      if (name && name !== user.user_metadata?.full_name) {
        updates.data = { full_name: name };
      }

      // Update password if provided
      if (password && password.length >= 6) {
        updates.password = password;
      }

      // Update email if changed
      if (email && email !== user.email) {
        updates.email = email;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.auth.updateUser(updates);
        
        if (error) {
          alert(`Error updating account: ${error.message}`);
        } else {
          alert('Account updated successfully');
          setPassword(''); // Clear password field after successful update
        }
      } else {
        alert('No changes to save');
      }
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Error updating account. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteConfirm({ isOpen: true });
  };

  const handleConfirmDelete = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Note: Supabase client SDK doesn't allow users to delete themselves
      // This requires admin privileges via the Admin API
      // SECURITY NOTE: In production, this should be done via a Supabase Edge Function
      // or serverless function to avoid exposing the service role key client-side
      
      const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;
      
      if (!serviceRoleKey) {
        // If service role key is not available, we can't delete the account
        // In this case, sign out and redirect (projects will be orphaned but user is logged out)
        console.warn('Service role key not available. Cannot delete account via API.');
        alert('Account deletion requires server-side setup. Signing you out. Please contact support to permanently delete your account.');
        await logout();
        navigate('/login', { replace: true });
        return;
      }

      // Call Supabase admin API to delete user
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/auth/v1/admin/users/${user.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete account: ${response.statusText}`);
      }

      // Sign out and redirect to login
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error deleting account:', error);
      alert(`Error deleting account: ${error.message}. Please contact support if this issue persists.`);
    } finally {
      setIsDeleting(false);
      setDeleteConfirm({ isOpen: false });
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ isOpen: false });
  };

  return (
    <div className="account-settings-container">
      <div className="account-settings-content">
        <div className="settings-sections">
          <div className="settings-header">
            <h1>Account Settings</h1>
            <p>Manage your account preferences and settings</p>
          </div>

          {/* Section 1: Profile Information */}
          <div className="settings-section">
            <h2>Profile Information</h2>
            <div className="settings-form">
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>New Password (leave blank to keep current)</label>
                <input 
                  type="password" 
                  placeholder="Enter new password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="form-actions">
                <Button 
                  variant="primary" 
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>

          {/* Section 2: Danger Zone */}
          <div className="settings-section danger-zone">
            <h2>Danger Zone</h2>
            <div className="danger-actions">
              <p className="danger-warning">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <Button 
                variant="danger" 
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className='button--primary alert'
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Account"
        message={`Are you sure you want to delete your account? This action cannot be undone. All your projects and data will be permanently deleted.`}
        confirmText="Yes, Delete Account"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
};

export default AccountSettingsView;
