/**
 * auth.spec.js — Authentication & Role-Guard Tests
 * ================================================
 * Covers: login (valid/invalid), logout, token persistence,
 * and role-based route protection for all 4 roles.
 */
import { test, expect } from '@playwright/test';
import { loginAs, logout, USERS } from './helpers.js';

test.describe('Authentication — Valid Login', () => {
  for (const [role, creds] of Object.entries(USERS)) {
    test(`${role}: can log in and reach dashboard`, async ({ page }) => {
      await loginAs(page, creds.email, creds.password);

      // Should NOT still be on /login
      expect(page.url()).not.toContain('/login');

      // Main content must be visible
      await expect(page.locator('main')).toBeVisible();
    });
  }
});

test.describe('Authentication — Invalid Login', () => {
  test('Wrong password shows error message', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@lab.edu');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should stay on login or show error
    await page.waitForTimeout(2000);
    const hasError =
      page.url().includes('/login') ||
      (await page.locator('text=/invalid|incorrect|error|wrong/i').count()) > 0;
    expect(hasError).toBe(true);
  });

  test('Empty credentials shows validation', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Should stay on login page
    expect(page.url()).toContain('/login');
  });

  test('Nonexistent email is rejected', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'nobody@nowhere.com');
    await page.fill('input[type="password"]', 'anything');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Must remain on login or show error
    const onLogin = page.url().includes('/login');
    const hasErrText = (await page.locator('text=/invalid|not found|error/i').count()) > 0;
    expect(onLogin || hasErrText).toBe(true);
  });
});

test.describe('Authentication — Logout', () => {
  test('Admin can log out and is redirected to /login', async ({ page }) => {
    await loginAs(page, USERS.admin.email, USERS.admin.password);
    await logout(page);
    expect(page.url()).toContain('/login');
  });

  test('After logout, protected routes redirect to /login', async ({ page }) => {
    await loginAs(page, USERS.student.email, USERS.student.password);
    await logout(page);

    // Try to access a protected route directly
    await page.goto('/student/dashboard');
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});

test.describe('Authentication — Role Route Guards', () => {
  test('Student cannot access /admin routes (redirected)', async ({ page }) => {
    await loginAs(page, USERS.student.email, USERS.student.password);
    await page.goto('/admin/users');
    await page.waitForTimeout(2000);

    const isBlocked =
      page.url().includes('/unauthorized') ||
      page.url().includes('/login') ||
      page.url().includes('/student');
    expect(isBlocked).toBe(true);
  });

  test('Faculty cannot access /admin routes (redirected)', async ({ page }) => {
    await loginAs(page, USERS.faculty.email, USERS.faculty.password);
    await page.goto('/admin/labs');
    await page.waitForTimeout(2000);

    const isBlocked =
      page.url().includes('/unauthorized') ||
      page.url().includes('/login') ||
      page.url().includes('/faculty');
    expect(isBlocked).toBe(true);
  });

  test('Unauthenticated user accessing protected route goes to /login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});
