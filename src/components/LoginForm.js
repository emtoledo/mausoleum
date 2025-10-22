import React, { useState } from 'react';
import NewMemorialForm from './NewMemorialForm';
import NavigationManager from './NavigationManager';
import { useNavigation } from '../contexts/NavigationContext';

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
  const { navigateToAllProjects } = useNavigation();

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
    console.log('Open existing memorial clicked');
    setShowSelectionButtons(false);
    navigateToAllProjects();
  };

  const handleCreateNewProjectFromAllProjects = () => {
    setShowNewMemorialForm(true);
  };

  const handleProjectClickFromAllProjects = (project) => {
    console.log('Project selected from AllProjectsView:', project);
    // Navigation will be handled by NavigationManager
  };

  if (isLoggedIn) {
    // Show selection buttons after successful login
    if (showSelectionButtons) {
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
    
    // Use NavigationManager to handle all navigation
    return (
      <NavigationManager
        onBack={() => {
          // Handle back navigation - could go to login or previous view
          console.log('Back navigation requested');
        }}
        onCreateNewProject={handleCreateNewProjectFromAllProjects}
        onProjectClick={handleProjectClickFromAllProjects}
      />
    );
  }
    
    // Check if we're showing a canvas layout component
    if (showNewMemorialForm) {
      // Render NewMemorialForm directly without login-container wrapper
      // This allows canvas layout components to take full control
      return (
        <NewMemorialForm 
          onCancel={handleCancelNewMemorial}
          onNext={handleNextNewMemorial}
        />
      );
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
