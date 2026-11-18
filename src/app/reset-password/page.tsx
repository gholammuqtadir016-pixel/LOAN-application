import { PasswordRecoveryForm } from "@/components/auth/PasswordRecoveryForm";

// Next.js 15/16 passes searchParams as a Promise.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  return <PasswordRecoveryForm mode="reset" token={token} />;
}
