import { test, expect } from '@playwright/test';
import { loginAs } from './helpers.js';

test.describe('Student Portal & Submit Complaint (No White Screen)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'student@lab.edu', 'student123');
  });

  test('Student dashboard loads cleanly with stats and quick links', async ({ page }) => {
    await page.goto('/student/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Wait for dashboard to finish loading
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/Welcome/i);
    await expect(page.locator('main')).toContainText(/Student Portal/i);

    // Verify key action cards exist
    await expect(page.locator('main').getByRole('link', { name: /Submit Complaint/i })).toBeVisible();
    await expect(page.locator('main').getByRole('link', { name: /My Complaints/i })).toBeVisible();
  });

  test('Submit Complaint page loads properly without white screen', async ({ page }) => {
    // Navigate directly to the complaint submission page
    await page.goto('/student/complaints/new');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the form to render (confirming loading completed and no white screen crash)
    await page.waitForSelector('main h1', { timeout: 10000 });
    const pageHeading = page.locator('main h1');
    await expect(pageHeading).toBeVisible();
    await expect(pageHeading).toHaveText('Submit a Complaint');

    // Verify form elements exist
    await expect(page.locator('select[name="complaint_type"]')).toBeVisible();
    await expect(page.locator('select[name="severity"]')).toBeVisible();
    await expect(page.locator('select[name="priority"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Verify body is not blank/empty
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('Student can fill and submit a new complaint successfully', async ({ page }) => {
    await page.goto('/student/complaints/new');
    await page.waitForLoadState('domcontentloaded');

    // Wait for form to be ready
    await page.waitForSelector('select[name="complaint_type"]', { timeout: 10000 });

    // Fill form
    await page.selectOption('select[name="complaint_type"]', { index: 1 });
    await page.selectOption('select[name="severity"]', 'medium');
    await page.selectOption('select[name="priority"]', 'medium');
    await page.fill('textarea[name="description"]', 'E2E Test: Monitor flickers intermittently during laboratory hours.');

    // Submit complaint
    await page.click('button[type="submit"]');

    // Should display success message
    await expect(page.locator('text=Complaint Submitted!')).toBeVisible({ timeout: 10000 });

    // Should redirect to /student/complaints
    await page.waitForURL('**/student/complaints', { timeout: 12000 });
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/My Submitted Complaints/i);
  });

  test('Student can view my complaints list and open details modal', async ({ page }) => {
    await page.goto('/student/complaints');
    await page.waitForLoadState('domcontentloaded');

    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/My Submitted Complaints/i);

    // If there is any complaint, clicking view opens modal
    const viewButtons = page.locator('button[title="View Details"], button:has-text("View Details")');
    const count = await viewButtons.count();
    if (count > 0) {
      await viewButtons.first().click();
      await expect(page.locator('text=Complaint Details')).toBeVisible();
      // Close modal
      await page.click('button:has-text("Close")');
    }
  });

  test('Student can check Lab Availability', async ({ page }) => {
    await page.goto('/student/availability');
    await page.waitForLoadState('domcontentloaded');

    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/Availability/i);
    // Lab cards or slots should be visible
    await expect(page.locator('main text=Computer Lab').first()).toBeVisible();
  });
});
