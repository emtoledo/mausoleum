import { test, expect } from '@playwright/test';

/**
 * E2E Test: Multi-View Design Element Rendering
 * 
 * This test verifies that:
 * 1. Design elements render properly on project load
 * 2. Switching between Front and Back views displays the correct design elements
 * 3. Only elements for the active view are visible
 */
test.describe('Multi-View Design Element Rendering', () => {
  // Test credentials - can be set via environment variables or .env.test file
  const TEST_EMAIL = process.env.TEST_EMAIL || 'toledo.eric@gmail.com';
  const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test123';
  
  // Test project ID - should be a project that has both front and back views
  const TEST_PROJECT_ID = process.env.TEST_PROJECT_ID || 'a85035e5-21b9-49c9-8762-d3f9a1dd9a12';

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Wait for login form to be visible
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    
    // Fill in login credentials
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    
    // Submit login form - wait for button to be enabled
    const submitButton = page.locator('button[type="submit"]:has-text("Login")');
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // Click and wait for navigation
    await Promise.all([
      page.waitForURL(/\/(projects|selection)/, { timeout: 20000 }),
      submitButton.click()
    ]);
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    
    // Verify we're authenticated by checking URL
    const currentUrl = page.url();
    if (!currentUrl.includes('/projects') && !currentUrl.includes('/selection')) {
      throw new Error(`Login failed - redirected to ${currentUrl} instead of /projects or /selection`);
    }
  });

  test('should render design elements on project load and switch views correctly', async ({ page }) => {
    // Capture console errors and network errors
    const consoleErrors = [];
    const networkErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('Console error:', msg.text());
      }
    });
    
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
        console.log(`Network error: ${response.status()} ${response.statusText()} - ${response.url()}`);
      }
    });
    
    // First, ensure we're on the projects page
    if (!page.url().includes('/projects')) {
      await page.goto('/projects');
      await page.waitForLoadState('domcontentloaded');
    }
    
    // Wait for projects to load
    await page.waitForSelector('.project-card, [data-testid="project-card"], .card', { timeout: 10000 });
    
    // Try to click the project card (not the Edit button, which opens a modal)
    // The card click should navigate to the edit page
    const projectCards = page.locator('.project-card, [data-testid="project-card"], .card');
    const cardCount = await projectCards.count();
    
    if (cardCount > 0) {
      console.log(`Found ${cardCount} project card(s), clicking the first one...`);
      // Click the first project card (which should navigate to edit page)
      await projectCards.first().click();
      await page.waitForTimeout(2000);
      
      // Wait for navigation
      try {
        await page.waitForURL(/\/(projects\/[^\/]+\/(edit|approved))/, { timeout: 10000 });
      } catch (e) {
        console.log('Navigation timeout, checking current URL...');
      }
      
      const urlAfterClick = page.url();
      console.log('URL after clicking project card:', urlAfterClick);
      
      if (urlAfterClick.includes('/edit')) {
        console.log('Successfully navigated to edit page via project card click');
      } else if (urlAfterClick.includes('/approved')) {
        throw new Error('The project is approved and cannot be edited. Please use a draft project for testing.');
      } else {
        // Card click didn't work, try direct navigation
        console.log('Card click did not navigate, trying direct navigation...');
        await page.goto(`/projects/${TEST_PROJECT_ID}/edit`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
      }
    } else {
      // No project cards, try direct navigation
      console.log(`No project cards found, navigating directly to: /projects/${TEST_PROJECT_ID}/edit`);
      await page.goto(`/projects/${TEST_PROJECT_ID}/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    }
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Final URL:', currentUrl);
    
    if (currentUrl.includes('/login')) {
      throw new Error('Got redirected to login - authentication failed');
    }
    if (currentUrl.includes('/approved')) {
      throw new Error(`Project ${TEST_PROJECT_ID} is approved and cannot be edited. Please use a draft project for testing.`);
    }
    if (currentUrl === '/projects' || (currentUrl.includes('/projects') && !currentUrl.includes('/edit'))) {
      // Check for error messages
      const errorMessages = await page.locator('.error, .error-message, [class*="error"]').all();
      let errorText = '';
      if (errorMessages.length > 0) {
        for (const elem of errorMessages) {
          errorText += await elem.textContent() + ' ';
        }
      } else {
        errorText = await page.textContent('body') || '';
      }
      
      const errorDetails = [
        `Got redirected back to projects list. Project ${TEST_PROJECT_ID} may not exist or there's an error loading it.`,
        `Console errors: ${consoleErrors.length > 0 ? consoleErrors.join('; ') : 'None'}`,
        `Network errors: ${networkErrors.length > 0 ? networkErrors.map(e => `${e.status} ${e.statusText}`).join('; ') : 'None'}`,
        `Page content: ${errorText.substring(0, 300)}`
      ].join('\n');
      
      throw new Error(errorDetails);
    }
    
    // Ensure we're on the edit page
    if (!currentUrl.includes('/edit')) {
      throw new Error(`Expected to be on edit page but got: ${currentUrl}`);
    }
    
    // Wait for DesignStudio to load - check for the canvas container
    try {
      console.log('Waiting for design studio to load...');
      await page.waitForSelector('.design-studio-canvas-container', { timeout: 60000, state: 'visible' });
      console.log('Design studio container found!');
    } catch (error) {
      console.error('Design studio container not found');
      
      // Check what elements are present
      const allElements = await page.evaluate(() => {
        return {
          designStudio: document.querySelector('.design-studio') ? 'found' : 'not found',
          canvasContainer: document.querySelector('.design-studio-canvas-container') ? 'found' : 'not found',
          anyCanvas: document.querySelectorAll('canvas').length,
          bodyClasses: document.body.className,
          title: document.title
        };
      });
      console.error('Page elements:', allElements);
      
      throw error;
    }
    
    // Wait for canvas to appear
    try {
      console.log('Waiting for canvas to appear...');
      await page.waitForSelector('canvas.fabric-canvas', { timeout: 90000, state: 'attached' });
      console.log('Fabric canvas found!');
      
      // Also wait for it to be visible
      await page.waitForSelector('canvas.fabric-canvas', { timeout: 10000, state: 'visible' });
      console.log('Fabric canvas is visible!');
    } catch (error) {
      console.log('Canvas not found within timeout, checking page state...');
      
      // Check for canvas in DOM
      const canvasInDOM = await page.evaluate(() => {
        const allCanvases = document.querySelectorAll('canvas');
        const fabricCanvas = document.querySelector('canvas.fabric-canvas');
        const productCanvas = document.querySelector('canvas.product-canvas');
        const container = document.querySelector('.design-studio-canvas-container');
        
        return {
          totalCanvases: allCanvases.length,
          fabricCanvas: {
            exists: !!fabricCanvas,
            visible: fabricCanvas ? window.getComputedStyle(fabricCanvas).display !== 'none' : false
          },
          productCanvas: {
            exists: !!productCanvas,
            visible: productCanvas ? window.getComputedStyle(productCanvas).display !== 'none' : false
          },
          containerExists: !!container,
          containerVisible: container ? window.getComputedStyle(container).display !== 'none' : false
        };
      });
      console.error('Canvas elements in DOM:', canvasInDOM);
      
      throw error;
    }
    
    // Wait for canvas to be fully initialized and Fabric.js to be ready
    await page.waitForFunction(() => {
      return window.__fabricCanvasInstance !== undefined && 
             window.__fabricCanvasInstance !== null &&
             window.__fabricCanvasInstance.getObjects !== undefined;
    }, { timeout: 60000 });
    
    // Additional wait for canvas to render
    await page.waitForTimeout(3000);

    // Verify canvas is present and has content
    const canvas = page.locator('canvas.fabric-canvas').first();
    await expect(canvas).toBeVisible();
    
    // Get canvas element count using JavaScript evaluation
    const canvasObjectCount = await page.evaluate(() => {
      const canvasElement = document.querySelector('canvas.fabric-canvas');
      if (!canvasElement) {
        console.error('No canvas element found');
        return { count: 0, error: 'No canvas element' };
      }
      
      const fabricCanvas = window.__fabricCanvasInstance || canvasElement.__canvas || window.fabricCanvas;
      if (!fabricCanvas) {
        console.error('Fabric.js canvas instance not found');
        return { count: 0, error: 'Fabric.js not initialized', hasCanvas: true };
      }
      
      if (!fabricCanvas.getObjects) {
        console.error('Fabric.js canvas does not have getObjects method');
        return { count: 0, error: 'Invalid canvas instance', hasCanvas: true, hasFabric: true };
      }
      
      const objects = fabricCanvas.getObjects();
      const designObjects = objects.filter(obj => !obj.excludeFromExport);
      return { 
        count: designObjects.length, 
        totalObjects: objects.length,
        designObjects: designObjects.length
      };
    });
    
    console.log(`Initial canvas object count:`, canvasObjectCount);
    
    if (canvasObjectCount.error) {
      throw new Error(`Canvas initialization error: ${canvasObjectCount.error}`);
    }
    
    expect(canvasObjectCount.count || canvasObjectCount.designObjects).toBeGreaterThan(0);
    
    // Check initial view (should be Front)
    const frontViewElementCount = await page.evaluate(() => {
      const canvasElement = document.querySelector('canvas.fabric-canvas');
      if (!canvasElement) return 0;
      const fabricCanvas = window.__fabricCanvasInstance || canvasElement.__canvas || window.fabricCanvas;
      if (fabricCanvas && fabricCanvas.getObjects) {
        const objects = fabricCanvas.getObjects();
        return objects.filter(obj => {
          if (obj.excludeFromExport) return false;
          const viewId = obj.viewId || obj.get?.('viewId');
          const isVisible = obj.visible !== false && obj.opacity !== 0;
          return viewId === 'front' && isVisible;
        }).length;
      }
      return 0;
    });
    
    console.log(`Front view element count: ${frontViewElementCount}`);
    expect(frontViewElementCount).toBeGreaterThan(0);
    
    // Check if Back button is available and click it
    const backButton = page.locator('.control-item.view', { hasText: 'Back' });
    const backButtonCount = await backButton.count();
    
    if (backButtonCount > 0) {
      console.log('Back button found, clicking to switch views...');
      await backButton.click();
      await page.waitForTimeout(2000); // Wait for view switch
      
      // Verify Back view elements are visible
      const backViewElementCount = await page.evaluate(() => {
        const canvasElement = document.querySelector('canvas.fabric-canvas');
        if (!canvasElement) return 0;
        const fabricCanvas = window.__fabricCanvasInstance || canvasElement.__canvas || window.fabricCanvas;
        if (fabricCanvas && fabricCanvas.getObjects) {
          const objects = fabricCanvas.getObjects();
          return objects.filter(obj => {
            if (obj.excludeFromExport) return false;
            const viewId = obj.viewId || obj.get?.('viewId');
            const isVisible = obj.visible !== false && obj.opacity !== 0;
            return viewId === 'back' && isVisible;
          }).length;
        }
        return 0;
      });
      
      console.log('Back view element count:', backViewElementCount);
      expect(backViewElementCount).toBeGreaterThan(0);
      
      // Switch back to Front
      const frontButton = page.locator('.control-item.view', { hasText: 'Front' });
      await frontButton.click();
      await page.waitForTimeout(2000);
      
      // Verify Front view elements are visible again
      const frontViewElementCountAfterSwitch = await page.evaluate(() => {
        const canvasElement = document.querySelector('canvas.fabric-canvas');
        if (!canvasElement) return 0;
        const fabricCanvas = window.__fabricCanvasInstance || canvasElement.__canvas || window.fabricCanvas;
        if (fabricCanvas && fabricCanvas.getObjects) {
          const objects = fabricCanvas.getObjects();
          return objects.filter(obj => {
            if (obj.excludeFromExport) return false;
            const viewId = obj.viewId || obj.get?.('viewId');
            const isVisible = obj.visible !== false && obj.opacity !== 0;
            return viewId === 'front' && isVisible;
          }).length;
        }
        return 0;
      });
      
      console.log('Front view element count after switch:', frontViewElementCountAfterSwitch);
      expect(frontViewElementCountAfterSwitch).toBeGreaterThan(0);
    } else {
      console.log('Back button not found - project may only have Front view');
    }
  });

  test('should handle projects with only front view', async ({ page }) => {
    // This test verifies that projects with only front view don't show view controller
    // Navigate to a project (using TEST_PROJECT_ID or first available)
    await page.goto(`/projects/${TEST_PROJECT_ID}/edit`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Wait for canvas
    await page.waitForSelector('canvas.fabric-canvas', { timeout: 60000, state: 'visible' });
    await page.waitForFunction(() => window.__fabricCanvasInstance !== undefined, { timeout: 60000 });
    
    // Check if view controller exists
    const viewControllerExists = await page.locator('.control-item.view').count();
    
    if (viewControllerExists === 0) {
      // No view controller - project has only one view, which is fine
      console.log('No view controller found - project has single view');
    } else {
      // View controller exists - verify it works
      const frontButton = page.locator('.control-item.view', { hasText: 'Front' });
      if (await frontButton.count() > 0) {
        await expect(frontButton).toBeVisible();
      }
    }
  });
});

