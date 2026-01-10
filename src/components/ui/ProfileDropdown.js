import React from 'react';

const ProfileDropdown = ({ 
  isOpen, 
  onClose, 
  onAccountSettings,
  onAdminTools,
  showAdminTools = false,
  onLogOut 
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="dropdown-backdrop" onClick={onClose}></div>
      <div className="profile-dropdown">
        <div className="dropdown-item" onClick={onAccountSettings}>
          <span className="dropdown-text">Account Settings</span>
        </div>
        {showAdminTools && (
          <div className="dropdown-item" onClick={onAdminTools}>
            <span className="dropdown-text">Admin Tools</span>
          </div>
        )}
        <div className="dropdown-item" onClick={onLogOut}>
          <span className="dropdown-text">Log Out</span>
        </div>
      </div>
    </>
  );
};

export default ProfileDropdown;
