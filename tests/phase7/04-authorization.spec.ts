import { expect, test } from "@playwright/test";
import { authenticatedContext, accounts, requireAccounts } from "../helpers/auth";

test("another account cannot read, save, or submit someone else's draft", async ({ browser }) => {
  test.skip(!requireAccounts(true), "Set BOTH disposable test accounts");
  const owner = await authenticatedContext(browser, accounts.a);
  const stranger = await authenticatedContext(browser, accounts.b);
  try {
    const response = await owner.request.post("/api/applications");
    expect(response.status()).toBe(201);
    const draft = await response.json();
    expect((await owner.request.get(`/api/applications/${draft.id}`)).status()).toBe(200);
    expect((await stranger.request.get(`/api/applications/${draft.id}`)).status()).toBe(404);
    expect((await stranger.request.patch(`/api/applications/${draft.id}`, {
      data: { data: draft.data, version: draft.version },
    })).status()).toBe(404);
    expect((await stranger.request.post(`/api/applications/${draft.id}`, {
      data: { data: draft.data, version: draft.version },
    })).status()).toBe(404);
  } finally {
    await owner.close();
    await stranger.close();
  }
});
