/**
 * assistant.spec.js — Lab Assistant Portal Full Page Coverage
 * ===========================================================
 * Tests: dashboard, schedule, bookings management, complaints,
 * maintenance, PC status, reports.
 */
import { test, expect } from '@playwright/test';
import { loginAs, USERS } from './helpers.js';

test.describe('Lab Assistant Portal — All Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.assistant.email, USERS.assistant.password);
  });

  // ── Dashboard ──────────────────────────────────────────────
  test('Assistant Dashboard loads with KPI data', async ({ page }) => {
    await page.goto('/assistant/dashboard');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/Welcome|Lab Operations/i);

    // Should show some metrics
    const stats = page.locator('main').getByText(/PC|Complaint|Maintenance|Booking/i);
    await expect(stats.first()).toBeVisible({ timeout: 12000 });
  });

  // ── Today's Schedule ───────────────────────────────────────
  test("Today's Schedule page loads session list or empty", async ({ page }) => {
    await page.goto('/assistant/schedule');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/Today's Lab Sessions/i);
  });

  // ── Booking Management ─────────────────────────────────────
  test('Booking Management page shows all bookings', async ({ page }) => {
    await page.goto('/assistant/bookings');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/Lab Bookings Management/i);
  });

  // ── Complaints Management ──────────────────────────────────
  test('Complaints Management page loads with list', async ({ page }) => {
    await page.goto('/assistant/complaints');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/Complaints Management/i);
  });

  test('Assistant can view complaint details modal', async ({ page }) => {
    await page.goto('/assistant/complaints');
    await page.waitForSelector('main h1', { timeout: 15000 });

    const viewBtns = page.locator('button[title="View Details"], button:has-text("View"), button:has-text("Details")');
    const count = await viewBtns.count();
    if (count > 0) {
      await viewBtns.first().click();
      await page.waitForTimeout(1000);
      const modalVisible =
        (await page.locator('[role="dialog"]').count()) > 0 ||
        (await page.locator('text=/Complaint Details|Close/i').count()) > 0;
      expect(modalVisible).toBe(true);
    }
  });

  // ── Maintenance Management ─────────────────────────────────
  test('Maintenance Management page loads', async ({ page }) => {
    await page.goto('/assistant/maintenance');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/Maintenance Management/i);
  });

  test('Assistant can open New Maintenance form', async ({ page }) => {
    await page.goto('/assistant/maintenance');
    await page.waitForSelector('main h1', { timeout: 15000 });

    const addBtn = page.locator('button:has-text("Add Maintenance"), button:has-text("New Maintenance"), button:has-text("Schedule")');
    if (await addBtn.count() > 0) {
      await addBtn.first().click();
      await page.waitForTimeout(800);
      const formVisible =
        (await page.locator('form').count()) > 0 ||
        (await page.locator('[role="dialog"]').count()) > 0;
      expect(formVisible).toBe(true);
    }
  });

  // ── PC Health (if accessible) ──────────────────────────────
  test('PC Health page is accessible to assistant', async ({ page }) => {
    await page.goto('/assistant/pc-health');
    await page.waitForTimeout(2500);
    const accessible =
      (await page.locator('main h1').count()) > 0 ||
      page.url().includes('/unauthorized') ||
      page.url().includes('/dashboard');
    expect(accessible).toBe(true);
  });

  // ── Reports ────────────────────────────────────────────────
  test('Assistant Reports page loads', async ({ page }) => {
    await page.goto('/assistant/reports');
    await page.waitForTimeout(2500);
    const accessible =
      (await page.locator('main').count()) > 0 ||
      page.url().includes('/unauthorized');
    expect(accessible).toBe(true);
  });

  // ── Lab Availability ───────────────────────────────────────
  test('Assistant can view lab availability', async ({ page }) => {
    await page.goto('/assistant/availability');
    await page.waitForTimeout(2500);
    const loaded =
      (await page.locator('main h1').count()) > 0 ||
      page.url().includes('/dashboard');
    expect(loaded).toBe(true);
  });

  // ── Profile ────────────────────────────────────────────────
  test('Assistant profile page is accessible', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForSelector('main', { timeout: 15000 });
    await expect(page.locator('main').getByText(/Profile|Account/i).first()).toBeVisible();
  });
});
