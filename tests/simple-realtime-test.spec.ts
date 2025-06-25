import { test, expect } from '@playwright/test';

test.describe('Simple Real-time Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test page
    await page.goto('http://quantumnest.localhost:3000/simple-realtime-test');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Wait for authentication to complete
    await page.waitForSelector('[data-testid="jwt-tenant-id"]', { timeout: 10000 });
  });

  test('should display JWT payload information', async ({ page }) => {
    // Check if JWT payload section is visible
    await expect(page.locator('text=JWT Token Payload')).toBeVisible();
    
    // Check tenant ID display
    const tenantIdElement = page.locator('[data-testid="jwt-tenant-id"]');
    await expect(tenantIdElement).toBeVisible();
    
    // Log the tenant ID value for debugging
    const tenantIdValue = await tenantIdElement.textContent();
    console.log('JWT Tenant ID:', tenantIdValue);
    
    // Check if tenant ID is set (should be "quantumnest" or "Not set")
    await expect(tenantIdElement).toContainText(/quantumnest|Not set/);
    
    // Check other JWT fields
    await expect(page.locator('text=User ID:')).toBeVisible();
    await expect(page.locator('text=Email:')).toBeVisible();
    await expect(page.locator('text=Role:')).toBeVisible();
  });

  test('should display tenant information correctly', async ({ page }) => {
    // Check tenant info in the real-time status section
    const tenantInfo = page.locator('[data-testid="tenant-info"]');
    await expect(tenantInfo).toBeVisible();
    await expect(tenantInfo).toContainText('Tenant: quantumnest');
  });

  test('should be able to send a test message', async ({ page }) => {
    // Find the message input and send button
    const messageInput = page.locator('input[placeholder*="test message"]');
    const sendButton = page.locator('button:has-text("Send")');
    
    await expect(messageInput).toBeVisible();
    await expect(sendButton).toBeVisible();
    
    // Type a test message
    const testMessage = `Playwright test message - ${Date.now()}`;
    await messageInput.fill(testMessage);
    
    // Click send button
    await sendButton.click();
    
    // Wait for the message to be sent (button should show "Sending..." then back to "Send")
    await expect(sendButton).toContainText('Send');
    
    // Check if the message appears in the test data section
    await expect(page.locator(`text=${testMessage}`)).toBeVisible({ timeout: 5000 });
    
    console.log('Test message sent successfully:', testMessage);
  });

  test('should show real-time connection status', async ({ page }) => {
    // Check real-time status section
    await expect(page.locator('text=Real-time Connection Status')).toBeVisible();
    
    // Check status badge (should be connected or disconnected)
    const statusBadge = page.locator('text=Status:').locator('..').locator('[class*="badge"]');
    await expect(statusBadge).toBeVisible();
    
    // Log the connection status
    const statusText = await statusBadge.textContent();
    console.log('Real-time connection status:', statusText);
    
    // Check events and records counters
    await expect(page.locator('text=Events received:')).toBeVisible();
    await expect(page.locator('text=Test records:')).toBeVisible();
  });

  test('should expand full JWT payload', async ({ page }) => {
    // Find and click the details element to expand full JWT payload
    const detailsElement = page.locator('details:has(summary:has-text("Full JWT Payload"))');
    await expect(detailsElement).toBeVisible();
    
    // Click to expand
    await detailsElement.locator('summary').click();
    
    // Check if the full payload is now visible
    const fullPayload = page.locator('[data-testid="jwt-full-payload"]');
    await expect(fullPayload).toBeVisible();
    
    // Verify it contains JSON structure
    const payloadText = await fullPayload.textContent();
    expect(payloadText).toContain('{');
    expect(payloadText).toContain('}');
    
    console.log('Full JWT Payload expanded successfully');
  });

  test('should handle clear all functionality', async ({ page }) => {
    // First, send a test message to have data to clear
    const messageInput = page.locator('input[placeholder*="test message"]');
    const sendButton = page.locator('button:has-text("Send")');
    
    await messageInput.fill('Message to be cleared');
    await sendButton.click();
    await expect(sendButton).toContainText('Send');
    
    // Wait for message to appear
    await expect(page.locator('text=Message to be cleared')).toBeVisible({ timeout: 5000 });
    
    // Find and click clear all button
    const clearButton = page.locator('button:has-text("Clear All")');
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    
    // Wait a moment for the clear operation
    await page.waitForTimeout(2000);
    
    console.log('Clear all functionality tested');
  });

  test('should display authentication status', async ({ page }) => {
    // Check test summary section
    await expect(page.locator('text=Test Summary')).toBeVisible();
    
    // Check JWT Authentication status
    const jwtAuthStatus = page.locator('text=JWT Authentication').locator('..');
    await expect(jwtAuthStatus).toBeVisible();
    
    // Check Real-time Connection status  
    const realtimeStatus = page.locator('text=Real-time Connection').locator('..');
    await expect(realtimeStatus).toBeVisible();
    
    console.log('Authentication status section verified');
  });
});
