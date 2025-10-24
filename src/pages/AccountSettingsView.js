import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

const AccountSettingsView = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/projects');
  };

  const handleSave = () => {
    console.log('Save clicked');
  };

  const handleShare = () => {
    console.log('Share clicked');
  };

  const handleMoreOptions = () => {
    console.log('More options clicked');
  };

  const handleProfileClick = () => {
    console.log('Profile clicked');
  };

  return (
    <div className="account-settings-container">
      <div className="account-settings-content">



          <div className="settings-sections">

          <div className="settings-header">
            <h1>Account Settings</h1>
            <p>Manage your account preferences and settings</p>
          </div>

            <h2>Profile Information</h2>
            <div className="settings-form">
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="your@email.com" />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input type="text" placeholder="Your Name" />
            
            <h2>Danger Zone</h2>
            <div className="danger-actions">
              <Button variant="danger" onClick={() => alert('Account deletion not implemented')}>
                Delete Account
              </Button>
            </div>
          </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default AccountSettingsView;
