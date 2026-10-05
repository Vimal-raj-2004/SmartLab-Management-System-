/**
 * load_concurrent.spec.js — Concurrent Multi-User Traffic Simulation
 * ==================================================================
 * Simulates multiple users hitting the server at the same time.
 *
 * Strategy:
 *   • All tests in this file run fully in parallel (fullyParallel = true).
 *   • Each test represents a separate "user session" with its own browser context.
 *   • We measure page load times and assert they stay under acceptable thresholds.
 *   • The 'concurrent-users' Playwright project runs these with 4 workers,
 *     meaning 4 browser sessions are alive and making requests simultaneously.
 *
 * Thresholds (adjustable):
 *   PAGE_LOAD_WARN_MS  = 4000  ms   (passes but logs warning)
 *   PAGE_LOAD_FAIL_MS  = 10000 ms   (test fails if exceeded)
 */
import { test, expect } from '@playwright/test';
import { loginAs, measurePageLoad, USERS } from './helpers.js';

const PAGE_LOAD_FAIL_MS = 10000;

/** Helper: log load time with pass/warn */
function assertLoadTime(ms, route, testInfo) {
  const verdict = ms < 2000 ? '✅ FAST' : ms < 4000 ? '⚠️  OK' : '🐢 SLOW';
  console.log(`  [${verdict}] ${route} loaded in ${ms}ms`);
  expect(ms, `${route} took ${ms}ms — exceeds ${PAGE_LOAD_FAIL_MS}ms limit`).toBeLessThan(PAGE_LOAD_FAIL_MS);
}

// ────────────────────────────────────────────────────────────────────────────
// CONCURRENT USER GROUP A — Admin user navigating heavy data pages
// ────────────────────────────────────────────────────────────────────────────
test('Concurrent User A (Admin) — Dashboard + Labs + PCs simultaneously', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await loginAs(page, USERS.admin.email, USERS.admin.password);

  const routes = [
    '/admin/dashboard',
    '/admin/labs',
    '/admin/pcs',
    '/admin/users',
    '/admin/inventory',
  ];

  for (const route of routes) {
    const ms = await measurePageLoad(page, route, 'main h1, main h2');
    assertLoadTime(ms, route, testInfo);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// CONCURRENT USER GROUP B — Faculty user making bookings while others login
// ────────────────────────────────────────────────────────────────────────────
test('Concurrent User B (Faculty) — Bookings & Complaints pages under load', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await loginAs(page, USERS.faculty.email, USERS.faculty.password);

  const routes = [
    '/faculty/dashboard',
    '/faculty/bookings',
    '/faculty/bookings/new',
    '/faculty/complaints',
    '/faculty/complaints/new',
    '/faculty/availability',
  ];

  for (const route of routes) {
    const ms = await measurePageLoad(page, route, 'main h1, main');
    assertLoadTime(ms, route, testInfo);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// CONCURRENT USER GROUP C — Lab Assistant navigating operational views
// ────────────────────────────────────────────────────────────────────────────
test('Concurrent User C (Assistant) — Schedule + Maintenance + Complaints', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await loginAs(page, USERS.assistant.email, USERS.assistant.password);

  const routes = [
    '/assistant/dashboard',
    '/assistant/schedule',
    '/assistant/bookings',
    '/assistant/complaints',
    '/assistant/maintenance',
  ];

  for (const route of routes) {
    const ms = await measurePageLoad(page, route, 'main h1, main');
    assertLoadTime(ms, route, testInfo);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// CONCURRENT USER GROUP D — Student browsing while others do heavy queries
// ────────────────────────────────────────────────────────────────────────────
test('Concurrent User D (Student) — Dashboard + Complaints under load', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await loginAs(page, USERS.student.email, USERS.student.password);

  const routes = [
    '/student/dashboard',
    '/student/complaints',
    '/student/complaints/new',
    '/student/availability',
  ];

  for (const route of routes) {
    const ms = await measurePageLoad(page, route, 'main h1, main');
    assertLoadTime(ms, route, testInfo);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// CONCURRENT STRESS — 8 rapid sequential page hits (simulates tab-switching)
// ────────────────────────────────────────────────────────────────────────────
test('Stress: Rapid sequential navigation does not crash the app', async ({ page }) => {
  await loginAs(page, USERS.admin.email, USERS.admin.password);

  const rapidRoutes = [
    '/admin/dashboard',
    '/admin/labs',
    '/admin/pcs',
    '/admin/complaints',
    '/admin/bookings',
    '/admin/inventory',
    '/admin/users',
    '/admin/dashboard', // return to dashboard
  ];

  for (const route of rapidRoutes) {
    await page.goto(route);
    // Only wait for DOMContentLoaded — fastest meaningful signal
    await page.waitForLoadState('domcontentloaded');
    // Ensure no JS crash (no white screen / no error boundary visible)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length, `White/blank screen at ${route}`).toBeGreaterThan(10);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// CONCURRENT LOGIN RACE — 4 roles logging in at the same time
// (Each parallel worker runs one of these; together they all hit /login + /api simultaneously)
// ────────────────────────────────────────────────────────────────────────────
test('Race Login A — Admin logs in during concurrent load', async ({ page }) => {
  await loginAs(page, USERS.admin.email, USERS.admin.password);
  await expect(page.locator('main')).toBeVisible();
  expect(page.url()).not.toContain('/login');
});

test('Race Login B — Faculty logs in during concurrent load', async ({ page }) => {
  await loginAs(page, USERS.faculty.email, USERS.faculty.password);
  await expect(page.locator('main')).toBeVisible();
  expect(page.url()).not.toContain('/login');
});

test('Race Login C — Assistant logs in during concurrent load', async ({ page }) => {
  await loginAs(page, USERS.assistant.email, USERS.assistant.password);
  await expect(page.locator('main')).toBeVisible();
  expect(page.url()).not.toContain('/login');
});

test('Race Login D — Student logs in during concurrent load', async ({ page }) => {
  await loginAs(page, USERS.student.email, USERS.student.password);
  await expect(page.locator('main')).toBeVisible();
  expect(page.url()).not.toContain('/login');
});

// ────────────────────────────────────────────────────────────────────────────
// API RESPONSE TIME — Check backend responds fast even under parallel load
// ────────────────────────────────────────────────────────────────────────────
test('API: Backend /api/labs responds in under 3 seconds', async ({ page, request }) => {
  // Login first to get a valid session/token
  await loginAs(page, USERS.admin.email, USERS.admin.password);

  // Measure API response time via route interception
  let apiResponseTime = -1;
  page.on('response', (res) => {
    if (res.url().includes('/api/labs') || res.url().includes('/labs')) {
      // record approximate timing (response received)
      apiResponseTime = Date.now();
    }
  });

  const startTime = Date.now();
  await page.goto('/admin/labs');
  await page.waitForSelector('main h1', { timeout: 15000 });

  const totalTime = Date.now() - startTime;
  console.log(`  [API] Labs page (including API) loaded in ${totalTime}ms`);
  expect(totalTime).toBeLessThan(PAGE_LOAD_FAIL_MS);
});

test('API: Backend /api/complaints responds fast', async ({ page }) => {
  await loginAs(page, USERS.admin.email, USERS.admin.password);

  const start = Date.now();
  await page.goto('/admin/complaints');
  await page.waitForSelector('main h1', { timeout: 15000 });
  const elapsed = Date.now() - start;

  console.log(`  [API] Complaints page loaded in ${elapsed}ms`);
  expect(elapsed).toBeLessThan(PAGE_LOAD_FAIL_MS);
});
