# Memorial App Documentation

A Dynamic React application for Funeral and Cemetery Sales reps.

## Features

- **Login & New Memorial Creation Flow**: Users can log in and quickly drop into a new memorial creation flow
- **Memorial Quick Preview**: With a few short clicks, we're showing customers options
- **Add New Option**: Add new options to the list of designs
- **Preset Memorial Template**: Memorial templates configured from a templates.json file
- **Edit View**: Rough view for editing a memorial option
- **Account Settings**: Placeholder View for future account settings
- **All Projects**: View for displaying all user projects with thumbnails
- **Profile Dropdown**: Account settings and logout functionality
- **Global Navigation**: Consistent navigation between all views

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Component Hierarchy & Navigation Architecture

### Navigation System Overview

The application has been refactored to use a **modern React architecture** with:
- **React Router** for client-side routing
- **Context API** for global state management (Auth, Project Flow)
- **Custom Hooks** for data fetching and business logic
- **Component separation** by responsibility (UI, Layout, Pages, Flows)

### Component Hierarchy

```
App.jsx (Root)
├── AuthProvider (Context)
├── ProjectFlowProvider (Context)
└── Router
    ├── Routes
    │   ├── /login → LoginPage
    │   ├── /selection → SelectionPage
    │   ├── /projects → AllProjectsView (BaseScreenLayout)
    │   ├── /projects/:id/templates → TemplateGridView (BaseScreenLayout)
    │   ├── /projects/:id/edit/:templateId → EditModeView (BaseScreenLayout)
    │   └── /account-settings → AccountSettingsView (BaseScreenLayout)
    └── ProjectCreationWizard (Global Modal)
```

### Architecture Layers

#### **UI Components** (`src/components/ui/`)
- **Button** - Reusable button with variants
- **Card** - Container component with hover effects
- **Modal** - Modal dialog wrapper
- **Input** - Form input with validation
- **ProfileDropdown** - User account dropdown
- **BackgroundVideo** - Video background component

#### **Layout Components** (`src/components/layout/`)
- **IntroFlowLayout** - Layout for login/selection pages
- **BaseScreenLayout** - Main app layout with header/footer
- **AppHeader** - Global header with navigation
- **GlobalNavigation** - Navigation controls
- **FooterBranding** - Footer branding component

