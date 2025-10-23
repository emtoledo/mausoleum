import React, { useState } from 'react';
import NewMemorialForm from './NewMemorialForm';
import AllProjectsView from './AllProjectsView';
import TemplateGridView from './TemplateGridView';
import AccountSettingsView from './AccountSettingsView';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showNewMemorialForm, setShowNewMemorialForm] = useState(false);
  const [showSelectionButtons, setShowSelectionButtons] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showTemplateGrid, setShowTemplateGrid] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  // Debug: Track state changes
  React.useEffect(() => {
    console.log('LoginForm - State changed:');
    console.log('  showAllProjects:', showAllProjects);
    console.log('  showAccountSettings:', showAccountSettings);
    console.log('  showTemplateGrid:', showTemplateGrid);
    console.log('  showNewMemorialForm:', showNewMemorialForm);
    console.log('  showSelectionButtons:', showSelectionButtons);
    console.log('  selectedProject:', selectedProject);
  }, [showAllProjects, showAccountSettings, showTemplateGrid, showNewMemorialForm, showSelectionButtons, selectedProject]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would typically make an actual API call
      console.log('Login attempt:', formData);
      
      // Set logged in state to show selection buttons
      setIsLoggedIn(true);
      setShowSelectionButtons(true);
      
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    alert('Forgot password functionality would be implemented here');
  };

  const handleCreateNew = () => {
    console.log('Create New Memorial clicked - navigating to MemorialDetailsForm');
    setShowSelectionButtons(false);
    setShowNewMemorialForm(true);
  };

  const handleCancelNewMemorial = () => {
    setShowNewMemorialForm(false);
    setShowSelectionButtons(true);
  };

  const handleNextNewMemorial = (project) => {
    console.log('Project completed successfully:', project);
    // The project flow continues through the form chain
    // MemorialDetailsForm → MemorialTypeForm → MemorialStyleForm → TemplateSelectionForm
    // We don't need to close the form here, let it continue
  };

  const handleOpenExisting = () => {
    console.log('LoginForm - Open existing memorial clicked');
    setShowSelectionButtons(false);
    setShowAllProjects(true);
  };

  const handleCreateNewProjectFromAllProjects = () => {
    setShowAllProjects(false);
    setShowNewMemorialForm(true);
  };

  const handleBackFromAllProjects = () => {
    setShowAllProjects(false);
    setShowSelectionButtons(true);
  };

  const handleProjectClickFromAllProjects = (project) => {
    console.log('Project selected from AllProjectsView:', project);
    console.log('LoginForm - Clearing other states and setting up Template Grid');
    setShowAllProjects(false);
    setShowAccountSettings(false);
    setSelectedProject(project);
    setShowTemplateGrid(true);
  };

  const handleBackFromTemplateGrid = () => {
    console.log('LoginForm - Back from Template Grid requested');
    console.log('LoginForm - Clearing other states and going to All Projects');
    setShowTemplateGrid(false);
    setShowAccountSettings(false);
    setSelectedProject(null);
    setShowAllProjects(true);
  };

  const handleAccountSettingsFromAllProjects = () => {
    setShowAllProjects(false);
    setShowAccountSettings(true);
  };

  const handleAllProjectsNavigation = () => {
    console.log('LoginForm - All Projects navigation requested');
    console.log('LoginForm - Current state before change:');
    console.log('  showAllProjects:', showAllProjects);
    console.log('  showAccountSettings:', showAccountSettings);
    console.log('  showTemplateGrid:', showTemplateGrid);
    console.log('LoginForm - Clearing other states and setting showAllProjects to true');
    setShowAccountSettings(false);
    setShowTemplateGrid(false);
    setShowAllProjects(true);
    console.log('LoginForm - State change should trigger re-render');
  };

  const handleAccountSettingsNavigation = () => {
    console.log('LoginForm - Account Settings navigation requested');
    console.log('LoginForm - Clearing other states and setting showAccountSettings to true');
    setShowAllProjects(false);
    setShowTemplateGrid(false);
    setShowAccountSettings(true);
  };

  const handleBackFromAccountSettings = () => {
    console.log('LoginForm - Back from Account Settings requested');
    console.log('LoginForm - Clearing other states and going to All Projects');
    setShowAccountSettings(false);
    setShowTemplateGrid(false);
    setShowAllProjects(true);
  };

  if (isLoggedIn) {
    console.log('LoginForm - Rendering logged-in view');
    console.log('LoginForm - Current state:');
    console.log('  showAccountSettings:', showAccountSettings);
    console.log('  showTemplateGrid:', showTemplateGrid);
    console.log('  showAllProjects:', showAllProjects);
    console.log('  showNewMemorialForm:', showNewMemorialForm);
    console.log('  showSelectionButtons:', showSelectionButtons);
    
    // Check if we're showing Account Settings
    if (showAccountSettings) {
      console.log('LoginForm - Rendering AccountSettingsView');
      return (
        <AccountSettingsView
          onBack={handleBackFromAccountSettings}
          onProjectClick={handleProjectClickFromAllProjects}
          onAllProjectsNavigation={handleAllProjectsNavigation}
          onAccountSettingsNavigation={handleAccountSettingsNavigation}
        />
      );
    }
    
    // Check if we're showing Template Grid
    if (showTemplateGrid && selectedProject) {
      console.log('LoginForm - Rendering TemplateGridView');
      return (
        <TemplateGridView
          project={selectedProject}
          selectedTemplateIds={selectedProject.selectedTemplates?.map(t => t.id) || []}
          onBack={handleBackFromTemplateGrid}
          onAllProjectsNavigation={handleAllProjectsNavigation}
          onAccountSettingsNavigation={handleAccountSettingsNavigation}
        />
      );
    }
    
    // Check if we're showing All Projects
    if (showAllProjects) {
      console.log('LoginForm - Rendering AllProjectsView');
      return (
        <AllProjectsView
          onBack={handleBackFromAllProjects}
          onCreateNewProject={handleCreateNewProjectFromAllProjects}
          onProjectClick={handleProjectClickFromAllProjects}
          onAllProjectsNavigation={handleAllProjectsNavigation}
          onAccountSettingsNavigation={handleAccountSettingsNavigation}
        />
      );
    }
    
    // Check if we're showing a canvas layout component
    if (showNewMemorialForm) {
      console.log('LoginForm - Rendering NewMemorialForm');
      // Render NewMemorialForm directly without login-container wrapper
      // This allows canvas layout components to take full control
      return (
        <NewMemorialForm 
          onCancel={handleCancelNewMemorial}
          onNext={handleNextNewMemorial}
        />
      );
    }
    
    // Show selection buttons after successful login
    if (showSelectionButtons) {
      console.log('LoginForm - Rendering selection buttons');
      return (
        <div className="modal-overlay"> 
          <div className="login-container">
            <div className="brand-title">VALHALLA MEMORIAL</div>
            
            <div className="selection-container">
              <button className="selection-button" onClick={handleCreateNew}>
                <div className="button-icon">
                  <img src="/images/new_icon.png" alt="Create new" className="icon-image" />
                </div>
                <div className="button-text">Create New Memorial</div>
              </button>
              
              <button className="selection-button" onClick={handleOpenExisting}>
                <div className="button-icon">
                  <img src="/images/existing_icon.png" alt="Open existing" className="icon-image" />
                </div>
                <div className="button-text">Open Existing Memorial</div>
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    console.log('LoginForm - No matching view found, this should not happen');
  }
    
    // Only use login-container for the login form
    return (
      <div className="modal-overlay"> 
        <div className="login-container">
          <div className="brand-title">VALHALLA MEMORIAL</div>
          
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email"
                className={errors.email ? 'error' : ''}
                required
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                className={errors.password ? 'error' : ''}
                required
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>
            
            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'LOGGING IN...' : 'LOGIN'}
            </button>
            
            <div className="forgot-password">
              <a href="#" className="forgot-link" onClick={handleForgotPassword}>
                Forgot your password?
              </a>
            </div>
          </form>
        </div>
      </div>
    );
};

export default LoginForm;
