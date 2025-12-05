/**
 * Playwright Global Setup
 * 
 * This file runs once before all tests and can be used to:
 * - Load environment variables from .env.test
 * - Set up test data
 * - Authenticate and get tokens
 */

import { readFileSync } from 'fs';
import { join } from 'path';

async function globalSetup() {
  // Try to load .env.test file if it exists
  try {
    const envPath = join(process.cwd(), '.env.test');
    const envFile = readFileSync(envPath, 'utf-8');
    const envVars = {};
    
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          envVars[key.trim()] = value;
        }
      }
    });
    
    // Set environment variables
    Object.keys(envVars).forEach(key => {
      if (!process.env[key]) {
        process.env[key] = envVars[key];
      }
    });
    
    console.log('✓ Loaded environment variables from .env.test');
  } catch (error) {
    // .env.test file doesn't exist, that's okay - use defaults or env vars
    console.log('ℹ No .env.test file found, using environment variables or defaults');
  }
}

export default globalSetup;