#### **Flow Components** (`src/components/flows/`)
- **ProjectCreationWizard** - Multi-step project creation modal
- **steps/** - Individual wizard steps
  - NewMemorialForm
  - MemorialDetailsForm
  - MemorialTypeForm
  - MemorialStyleForm
  - TemplateSelectionForm

#### **Page Components** (`src/pages/`)
- **LoginPage** - Authentication page
- **AllProjectsView** - Projects list view
- **TemplateGridView** - Template selection view
- **EditModeView** - Template editing view
- **AccountSettingsView** - Account settings page
- **NotFoundPage** - 404 error page

#### **Custom Hooks** (`src/hooks/`)
- **useAuth** - Authentication state and methods
- **useProjects** - Project data fetching
- **useProjectMutations** - Project CRUD operations

#### **Context Providers** (`src/context/`)
- **AuthContext** - Global authentication state
- **ProjectFlowContext** - Project creation wizard state

### Navigation & State Management

#### **Routing System**
- **React Router** handles all navigation
- **Protected Routes** require authentication
- **URL-based state** for deep linking
- **Programmatic navigation** via `useNavigate()`

#### **Global State**
- **AuthContext** - User authentication and session
- **ProjectFlowContext** - Project creation wizard state
- **Local Storage** - Persistent user session

#### **Data Management**
- **Custom Hooks** - Encapsulate data fetching logic
- **Service Layer** - Abstract data operations
- **Error Handling** - Centralized error management

### Navigation Flow

#### 1. **Authentication Flow**
```
/login → (Login Success) → /selection
```

#### 2. **Project Creation Flow**
```
/selection → "Create New" → ProjectCreationWizard (Modal)
ProjectCreationWizard → Complete → /projects/:id/templates
```

#### 3. **Project Management Flow**
```
/selection → "Open Existing" → /projects
/projects → Project Card → /projects/:id/templates
/projects/:id/templates → Template Card → /projects/:id/edit/:templateId
```

#### 4. **Global Navigation**
```
Any Page → Header Menu → /projects
Any Page → Header Profile → Account Settings
Any Page → Header Profile → Log Out → /login
```

### Key Benefits of New Architecture

#### **Separation of Concerns**
- **UI Components** - Pure presentation, no business logic
- **Page Components** - Route-specific views with data fetching
- **Layout Components** - Reusable structure and navigation
- **Flow Components** - Multi-step processes (wizard pattern)
- **Custom Hooks** - Reusable business logic
- **Context Providers** - Global state management

#### **Scalability**
- **Modular Structure** - Easy to add new features
- **Reusable Components** - DRY principle applied
- **Type Safety** - Ready for TypeScript migration
- **Testing** - Components are easily testable in isolation

#### **Developer Experience**
- **Clear File Organization** - Intuitive folder structure
- **Modern React Patterns** - Hooks, Context, Router
- **Consistent API** - Standardized component interfaces
- **Hot Reloading** - Fast development iteration

### Modern React Patterns

#### **React Router Navigation**
```javascript
// Programmatic navigation
const navigate = useNavigate();
navigate('/projects');

// Route parameters
const { projectId, templateId } = useParams();
```

#### **Context-Based State**
```javascript
// Global authentication
const { isAuthenticated, login, logout } = useAuth();

// Project creation wizard
const { openWizard, closeWizard, isWizardOpen } = useProjectFlow();
```

#### **Custom Hooks for Data**
```javascript
// Project data management
const { projects, loading, error, refreshProjects } = useProjects();
const { createProject, updateProject, deleteProject } = useProjectMutations();
```

#### **Component Composition**
```javascript
// Layout composition
<BaseScreenLayout>
  <AllProjectsView />
</BaseScreenLayout>

// Modal composition
<ProjectCreationWizard />
```

### Data Flow

#### **Project Data**
- Projects stored in localStorage via `dataService`
- Custom hooks (`useProjects`, `useProjectMutations`) manage data operations
- Page components fetch data on mount using hooks
- Real-time updates through hook refresh functions

#### **Authentication Data**
- User session managed by `AuthContext`
- Persistent login state via localStorage
- Protected routes automatically redirect unauthenticated users

#### **Project Creation Flow**
- Wizard state managed by `ProjectFlowContext`
- Step data accumulated through wizard progression
- Final project creation via `useProjectMutations` hook

## Project Structure

```
src/
├── App.jsx                    # Main app with routing and providers
├── main.jsx                   # React entry point
├── index.js                   # Legacy entry point (redirects to main.jsx)
│
├── components/
│   ├── ui/                    # Atomic UI components
│   │   ├── Button.js
│   │   ├── Card.js
│   │   ├── Modal.js
│   │   ├── Input.js
│   │   ├── ProfileDropdown.js
│   │   └── BackgroundVideo.js
│   │
│   ├── layout/                # Layout components
│   │   ├── IntroFlowLayout.js
│   │   ├── BaseScreenLayout.js
│   │   ├── AppHeader.js
│   │   ├── GlobalNavigation.js
│   │   └── FooterBranding.js
│   │
│   ├── flows/                 # Multi-step flows
│   │   ├── ProjectCreationWizard.js
│   │   └── steps/
│   │       ├── NewMemorialForm.js
│   │       ├── MemorialDetailsForm.js
│   │       ├── MemorialTypeForm.js
│   │       ├── MemorialStyleForm.js
│   │       └── TemplateSelectionForm.js
│   │
│   └── legacy/                # Old components (backup)
│
├── pages/                     # Route-specific pages
│   ├── LoginPage.js
│   ├── AllProjectsView.js
│   ├── TemplateGridView.js
│   ├── EditModeView.js
│   ├── AccountSettingsView.js
│   └── NotFoundPage.js
│
├── hooks/                     # Custom React hooks
│   ├── useAuth.js
│   ├── useProjects.js
│   └── useProjectMutations.js
│
├── context/                   # React Context providers
│   ├── AuthContext.js
│   └── ProjectFlowContext.js
│
└── services/                  # Data services
    ├── dataService.js
    └── templateService.js

public/
├── images/                    # Static images
├── videos/                    # Video assets
└── index.html                 # HTML template
```

## Form Validation

- **Email**: Required, must be valid email format
- **Password**: Required, minimum 6 characters
- **Real-time**: Errors clear as user types
- **Visual feedback**: Red borders and error messages for invalid fields

## Debugging & Troubleshooting

### Console Logging
The application includes comprehensive console logging for navigation debugging:

- **LoginForm**: Logs all state changes and navigation decisions
- **AllProjectsView**: Logs project loading and navigation calls
- **TemplateGridView**: Logs template loading and project changes
- **AppHeader**: Logs global navigation actions

### Common Issues

#### Navigation Not Working
1. Check console logs for prop availability
2. Verify state clearing in navigation handlers
3. Ensure conditional rendering order is correct

#### Project Data Not Loading
1. Check localStorage for project data
2. Verify `dataService.getAllProjects()` returns data
3. Check `templateService` for template data

#### State Conflicts
1. Ensure all conflicting states are cleared before setting new state
2. Check conditional rendering order in LoginForm
3. Verify prop passing down component tree

### Development Tips

- Use browser dev tools to inspect localStorage
- Check React DevTools for component state
- Monitor console logs for navigation flow
- Test navigation from different entry points

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)
