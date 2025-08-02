"use client";

import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale"; // Verwenden Sie de für Deutsch
import { 
  Building, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Clock, 
  ArrowLeft,
  Calendar,
  Users,
  Tag,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Company } from "@/lib/company-service";
import { AppointmentSlot } from "@/lib/appointment-slot-service";
import { AppointmentCategory } from "@/lib/appointment-category-service";
import { Team } from "@/lib/team-service";

interface CompanyDetailClientProps {
  company: Company;
  slots: AppointmentSlot[];
  categories: AppointmentCategory[];
  teams: Team[];
}

export default function CompanyDetailClient({ company, slots, categories, teams }: CompanyDetailClientProps) {
  const router = useRouter();

  // Kategorie-Farbe finden
  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || "#808080"; // Standardgrau
  };

  // Kategorie-Namen finden
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || "Keine Kategorie";
  };

  // Team-Namen finden
  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || "Kein Team";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.push("/dashboard/sirketler")}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <h1 className="text-3xl font-bold">{company.name}</h1>
        <Badge 
          variant={company.deaktif ? "destructive" : "default"}
          className="ml-4"
        >
          {company.deaktif ? "Inaktiv" : "Aktiv"}
        </Badge>
      </div>

      {/* Unternehmensinformationen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Unternehmensinformationen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {company.email && (
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{company.email}</span>
              </div>
            )}
            
            {company.phone && (
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{company.phone}</span>
              </div>
            )}
            
            {company.website && (
              <div className="flex items-center">
                <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                <a 
                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {company.website}
                </a>
              </div>
            )}
            
            {company.address && (
              <div className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground mt-1" />
                <span>{company.address}</span>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Erstellt: {format(new Date(company.created), "dd MMMM yyyy", { locale: de })}
            </p>
          </CardFooter>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Unternehmensbeschreibung
            </CardTitle>
          </CardHeader>
          <CardContent>
            {company.description ? (
              <p>{company.description}</p>
            ) : (
              <p className="text-muted-foreground">Keine Beschreibung verfügbar.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Terminslots des Unternehmens */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Terminslots</h2>
        </div>
        
        {slots.length === 0 ? (
          <div className="text-center py-10 border rounded-md">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Keine Terminslots gefunden</h3>
            <p className="text-muted-foreground mt-2">Für dieses Unternehmen sind keine Terminslots verfügbar.</p>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[4px]"></TableHead>
                  <TableHead>Slot-Name</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Uhrzeit</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Termine</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell className="p-0">
                      <div 
                        className="w-1 h-full" 
                        style={{ backgroundColor: getCategoryColor(slot.category) }}
                      ></div>
                    </TableCell>
                    <TableCell className="font-medium">{slot.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                        {format(parseISO(slot.date), "dd MMMM yyyy", { locale: de })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                        {format(new Date(slot.start * 1000), "HH:mm")} - 
                        {format(new Date(slot.end * 1000), "HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Tag className="h-3 w-3 mr-1 text-muted-foreground" />
                        {getCategoryName(slot.category)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="h-3 w-3 mr-1 text-muted-foreground" />
                        {Array.isArray(slot.team) 
                          ? slot.team.map(t => getTeamName(t)).join(", ")
                          : getTeamName(slot.team)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {slot.expand?.appointments && slot.expand.appointments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {slot.expand.appointments.map((appointment) => (
                            <Badge 
                              key={appointment.id}
                              variant={appointment.status === 'empty' ? 'outline' : (
                                appointment.status === 'edit' ? 'secondary' : 'default'
                              )}
                              className="text-xs"
                            >
                              {appointment.name}
                              {appointment.expand?.customer ? (
                                <span className="ml-1">
                                  - {appointment.expand.customer.name}
                                </span>
                              ) : null}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Keine Termine</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push(`/dashboard/randevu-slotlari/${slot.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}