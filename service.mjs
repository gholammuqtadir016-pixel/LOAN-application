import { compute } from "@prisma/composer-prisma-cloud";
import { dataContract, postgres } from "@prisma/composer-prisma-cloud/orm";
import nextjs from "@prisma/composer/nextjs";
import { secretString } from "@prisma/composer/zod";
import { z } from "zod";
import contractJson from "./src/prisma/contract.json" with { type: "json" };

/** The app's data contract, emitted from prisma/schema.prisma by `prisma contract emit`. */
export const orm = /** @type {import('@prisma/composer-prisma-cloud/orm').PostgresContract<import('./src/prisma/contract').Contract>} */ (
  dataContract(contractJson)
);

/**
 * The values this service reads at runtime: dependencies (the database) come
 * from `deps`, these fields from `input`, bound in module.mjs. Nothing is read
 * from process.env.
 */
const input = z.object({
  authSecret: secretString(), // set in module.mjs
  dataEncryptionKey: secretString(),
  resendApiKey: secretString(),
  resetEmailFrom: secretString(),
  appBaseUrl: secretString(),
  trustedClientIpHeader: secretString(),
  privateUploadDir: secretString(),
});

export default compute({
  name: "web",
  deps: {
    db: postgres(orm),
  },
  input,
  build: nextjs({ module: import.meta.url, appDir: "." }),
});
