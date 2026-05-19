/**
 * Helpers to extract values from browser localStorage.
 * NOTE: `localStorage` is a browser API, so these must run via Playwright `page.evaluate()`.
 */
import { Page } from '@playwright/test';

/**
 * Extract company details from authenticated user data via the me endpoint.
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
