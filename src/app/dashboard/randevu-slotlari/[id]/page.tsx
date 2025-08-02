import { Suspense } from "react";
import { getAppointmentSlotById } from "@/lib/appointment-slot-service";
import { getCustomers } from "@/lib/customer-service";
import { getAppointmentCategories } from "@/lib/appointment-category-service";
import { getCompanies } from "@/lib/company-service";
import { getTeams } from "@/lib/team-service";
import AppointmentSlotDetailClient from "./appointment-slot-detail-client";
import { Loader2 } from "lucide-react";

export default async function AppointmentSlotDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Alle Daten parallel abrufen
  const [slot, customers, categories, companies, teams] = await Promise.all([
    getAppointmentSlotById(params.id),
    getCustomers(),
    getAppointmentCategories(),
    getCompanies(),
    getTeams(),
  ]);

  // Kategorienamen finden
  const category = categories.find((c) => c.id === slot?.category);
  const categoryName = category?.name || "Unbekannt";

  // Firmennamen finden
  const company = companies.find((c) => c.id === slot?.company);
  const companyName = company?.name || "Unbekannt";

  // Teamnamen finden
  const teamNames = teams
    .filter((t) => slot?.team?.includes(t.id))
    .map((t) => t.name);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AppointmentSlotDetailClient
        slot={slot}
        customers={customers}
        categoryName={categoryName}
        companyName={companyName}
        teamNames={teamNames}
      />
    </Suspense>
  );
}