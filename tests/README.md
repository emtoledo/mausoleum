# E2E Tests

This directory contains end-to-end tests using Playwright for the Valhalla Memorial Application.

## Setup

1. Install Playwright dependencies:
```bash
npm install
npx playwright install
```

2. Set up test environment variables (optional):
```bash
export TEST_EMAIL=your-test-email@example.com
export TEST_PASSWORD=your-test-password
export TEST_PROJECT_ID=your-test-project-id-with-front-and-back-views
export BASE_URL=http://localhost:3000
```

Or create a `.env.test` file:
```
TEST_EMAIL=your-test-email@example.com
TEST_PASSWORD=your-test-password
TEST_PROJECT_ID=your-test-project-id-with-front-and-back-views
BASE_URL=http://localhost:3000
```

## Running Tests

### Run all E2E tests:
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive):
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser):
```bash
npm run test:e2e:headed
```

### Debug tests:
```bash
npm run test:e2e:debug
```

### Run a specific test file:
```bash
npx playwright test tests/multi-view.spec.js
```

## Test Files

### `multi-view.spec.js`
Tests for multi-view functionality:
- Verifies design elements render on project load
- Tests switching between Front and Back views
- Ensures only elements for the active view are visible
- Verifies view controller UI updates correctly

## Test Requirements

1. **Test User**: You need a test user account with credentials set in environment variables
2. **Test Project**: You need a project ID that has both front and back views with design elements
   - The project should have design elements saved for both views
   - Update `TEST_PROJECT_ID` in the test file or environment variables

## How Tests Work

The tests:
1. Log in using the test credentials
2. Navigate to a project's edit page
3. Wait for the canvas to load and initialize
4. Access the Fabric.js canvas instance via JavaScript evaluation
5. Check object visibility and viewId properties
6. Click view controller buttons to switch views
7. Verify that only elements for the active view are visible

## Troubleshooting

### Canvas Access Issues
If the test can't access the Fabric.js canvas instance, you may need to expose it for testing. Add this to your `DesignStudio.jsx` or `useFabricCanvas.js`:

```javascript
// For testing only
if (process.env.NODE_ENV === 'test' || window.__PLAYWRIGHT_TEST__) {
  window.fabricCanvas = fabricCanvasInstance.current;
}
```

### Authentication Issues
- Ensure your test user credentials are correct
- Check that the login flow hasn't changed
- Verify Supabase authentication is working

### Project Not Found
- Ensure the test project ID exists
- Verify the project has both front and back views enabled
- Check that the project has design elements saved

### Timeout Issues
- Increase timeout values if your app loads slowly
- Check network conditions
- Verify the dev server is running on the correct port

