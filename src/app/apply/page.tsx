import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/current-user";
import { LoanWizard } from "@/components/loan/LoanWizard";

export default async function ApplyPage() {
  if (!(await currentUserId())) redirect("/login");
  return <LoanWizard />;
}
