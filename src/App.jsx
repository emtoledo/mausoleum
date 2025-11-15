import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectFlowProvider, useProjectFlow } from './context/ProjectFlowContext';
import BaseScreenLayout from './components/layout/BaseScreenLayout';
import IntroFlowLayout from './components/layout/IntroFlowLayout';
import ProjectCreationWizard from './components/flows/ProjectCreationWizard';
import Button from './components/ui/Button';

// Pages
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import AllProjectsView from './pages/AllProjectsView';
import EditModeView from './pages/EditModeView';
import AccountSettingsView from './pages/AccountSettingsView';
import NotFoundPage from './pages/NotFoundPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Show nothing while checking auth
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Selection Page Component (shows after login)
const SelectionPage = () => {
  const navigate = useNavigate();
  const { openWizard } = useProjectFlow();

  const handleCreateNew = () => {
    openWizard();
  };

  const handleOpenExisting = () => {
    navigate('/projects');
  };

  return (
    <IntroFlowLayout>
      <div className="login-container">
        <div className="brand-title">VALHALLA MEMORIAL</div>

        <div className="selection-container">
          <Button 
            variant="primary"
            onClick={handleCreateNew}
            className="selection-button"
          >
            <div className="button-icon">
              <img src="/images/new_icon.png" alt="Create new" className="icon-image" />
            </div>
            <div className="button-text">Create New Memorial</div>
          </Button>

          <Button 
            variant="secondary"
            onClick={handleOpenExisting}
            className="selection-button"
          >
            <div className="button-icon">
              <img src="/images/existing_icon.png" alt="Open existing" className="icon-image" />
            </div>
            <div className="button-text">Open Existing Memorial</div>
          </Button>
        </div>
      </div>
    </IntroFlowLayout>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <ProjectFlowProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Navigate to="/selection" replace />
                </ProtectedRoute>
              } />
              
              <Route path="/selection" element={
                <ProtectedRoute>
                  <SelectionPage />
                </ProtectedRoute>
              } />
              
              <Route path="/projects" element={
                <ProtectedRoute>
                  <BaseScreenLayout>
                    <AllProjectsView />
                  </BaseScreenLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/projects/:projectId/edit" element={
                <ProtectedRoute>
                  <BaseScreenLayout>
                    <EditModeView />
                  </BaseScreenLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/account-settings" element={
                <ProtectedRoute>
                  <BaseScreenLayout>
                    <AccountSettingsView />
                  </BaseScreenLayout>
                </ProtectedRoute>
              } />
              
              {/* 404 Route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            
            {/* Global Modal Components */}
            <ProjectCreationWizard />
          </div>
        </Router>
      </ProjectFlowProvider>
    </AuthProvider>
  );
};

export default App;
