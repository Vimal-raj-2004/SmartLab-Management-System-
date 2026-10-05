import { test, expect } from '@playwright/test';
import { loginAs } from './helpers.js';

test.describe('All Portals & Pages Smoke Test', () => {

  test('Faculty: can access all faculty routes without error', async ({ page }) => {
    await loginAs(page, 'faculty@lab.edu', 'faculty123');

    // Dashboard
    await page.goto('/faculty/dashboard');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/Welcome|Faculty/i);

    // Bookings New
    await page.goto('/faculty/bookings/new');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/Reserve a Computer Laboratory/i);

    // My Bookings
    await page.goto('/faculty/bookings');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/My Lab Bookings/i);

    // Lab Availability
    await page.goto('/faculty/availability');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/Availability/i);

    // Faculty Submit Complaint
    await page.goto('/faculty/complaints/new');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toHaveText('Submit a Complaint');

    // Faculty My Complaints
    await page.goto('/faculty/complaints');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/My Submitted Complaints/i);
  });

  test('Lab Assistant: can access schedule, bookings, complaints & maintenance', async ({ page }) => {
    await loginAs(page, 'assistant@lab.edu', 'assistant123');

    // Assistant Dashboard
    await page.goto('/assistant/dashboard');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/Welcome|Lab Operations/i);

    // Today's Schedule
    await page.goto('/assistant/schedule');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/Today's Lab Sessions/i);

    // Booking Management
    await page.goto('/assistant/bookings');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/Lab Bookings Management/i);

    // Complaints Management
    await page.goto('/assistant/complaints');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/Complaints Management/i);

    // Maintenance Management
    await page.goto('/assistant/maintenance');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/Maintenance Management/i);
  });

  test('Admin: can access labs, pcs, inventory, users, complaints, bookings', async ({ page }) => {
    await loginAs(page, 'admin@lab.edu', 'admin123');

    // Admin Dashboard
    await page.goto('/admin/dashboard');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/System Administration/i);

    // Labs Page
    await page.goto('/admin/labs');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/Laboratory Management|Lab Management/i);

    // PCs Page
    await page.goto('/admin/pcs');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/PC Management|Workstations/i);

    // Inventory Page
    await page.goto('/admin/inventory');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/Inventory/i);

    // Users Page
    await page.goto('/admin/users');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/User Management/i);

    // Complaints Management
    await page.goto('/admin/complaints');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/Complaints Management/i);

    // Bookings Management
    await page.goto('/admin/bookings');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/Lab Bookings Management/i);
  });
});
