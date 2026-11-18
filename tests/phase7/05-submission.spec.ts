
import { test, expect } from "@playwright/test";

import {
  accounts,
  authenticatedContext,
  requireAccounts,
} from "../helpers/auth";

test.describe("Phase 7.2 — Loan submission security", () => {
  test("incomplete loan cannot be submitted", async ({
    browser,
  }) => {
    test.skip(!requireAccounts(), "Missing test account");

    const context = await authenticatedContext(
      browser,
      accounts.a
    );

    try {
      // Create an entirely new draft
      const create = await context.request.post(
        "/api/applications"
      );

      expect(create.ok()).toBeTruthy();

      const created = await create.json();
      const application = created.application ?? created;

      expect(application.id).toBeTruthy();

      const id = application.id;

      // Retrieve the actual draft
      const getDraft = await context.request.get(
        `/api/applications/${id}`
      );

      expect(getDraft.status()).toBe(200);

      const result = await getDraft.json();
      const draft = result.application ?? result;

      // Attempt to submit without required information
      const submit = await context.request.post(
        `/api/applications/${id}`,
        {
          data: {
            data: draft.data,
          },
        }
      );

      // The API must reject an incomplete application
      expect(
        submit.ok(),
        `Incomplete application was accepted: HTTP ${submit.status()}`
      ).toBeFalsy();

      // Confirm that it remains a draft
      const after = await context.request.get(
        `/api/applications/${id}`
      );

      expect(after.status()).toBe(200);

      const afterBody = await after.json();
      const saved = afterBody.application ?? afterBody;

      expect(saved.status).toBe("DRAFT");
    } finally {
      await context.close();
    }
  });

  test("unauthenticated user cannot submit a draft", async ({
    request,
  }) => {
    const response = await request.post(
      "/api/applications/nonexistent-test-id",
      {
        data: {
          data: {},
        },
      }
    );

    expect([401, 403]).toContain(response.status());
  });
});
