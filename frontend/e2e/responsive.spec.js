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

test.describe('Modal Popups Responsiveness & Close Button Visibility', () => {
  // Test on typical laptop viewport with constrained height (similar to 1366x768 with browser tabs & OS taskbar)
  test.use({ viewport: { width: 1366, height: 600 } });

  test('Faculty Complaints: View modal stays within viewport and close button is fully visible', async ({ page }) => {
    await loginAs(page, 'faculty@lab.edu', 'faculty123');
    await page.goto('/faculty/complaints');
    await page.waitForLoadState('domcontentloaded');

    await page.waitForSelector('main h1', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText(/My Submitted Complaints/i);

    // Look for view details button in table or mobile cards
    const viewBtn = page.locator('button[title="View Details"], button:has-text("View Details")').first();
    const hasComplaints = await viewBtn.isVisible().catch(() => false);

    if (hasComplaints) {
      await viewBtn.click();

      // Wait for modal to appear
      const modal = page.locator('.fixed.inset-0.z-50');
      await expect(modal).toBeVisible();

      // Close button (X icon in sticky header)
      const closeXBtn = modal.locator('button[aria-label="Close complaint details"], button[title="Close"]').first();
      await expect(closeXBtn).toBeVisible();

      // Verify close button is inside viewport bounds (not pushed off-screen)
      const box = await closeXBtn.boundingBox();
      expect(box).not.toBeNull();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(600);

      // Verify footer close button is also visible and within viewport
      const footerCloseBtn = modal.locator('button:has-text("Close")');
      await expect(footerCloseBtn).toBeVisible();
      const footerBox = await footerCloseBtn.boundingBox();
      expect(footerBox).not.toBeNull();
      expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(600);

      // Test closing via X button
      await closeXBtn.click();
      await expect(modal).toBeHidden();

      // Re-open and test closing via Escape key
      await viewBtn.click();
      await expect(modal).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();
    }
  });

  test('Mobile: Complaint View modal remains fully bounded and scrollable on small mobile screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAs(page, 'faculty@lab.edu', 'faculty123');
    await page.goto('/faculty/complaints');
    await page.waitForLoadState('domcontentloaded');

    await page.waitForSelector('main h1', { timeout: 15000 });
    const viewBtn = page.locator('button:has-text("View Details")').first();
    const hasComplaints = await viewBtn.isVisible().catch(() => false);

    if (hasComplaints) {
      await viewBtn.click();
      const modal = page.locator('.fixed.inset-0.z-50');
      await expect(modal).toBeVisible();

      const closeXBtn = modal.locator('button[aria-label="Close complaint details"], button[title="Close"]').first();
      await expect(closeXBtn).toBeVisible();

      const box = await closeXBtn.boundingBox();
      expect(box).not.toBeNull();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(667);

      // Close modal
      await closeXBtn.click();
      await expect(modal).toBeHidden();
    }
  });
});

