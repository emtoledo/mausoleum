import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProjectFlow } from '../../context/ProjectFlowContext';

const GlobalNavigation = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { openWizard } = useProjectFlow();

  const handleCreateNewProject = () => {
    console.log('GlobalNavigation - Create New Project clicked');
    openWizard();
  };

  const handleViewAllProjects = () => {
    console.log('GlobalNavigation - View All Projects clicked');
    navigate('/projects');
  };

  const handleAccountSettings = () => {
    console.log('GlobalNavigation - Account Settings clicked');
    navigate('/account-settings');
  };

  const handleLogOut = () => {
    console.log('GlobalNavigation - Log Out clicked');
    navigate('/login');
  };

  // Only show navigation for authenticated users
  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="global-navigation">
      <div className="nav-container">
        <div className="nav-left">
          <button 
            className="nav-button nav-button--primary" 
            onClick={handleCreateNewProject}
          >
            Create New Memorial
          </button>
        </div>
        
        <div className="nav-right">
          <button 
            className="nav-button nav-button--secondary" 
            onClick={handleViewAllProjects}
          >
            All Projects
          </button>
          <button 
            className="nav-button nav-button--secondary" 
            onClick={handleAccountSettings}
          >
            Account Settings
          </button>
          <button 
            className="nav-button nav-button--danger" 
            onClick={handleLogOut}
          >
            Log Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default GlobalNavigation;
