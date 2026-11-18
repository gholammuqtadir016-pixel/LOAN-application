import { expect, test } from "@playwright/test";
import { authenticatedContext, accounts, requireAccounts } from "../helpers/auth";

test("draft create, save, read, and stale revision conflict", async ({ browser }) => {
  test.skip(!requireAccounts(), "Set TEST_A_EMAIL and TEST_A_PASSWORD");
  const context = await authenticatedContext(browser, accounts.a);
  try {
    const created = await context.request.post("/api/applications");
    expect(created.status()).toBe(201);
    const draft = await created.json();
    expect(draft.id).toEqual(expect.any(String));
    expect(draft.version).toEqual(expect.any(Number));

    const before = await context.request.get(`/api/applications/${draft.id}`);
    expect(before.status()).toBe(200);

    const changed = { ...draft.data, fullName: "Phase Seven Test Applicant" };
    const saved = await context.request.patch(`/api/applications/${draft.id}`, {
      data: { data: changed, version: draft.version },
    });
    expect(saved.status()).toBe(200);
    const savedBody = await saved.json();
    expect(savedBody.version).toBe(draft.version + 1);

    const stale = await context.request.patch(`/api/applications/${draft.id}`, {
      data: { data: { ...changed, fullName: "Old Tab" }, version: draft.version },
    });
    expect(stale.status()).toBe(409);
    expect((await stale.json()).code).toBe("VERSION_CONFLICT");

    const latest = await context.request.get(`/api/applications/${draft.id}`);
    expect(latest.status()).toBe(200);
    expect((await latest.json()).data.fullName).toBe("Phase Seven Test Applicant");
  } finally {
    await context.close();
  }
});
