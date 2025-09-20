# Memorial App Documentation

A dynamic React application for the Valhalla Memorial login page with video background and form validation.

## Features

- **Video Background**: Auto-playing, looping video background
- **Form Validation**: Real-time email and password validation
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Loading States**: Visual feedback during form submission
- **Error Handling**: Clear error messages for invalid inputs
- **Modern UI**: Clean, professional design with backdrop blur effects

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
