import { test, expect, type BrowserContext } from "@playwright/test";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const a = { email: process.env.TEST_A_EMAIL, password: process.env.TEST_A_PASSWORD };
const b = { email: process.env.TEST_B_EMAIL, password: process.env.TEST_B_PASSWORD };

test.skip(!a.email || !a.password || !b.email || !b.password,
  "Set TEST_A_EMAIL/PASSWORD and TEST_B_EMAIL/PASSWORD (two disposable accounts)");

async function login(context: BrowserContext, email: string, password: string) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  await page.close();
}

test("user B cannot read, edit, submit, or upload into user A's draft", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  try {
    await login(contextA, a.email!, a.password!);
    await login(contextB, b.email!, b.password!);

    const created = await contextA.request.post(`${BASE}/api/applications`);
    expect(created.status()).toBe(201);
    const { id, data } = await created.json();

    expect((await contextA.request.get(`${BASE}/api/applications/${id}`)).status()).toBe(200);
    expect((await contextB.request.get(`${BASE}/api/applications/${id}`)).status()).toBe(404);

    const changed = { ...data, fullName: "Unauthorized" };
    expect((await contextB.request.patch(`${BASE}/api/applications/${id}`, {
      data: { data: changed },
    })).status()).toBe(404);

    expect((await contextB.request.post(`${BASE}/api/applications/${id}`, {
      data: { data: changed },
    })).status()).toBe(404);

    const invalidUpload = await contextB.request.post(`${BASE}/api/documents`, {
      multipart: {
        applicationId: id,
        category: "identity",
        file: {
          name: "sample.png",
          mimeType: "image/png",
          buffer: Buffer.from("89504e470d0a1a0a", "hex"),
        },
      },
    });
    expect(invalidUpload.status()).toBe(404);

    // Minimal signature-only file for authorization testing; NOT valid image content.
    const uploaded = await contextA.request.post(`${BASE}/api/documents`, {
      multipart: {
        applicationId: id,
        category: "identity",
        file: {
          name: "sample.png",
          mimeType: "image/png",
          buffer: Buffer.from("89504e470d0a1a0a", "hex"),
        },
      },
    });
    expect(uploaded.status()).toBe(200);
    const { id: documentId } = await uploaded.json();

    expect((await contextB.request.get(`${BASE}/api/documents/${documentId}`)).status()).toBe(404);
    expect((await contextA.request.get(`${BASE}/api/documents/${documentId}`)).status()).toBe(200);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
