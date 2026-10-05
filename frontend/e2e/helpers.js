/**
 * helpers.js — Shared Playwright utilities
 * =========================================
 * Provides login, logout, page timing, and API health helpers
 * used across all spec files.
 */

/** Login a page session as a given user */
export async function loginAs(page, email, password) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
  await page.waitForSelector('main');
}

/** Logout the current session */
export async function logout(page) {
  // Try sidebar logout button if visible, else navigate to /login
  const btn = page.locator('button:has-text("Logout"), a:has-text("Logout")');
  if (await btn.count() > 0) {
    await btn.first().click();
    await page.waitForURL('**/login', { timeout: 10000 });
  } else {
    await page.goto('/login');
  }
}

/**
 * Measures how long it takes for a selector to appear after navigation.
 * Returns elapsed milliseconds.
 */
export async function measurePageLoad(page, url, selector = 'main h1') {
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForSelector(selector, { timeout: 20000 });
  return Date.now() - t0;
}

/** Credentials map for all roles */
export const USERS = {
  admin:     { email: 'admin@lab.edu',     password: 'admin123' },
  faculty:   { email: 'faculty@lab.edu',   password: 'faculty123' },
  assistant: { email: 'assistant@lab.edu', password: 'assistant123' },
  student:   { email: 'student@lab.edu',   password: 'student123' },
};
