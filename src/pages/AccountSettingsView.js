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
      <div className="app-header">
        <div className="header-left">
          <div className="menu-icon" onClick={() => navigate('/projects')}>
            <img src="/images/allprojects_icon.png" alt="All Projects" className="menu-icon-image" />
          </div>
          <div className="breadcrumb">
            <span className="breadcrumb-item">Account Settings</span>
          </div>
        </div>
        
        <div className="header-right">
          <button className="save-button" onClick={handleSave}>Save</button>
          <div className="more-options" onClick={handleMoreOptions}>
            <div className="more-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
          <div className="user-profile" onClick={handleProfileClick}>
            <div className="profile-avatar"></div>
          </div>
        </div>
      </div>

      <div className="account-settings-content">
        <div className="settings-header">
          <h1>Account Settings</h1>
          <p>Manage your account preferences and settings</p>
        </div>

        <div className="settings-sections">
          <div className="settings-section">
            <h2>Profile Information</h2>
            <div className="settings-form">
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="your@email.com" />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input type="text" placeholder="Your Name" />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2>Preferences</h2>
            <div className="settings-form">
              <div className="form-group">
                <label>
                  <input type="checkbox" />
                  Email notifications
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input type="checkbox" />
                  Auto-save projects
                </label>
              </div>
            </div>
          </div>

          <div className="settings-section">
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
  );
};

export default AccountSettingsView;
