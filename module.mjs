import { module } from "@prisma/composer";
import { envSecret } from "@prisma/composer-prisma-cloud";
import { postgres } from "@prisma/composer-prisma-cloud/orm";
import appService, { orm } from "./service.mjs";

export default module("loan-application", ({ provision }) => {
  const db = provision(
    postgres({
      name: "db",
      contract: orm,
      config: "./prisma.config.ts",
    }),
  );

  provision(appService, {
    deps: { db },
    input: {
      authSecret: envSecret("AUTH_SECRET"), // Signs next-auth session tokens and rate-limit keys.
      dataEncryptionKey: envSecret("DATA_ENCRYPTION_KEY"), // Encrypts loan drafts at rest.
      resendApiKey: envSecret("RESEND_API_KEY"), // Sends password-reset email via Resend.
      resetEmailFrom: envSecret("RESET_EMAIL_FROM"), // From address of password-reset email.
      appBaseUrl: envSecret("APP_BASE_URL"), // Public origin used in password-reset links.
      trustedClientIpHeader: envSecret("TRUSTED_CLIENT_IP_HEADER"), // Reverse-proxy header naming the trusted client IP.
      privateUploadDir: envSecret("PRIVATE_UPLOAD_DIR"), // Directory storing private uploaded documents.
    },
  });
});
