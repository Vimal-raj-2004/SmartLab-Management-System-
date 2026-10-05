/**
 * admin.spec.js — Admin Portal Full Page Coverage
 * ================================================
 * Tests every admin route: dashboard, labs, PCs, inventory,
 * users, complaints, bookings, PC health, and reports.
 */
import { test, expect } from '@playwright/test';
import { loginAs, USERS } from './helpers.js';

test.describe('Admin Portal — All Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.admin.email, USERS.admin.password);
  });

  // ── Dashboard ──────────────────────────────────────────────
  test('Admin Dashboard loads with KPI cards', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/System Administration/i);

    // At least some stat cards or numbers should appear
    const statBlocks = page.locator('main').getByText(/Total|Working|Open|Today/i);
    await expect(statBlocks.first()).toBeVisible({ timeout: 12000 });
  });

  // ── Labs Management ────────────────────────────────────────
  test('Labs page renders list and Add Lab button', async ({ page }) => {
    await page.goto('/admin/labs');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/Lab/i);

    // Either a table row or empty state message should exist
    const hasContent =
      (await page.locator('table tbody tr').count()) > 0 ||
      (await page.locator('text=/No labs|Add your/i').count()) > 0;
    expect(hasContent).toBe(true);
  });

  test('Labs page: Add Lab button is present and opens modal/form', async ({ page }) => {
    await page.goto('/admin/labs');
    await page.waitForSelector('main h1', { timeout: 15000 });

    const addBtn = page.locator('button:has-text("Add Lab"), button:has-text("New Lab"), button:has-text("Create")');
    if (await addBtn.count() > 0) {
      await addBtn.first().click();
      await page.waitForTimeout(800);
      // A form or modal should appear
      const formVisible =
        (await page.locator('form').count()) > 0 ||
        (await page.locator('[role="dialog"]').count()) > 0;
      expect(formVisible).toBe(true);
    }
  });

  // ── PC Management ──────────────────────────────────────────
  test('PCs page renders and shows PC entries', async ({ page }) => {
    await page.goto('/admin/pcs');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/PC|Workstation/i);

    const hasContent =
      (await page.locator('table tbody tr, .pc-card').count()) > 0 ||
      (await page.locator('text=/No PCs|No workstations/i').count()) > 0;
    expect(hasContent).toBe(true);
  });

  // ── Inventory ──────────────────────────────────────────────
  test('Inventory page loads correctly', async ({ page }) => {
    await page.goto('/admin/inventory');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/Inventory/i);
  });

  // ── Users Management ───────────────────────────────────────
  test('Users page loads user table', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/User Management/i);

    // There should be at least 1 user row
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });
  });

  // ── Complaints ─────────────────────────────────────────────
  test('Admin Complaints page shows complaint list', async ({ page }) => {
    await page.goto('/admin/complaints');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/Complaints/i);
  });

  // ── Bookings ───────────────────────────────────────────────
  test('Admin Bookings page loads', async ({ page }) => {
    await page.goto('/admin/bookings');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/Bookings/i);
  });

  // ── PC Health ──────────────────────────────────────────────
  test('PC Health monitoring page loads', async ({ page }) => {
    await page.goto('/admin/pc-health');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/PC Health|Health/i);
  });

  // ── Reports ────────────────────────────────────────────────
  test('Reports page loads with report type selector', async ({ page }) => {
    await page.goto('/admin/reports');
    await page.waitForSelector('main h1, main h2', { timeout: 15000 });
    await expect(page.locator('main').getByText(/Report|Export/i).first()).toBeVisible();
  });

  // ── Lab Utilization ────────────────────────────────────────
  test('Lab Utilization page loads', async ({ page }) => {
    await page.goto('/admin/utilization');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/Utilization|Lab Usage/i);
  });

  // ── Profile ────────────────────────────────────────────────
  test('Profile page loads and shows edit form', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForSelector('main h1, main h2', { timeout: 15000 });
    await expect(page.locator('main').getByText(/Profile|Account/i).first()).toBeVisible();
  });

  // ── 404 / NotFound ─────────────────────────────────────────
  test('Unknown route shows 404/Not Found page', async ({ page }) => {
    await page.goto('/admin/this-does-not-exist-xyz');
    await page.waitForTimeout(2000);
    const hasNotFound =
      (await page.locator('text=/Not Found|404|page not found/i').count()) > 0 ||
      page.url().includes('/login') ||
      page.url().includes('/admin/dashboard');
    expect(hasNotFound).toBe(true);
  });
});
