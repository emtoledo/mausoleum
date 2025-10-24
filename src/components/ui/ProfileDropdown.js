import React from 'react';

const ProfileDropdown = ({ 
  isOpen, 
  onClose, 
  onAccountSettings, 
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
        <div className="dropdown-item" onClick={onLogOut}>
          <span className="dropdown-text">Log Out</span>
        </div>
      </div>
    </>
  );
};

export default ProfileDropdown;
