import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { ProjectFlowProvider, useProjectFlow } from './context/ProjectFlowContext';
import LocationRoute from './components/routing/LocationRoute';
import { buildLocationPath } from './utils/navigation';
import BaseScreenLayout from './components/layout/BaseScreenLayout';
import IntroFlowLayout from './components/layout/IntroFlowLayout';
import ProjectCreationWizard from './components/flows/ProjectCreationWizard';
import Button from './components/ui/Button';

// Pages
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import AllProjectsView from './pages/AllProjectsView';
import EditModeView from './pages/EditModeView';
import ApprovalProofView from './pages/ApprovalProofView';
import ApprovedView from './pages/ApprovedView';
import AccountSettingsView from './pages/AccountSettingsView';
import MasterAdminPanel from './pages/MasterAdminPanel';
import NotFoundPage from './pages/NotFoundPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const { locationSlug } = useParams();
  
  // Show nothing while checking auth
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // Redirect to location-aware login if not authenticated
  const loginPath = locationSlug ? `/${locationSlug}/login` : '/login';
  return isAuthenticated ? children : <Navigate to={loginPath} replace />;
};

// Selection Page Component (shows after login)
const SelectionPage = () => {
  const navigate = useNavigate();
  const { locationSlug } = useParams();
  const { openWizard } = useProjectFlow();

  const handleCreateNew = () => {
    openWizard();
  };

  const handleOpenExisting = () => {
    const projectsPath = buildLocationPath('/projects', locationSlug);
    navigate(projectsPath);
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
          <LocationProvider>
            <div className="App">
              <Routes>
              {/* Master Admin Routes (no location slug) */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <MasterAdminPanel />
                </ProtectedRoute>
              } />
              
              {/* Location-based Routes */}
              <Route path="/:locationSlug/login" element={
                <LocationRoute>
                  <LoginPage />
                </LocationRoute>
              } />
              
              <Route path="/:locationSlug/signup" element={
                <LocationRoute>
                  <SignUpPage />
                </LocationRoute>
              } />
              
              <Route path="/:locationSlug/auth/callback" element={
                <LocationRoute>
                  <AuthCallbackPage />
                </LocationRoute>
              } />
              
              <Route path="/:locationSlug" element={
                <ProtectedRoute>
                  <LocationRoute>
                    <Navigate to="selection" replace />
                  </LocationRoute>
                </ProtectedRoute>
              } />
              
              <Route path="/:locationSlug/selection" element={
                <ProtectedRoute>
                  <LocationRoute>
                    <SelectionPage />
                  </LocationRoute>
                </ProtectedRoute>
              } />
              
              <Route path="/:locationSlug/projects" element={
                <ProtectedRoute>
                  <LocationRoute>
                    <BaseScreenLayout>
                      <AllProjectsView />
                    </BaseScreenLayout>
                  </LocationRoute>
                </ProtectedRoute>
              } />
              
              <Route path="/:locationSlug/projects/:projectId/edit" element={
                <ProtectedRoute>
                  <LocationRoute>
                    <BaseScreenLayout>
                      <EditModeView />
                    </BaseScreenLayout>
                  </LocationRoute>
                </ProtectedRoute>
              } />
              
              <Route path="/:locationSlug/projects/:projectId/approval" element={
                <ProtectedRoute>
                  <LocationRoute>
                    <ApprovalProofView />
                  </LocationRoute>
                </ProtectedRoute>
              } />
              
              <Route path="/:locationSlug/projects/:projectId/approved" element={
                <ProtectedRoute>
                  <LocationRoute>
                    <BaseScreenLayout>
                      <ApprovedView />
                    </BaseScreenLayout>
                  </LocationRoute>
                </ProtectedRoute>
              } />
              
              <Route path="/:locationSlug/account-settings" element={
                <ProtectedRoute>
                  <LocationRoute>
                    <BaseScreenLayout>
                      <AccountSettingsView />
                    </BaseScreenLayout>
                  </LocationRoute>
                </ProtectedRoute>
              } />
              
              {/* Fallback Routes (without location slug - for backward compatibility) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              
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
              
              <Route path="/projects/:projectId/approval" element={
                <ProtectedRoute>
                  <ApprovalProofView />
                </ProtectedRoute>
              } />
              
              <Route path="/projects/:projectId/approved" element={
                <ProtectedRoute>
                  <BaseScreenLayout>
                    <ApprovedView />
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
          </LocationProvider>
        </Router>
      </ProjectFlowProvider>
    </AuthProvider>
  );
};

export default App;
