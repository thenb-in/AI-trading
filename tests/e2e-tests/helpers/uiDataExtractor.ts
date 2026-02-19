/**
 * Helpers to extract values from browser localStorage.
 * NOTE: `localStorage` is a browser API, so these must run via Playwright `page.evaluate()`.
 */
import { Page } from '@playwright/test';

export async function extractCompanyNameFromLocalStorage(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('activeCompanyName');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') return parsed;
      if (parsed && typeof parsed === 'object') return parsed.name || parsed.companyName || null;
      return null;
    } catch {
      return null;
    }
  });
}

/**
 * Extract company details from "auth context" user data.
 *
 * We first try localStorage key `userData` (if the app persists it),
 * otherwise fall back to calling the authenticated "me" endpoint.
 */
export async function extractCompanyFromAuthUserData(page: Page): Promise<{ id?: string; name?: string } | null> {
  return await page.evaluate(async () => {
    const pickCompany = (user: any) => {
      const company = user?.company || null;
      if (!company) return null;
      const id = company.id || company.companyId || company.company_id;
      const name = company.name || company.companyName;
      if (!id && !name) return null;
      return { id, name };
    };

    // 2) API fallback (must already be logged in / cookies present)
    const tryFetchJson = async (url: string) => {
      try {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    };

    const user = (await tryFetchJson('/api/v1/users/me')) || (await tryFetchJson('/users/me')) || null;
    return pickCompany(user);
  });
}
