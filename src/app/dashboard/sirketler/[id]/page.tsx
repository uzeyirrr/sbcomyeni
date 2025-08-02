import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getCompanyById } from "@/lib/company-service";
import { getAppointmentSlots } from "@/lib/appointment-slot-service";
import { getAppointmentCategories } from "@/lib/appointment-category-service";
import { getTeams } from "@/lib/team-service";
import CompanyDetailClient from "./company-detail-client";

interface PageProps {
  params: {
    id: string;
  };
}

async function getData(id: string) {
  const [company, slots, categories, teams] = await Promise.all([
    getCompanyById(id),
    getAppointmentSlots(`company="${id}"`),
    getAppointmentCategories(),
    getTeams()
  ]);

  if (!company) {
    throw new Error("Unternehmen nicht gefunden");
  }

  return {
    company,
    slots,
    categories,
    teams
  };
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const data = await getData(params.id);

  return (
    <Suspense fallback={
      <div className="container mx-auto py-6 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Wird geladen...</span>
      </div>
    }>
      <CompanyDetailClient {...data} />
    </Suspense>
  );
}