
import { test, expect, type BrowserContext } from "@playwright/test";

import {
  accounts,
  authenticatedContext,
  requireAccounts,
} from "../helpers/auth";

// Small synthetic PNG — no personal information.
const TEST_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=",
  "base64"
);

async function createDraft(context: BrowserContext) {
  const response = await context.request.post(
    "/api/applications"
  );

  expect(
    response.ok(),
    `Draft creation failed: HTTP ${response.status()}`
  ).toBeTruthy();

  const body = await response.json();
  const application = body.application ?? body;

  expect(application.id).toBeTruthy();

  return application.id as string;
}

async function uploadPNG(
  context: BrowserContext,
  applicationId: string,
  category: string
) {
  return context.request.post("/api/documents", {
    multipart: {
      applicationId,
      category,
      file: {
        name:
          category === "signature"
            ? "test-signature.png"
            : "test-identity.png",
        mimeType: "image/png",
        buffer: TEST_PNG,
      },
    },
  });
}

test.describe("Phase 7.2 — Documents and signatures", () => {
  test("authenticated applicant can upload a document", async ({
    browser,
  }) => {
    test.skip(!requireAccounts(), "Missing test account");

    const context = await authenticatedContext(
      browser,
      accounts.a
    );

    try {
      const id = await createDraft(context);

      const response = await uploadPNG(
        context,
        id,
        "identity"
      );

      expect(
        response.ok(),
        `Document upload failed: HTTP ${
          response.status()
        } — ${(await response.text()).slice(0, 300)}`
      ).toBeTruthy();

      const uploaded = await response.json();

      expect(uploaded.id).toBeTruthy();

      // Confirm the owner can retrieve the file.
      const download = await context.request.get(
        `/api/documents/${uploaded.id}`
      );

      expect(download.status()).toBe(200);
    } finally {
      await context.close();
    }
  });

  test("authenticated applicant can upload a signature PNG", async ({
    browser,
  }) => {
    test.skip(!requireAccounts(), "Missing test account");

    const context = await authenticatedContext(
      browser,
      accounts.a
    );

    try {
      const id = await createDraft(context);

      const response = await uploadPNG(
        context,
        id,
        "signature"
      );

      expect(
        response.ok(),
        `Signature upload failed: HTTP ${
          response.status()
        } — ${(await response.text()).slice(0, 300)}`
      ).toBeTruthy();

      const uploaded = await response.json();

      expect(uploaded.id).toBeTruthy();

      const download = await context.request.get(
        `/api/documents/${uploaded.id}`
      );

      expect(download.status()).toBe(200);
    } finally {
      await context.close();
    }
  });

  test("another account cannot access private documents", async ({
    browser,
  }) => {
    test.skip(
      !requireAccounts(true),
      "Two test accounts are required"
    );

    const owner = await authenticatedContext(
      browser,
      accounts.a
    );

    let other: BrowserContext | undefined;

    try {
      const applicationId = await createDraft(owner);

      const upload = await uploadPNG(
        owner,
        applicationId,
        "identity"
      );

      expect(
        upload.ok(),
        `Owner upload failed: HTTP ${upload.status()}`
      ).toBeTruthy();

      const { id: documentId } = await upload.json();

      expect(documentId).toBeTruthy();

      other = await authenticatedContext(
        browser,
        accounts.b
      );

      // Another account must not be able
      // to read the owner's uploaded document.
      const unauthorizedRead = await other.request.get(
        `/api/documents/${documentId}`
      );

      expect([403, 404]).toContain(
        unauthorizedRead.status()
      );

      // Another account must not be able
      // to upload into the owner's application.
      const unauthorizedUpload = await uploadPNG(
        other,
        applicationId,
        "income"
      );

      expect([403, 404]).toContain(
        unauthorizedUpload.status()
      );
    } finally {
      if (other) await other.close();
      await owner.close();
    }
  });
});
