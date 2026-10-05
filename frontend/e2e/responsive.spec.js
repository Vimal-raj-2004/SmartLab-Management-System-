import { test, expect } from '@playwright/test';
import { loginAs } from './helpers.js';

test.describe('Mobile Responsiveness & Viewport Tests', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // Mobile phone viewport (iPhone SE size)

  test('Mobile: Sidebar toggle opens drawer and navigation works', async ({ page }) => {
    await loginAs(page, 'student@lab.edu', 'student123');
    await page.goto('/student/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // On mobile, the desktop sidebar should be hidden
    const desktopSidebar = page.locator('aside.hidden.lg\\:flex');
    await expect(desktopSidebar).toBeHidden();

    // The hamburger button should be visible
    const hamburgerBtn = page.locator('button[aria-label="Open menu"]');
    await expect(hamburgerBtn).toBeVisible();

    // Click hamburger button to open drawer
    await hamburgerBtn.click();

    // Mobile drawer should now be visible
    const mobileDrawer = page.locator('aside.fixed');
    await expect(mobileDrawer).toBeVisible();

    // Click "Submit Complaint" in drawer
    const submitLink = mobileDrawer.locator('a[href="/student/complaints/new"]');
    await expect(submitLink).toBeVisible();
    await submitLink.click();

    // Wait for navigation and form to load
    await page.waitForURL('**/student/complaints/new');
    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toHaveText('Submit a Complaint');

    // Verify form is stacked cleanly and no horizontal window overflow
    const formCard = page.locator('form');
    await expect(formCard).toBeVisible();

    // Scroll width check to make sure document body doesn't cause horizontal blowout
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 20;
    });
    expect(isOverflowing).toBe(false);
  });

  test('Mobile: My Complaints cards render cleanly without overflow', async ({ page }) => {
    await loginAs(page, 'student@lab.edu', 'student123');
    await page.goto('/student/complaints');
    await page.waitForLoadState('domcontentloaded');

    await page.waitForSelector('main h1', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText(/My Submitted Complaints/i);

    // Verify mobile layout exists
    const hasCardsOrEmpty = await page.locator('.md\\:hidden, text=No complaints found').first().isVisible();
    expect(hasCardsOrEmpty).toBe(true);

    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 20;
    });
    expect(isOverflowing).toBe(false);
  });
});
