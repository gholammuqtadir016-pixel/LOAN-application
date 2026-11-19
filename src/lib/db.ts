import declaration from "../../service.mjs";

type Loaded = ReturnType<typeof declaration.load>;

let loaded: Loaded | undefined;

/**
 * Runtime dependencies from the app's service declaration: the Prisma ORM 8
 * client arrives as `db().client` (`db().client.orm.public.<Model>`). Hydrated
 * on first call — never at module scope, so `next build` never needs the
 * runtime environment.
 */
export function db(): Loaded["db"] {
  loaded ??= declaration.load();
  return loaded.db;
}

export type AppInput = ReturnType<typeof declaration.input>;

/** The service's validated input, bound in module.mjs. Memoized by the service. */
export function input(): AppInput {
  return declaration.input();
}
