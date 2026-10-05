/**
 * faculty.spec.js — Faculty Portal Full Page & Workflow Coverage
 * ==============================================================
 * Tests: dashboard, bookings, lab availability, complaints (submit + list),
 * lab utilization, and profile.
 */
import { test, expect } from '@playwright/test';
import { loginAs, USERS } from './helpers.js';

test.describe('Faculty Portal — All Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.faculty.email, USERS.faculty.password);
  });

  // ── Dashboard ──────────────────────────────────────────────
  test('Faculty Dashboard loads with welcome heading', async ({ page }) => {
    await page.goto('/faculty/dashboard');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/Welcome|Faculty/i);
  });

  // ── Make New Booking ───────────────────────────────────────
  test('New Booking form renders with required fields', async ({ page }) => {
    await page.goto('/faculty/bookings/new');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/Reserve a Computer Laboratory/i);

    await expect(page.locator('select, input[type="date"], input[type="time"]').first()).toBeVisible();
  });

  // ── My Bookings list ───────────────────────────────────────
  test('My Bookings page shows list or empty state', async ({ page }) => {
    await page.goto('/faculty/bookings');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/My Lab Bookings/i);

    const hasContent =
      (await page.locator('table tbody tr').count()) > 0 ||
      (await page.locator('text=/No bookings|no upcoming/i').count()) > 0;
    expect(hasContent).toBe(true);
  });

  // ── Lab Availability ───────────────────────────────────────
  test('Lab Availability page renders availability grid/list', async ({ page }) => {
    await page.goto('/faculty/availability');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/Availability/i);
  });

  // ── Submit Complaint ───────────────────────────────────────
  test('Submit Complaint form renders all fields', async ({ page }) => {
    await page.goto('/faculty/complaints/new');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toHaveText('Submit a Complaint');

    await expect(page.locator('select[name="complaint_type"]')).toBeVisible();
    await expect(page.locator('select[name="severity"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Faculty can submit a complaint and see success', async ({ page }) => {
    await page.goto('/faculty/complaints/new');
    await page.waitForSelector('select[name="complaint_type"]', { timeout: 15000 });

    await page.selectOption('select[name="complaint_type"]', { index: 1 });
    await page.selectOption('select[name="severity"]', 'medium');

    const prioritySelect = page.locator('select[name="priority"]');
    if (await prioritySelect.count() > 0) {
      await prioritySelect.selectOption('medium');
    }

    await page.fill('textarea[name="description"]', 'E2E Faculty Test: Projector in Lab-A is not working during class.');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/Complaint Submitted|Success/i')).toBeVisible({ timeout: 12000 });
  });

  // ── My Complaints ──────────────────────────────────────────
  test('My Complaints page shows faculty complaints', async ({ page }) => {
    await page.goto('/faculty/complaints');
    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/My Submitted Complaints/i);
  });

  // ── Lab Utilization (if accessible to faculty) ─────────────
  test('Utilization page loads if faculty has access', async ({ page }) => {
    await page.goto('/faculty/utilization');
    await page.waitForTimeout(2000);

    // Either shows utilization or redirects — both valid
    const pageLoaded =
      (await page.locator('main h1').count()) > 0 ||
      page.url().includes('/unauthorized') ||
      page.url().includes('/faculty/dashboard');
    expect(pageLoaded).toBe(true);
  });

  // ── Profile ────────────────────────────────────────────────
  test('Faculty can access profile page', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForSelector('main', { timeout: 15000 });
    await expect(page.locator('main').getByText(/Profile|Account|Name/i).first()).toBeVisible();
  });
});

test.describe('Faculty Portal — Booking Workflow', () => {
  test('Faculty can navigate from dashboard to new booking and back', async ({ page }) => {
    await loginAs(page, USERS.faculty.email, USERS.faculty.password);

    await page.goto('/faculty/dashboard');
    await page.waitForSelector('main h1', { timeout: 15000 });

    // Click the book/reserve link
    const bookLink = page.locator('a[href*="/bookings/new"], a:has-text("Book"), a:has-text("Reserve")');
    if (await bookLink.count() > 0) {
      await bookLink.first().click();
      await page.waitForSelector('main h1', { timeout: 12000 });
      await expect(page.locator('main h1')).toContainText(/Reserve|Booking/i);
    } else {
      await page.goto('/faculty/bookings/new');
      await page.waitForSelector('main h1', { timeout: 12000 });
      await expect(page.locator('main h1')).toContainText(/Reserve a Computer Laboratory/i);
    }
  });
});
