import { test, expect } from "@playwright/test";

const hasE2EAuth =
  !!process.env.E2E_AUTH_EMAIL &&
  !!process.env.E2E_AUTH_PASSWORD &&
  !!process.env.E2E_CLERK_SIGNIN_URL;

test.describe("Critical Journeys", () => {
  test("public entry points render and navigate", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/auth");
    await expect(page.getByText("Sign in to Onera")).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });

  test("pricing and legal routes stay reachable", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page).toHaveURL(/\/pricing/);
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/privacy");
    await expect(page).toHaveURL(/\/privacy/);
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/terms");
    await expect(page).toHaveURL(/\/terms/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("oauth -> app flow placeholder (requires env wiring)", async ({ page }) => {
    test.skip(!hasE2EAuth, "Set E2E_AUTH_EMAIL/E2E_AUTH_PASSWORD/E2E_CLERK_SIGNIN_URL to run auth journey.");

    await page.goto(process.env.E2E_CLERK_SIGNIN_URL!);
    await page.getByLabel(/email/i).fill(process.env.E2E_AUTH_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_AUTH_PASSWORD!);
    await page.getByRole("button", { name: /continue|sign in|log in/i }).first().click();

    await expect(page).toHaveURL(/\/app|\/auth\/sso-callback/);
  });
});
