# Memorial App Documentation

A Dynamic React application for Funeral and Cemetary Sales reps.

## Features

- **Login & New Memorial Creation Flow**: Users can log in and quickly drop into a new memorial creation flow
- **Memorial Quick Preview**: With a few short clicks, we're showing customers options
- **Add New Option**: Add new options to the list of designs
- **Preset Memorial Template**: Memorial templates configured from a templates.json file
- **Edit View**: Rough view for editing a memorial option
- **Account Settings**: Placeholder View for future account settings
- **All Projects**: Placeholder view for displaying all projects.

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

## Project Structure

```
src/
├── components/
│   ├── BackgroundVideo.js    # Video background component
│   ├── LoginForm.js         # Login form with validation
│   └── FooterBranding.js    # Footer branding component
├── App.js                   # Main app component
├── index.js                 # React entry point
└── styles.css              # Global styles

public/
├── images/                 # Static images
├── videos/                 # Video assets
└── index.html             # HTML template
```

## Form Validation

- **Email**: Required, must be valid email format
- **Password**: Required, minimum 6 characters
- **Real-time**: Errors clear as user types
- **Visual feedback**: Red borders and error messages for invalid fields

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)
