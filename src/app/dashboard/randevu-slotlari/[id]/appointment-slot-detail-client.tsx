"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  Building,
  Calendar,
  Clock,
  Edit,
  Loader2,
  Plus,
  Tag,
  Users,
  Check,
  AlertCircle,
  ArrowLeft,
  UserPlus,
  UserMinus,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAppointmentSlotById,
  updateAppointment,
  assignCustomerToAppointment,
  approveAppointment,
  removeCustomerFromAppointment,
  Appointment,
  AppointmentSlot,
} from "@/lib/appointment-slot-service";
import {
  getCustomers,
  createCustomer,
  Customer,
  CustomerFormData,
} from "@/lib/customer-service";
import { CustomerForm } from "@/components/customers/customer-form";
import { getAppointmentCategories } from "@/lib/appointment-category-service";
import { getCompanies } from "@/lib/company-service";
import { getTeams } from "@/lib/team-service";
import { getFileUrl, pb } from "@/lib/pocketbase";

// jsPDF und jspdf-autotable werden auf der Client-Seite verwendet

export default function SlotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slotId = Array.isArray(params.id) ? params.id[0] : params.id as string;
  
  console.log("Params:", params);

  const [isLoading, setIsLoading] = useState(true);
  const [slot, setSlot] = useState<AppointmentSlot | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [teamNames, setTeamNames] = useState<string[]>([]);
  
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [isCustomerEditDialogOpen, setIsCustomerEditDialogOpen] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<Customer | null>(null);
  
  // Status für die Erstellung eines neuen Kunden
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Daten laden
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        console.log("Slot ID:", slotId);
        if (!slotId) {
          console.error("Slot ID nicht gefunden");
          toast.error("Slot ID nicht gefunden.");
          router.push("/dashboard/randevu-slotlari");
          return;
        }
        
        // Slot-Informationen abrufen
        const slotData = await getAppointmentSlotById(slotId).catch(error => {
          console.error("Fehler beim Abrufen des Slots:", error);
          return null;
        });
        
        console.log("Slot Data:", slotData);
        if (!slotData) {
          toast.error("Slot nicht gefunden.");
          router.push("/dashboard/randevu-slotlari");
          return;
        }
        
        setSlot(slotData);
        
        // Kategorie-, Firmen- und Team-Informationen abrufen - mit Fehlerbehandlung
        let categoriesData: any[] = [];
        let companiesData: any[] = [];
        let teamsData: any[] = [];
        let customersData: Customer[] = [];
        
        try {
          categoriesData = await getAppointmentCategories();
        } catch (error) {
          console.error("Fehler beim Abrufen der Kategorien:", error);
        }
        
        try {
          companiesData = await getCompanies();
        } catch (error) {
          console.error("Fehler beim Abrufen der Firmen:", error);
        }
        
        try {
          teamsData = await getTeams();
        } catch (error) {
          console.error("Fehler beim Abrufen der Teams:", error);
        }
        
        try {
          customersData = await getCustomers();
        } catch (error) {
          console.error("Fehler beim Abrufen der Kunden:", error);
        }
        
        // Kategorienamen finden
        const category = categoriesData.find(c => c.id === slotData.category);
        setCategoryName(category?.name || "Unbekannt");
        
        // Firmennamen finden
        const company = companiesData.find(c => c.id === slotData.company);
        setCompanyName(company?.name || "Unbekannt");
        
        // Teamnamen finden
        const teams = teamsData.filter(t => slotData.team.includes(t.id));
        setTeamNames(teams.map(t => t.name));
        
        // Kunden speichern
        setCustomers(customersData);
        
        // Termine abrufen
        if (slotData.expand?.appointments) {
          setAppointments(slotData.expand.appointments);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
        toast.error("Beim Laden der Daten ist ein Fehler aufgetreten.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [slotId, router]);

  // Kunden zuweisen, wenn ausgewählt
  const handleAssignCustomer = async () => {
    if (!selectedAppointment || !selectedCustomerId) {
      toast.error("Bitte wählen Sie einen Kunden aus.");
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await assignCustomerToAppointment(selectedAppointment.id, selectedCustomerId);
      if (result) {
        toast.success("Kunde wurde erfolgreich dem Termin zugewiesen.");
        
        // Termine aktualisieren
        setAppointments(appointments.map(app => 
          app.id === result.id ? { ...app, customer: result.customer, status: result.status } : app
        ));
        
        setIsCustomerDialogOpen(false);
        setSelectedAppointment(null);
        setSelectedCustomerId("");
      } else {
        toast.error("Zuweisung des Kunden fehlgeschlagen.");
      }
    } catch (error) {
      console.error("Fehler beim Zuweisen des Kunden:", error);
      toast.error("Beim Zuweisen des Kunden ist ein Fehler aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Kunden aus dem Termin entfernen
  const handleRemoveCustomer = async (appointmentId: string) => {
    setIsLoading(true);
    try {
      const result = await removeCustomerFromAppointment(appointmentId);
      if (result) {
        toast.success("Kunde wurde erfolgreich vom Termin entfernt.");
        
        // Termine aktualisieren
        setAppointments(appointments.map(app => 
          app.id === result.id ? { ...app, customer: "", status: "empty" } : app
        ));
      } else {
        toast.error("Entfernen des Kunden fehlgeschlagen.");
      }
    } catch (error) {
      console.error("Fehler beim Entfernen des Kunden:", error);
      toast.error("Beim Entfernen des Kunden ist ein Fehler aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  // Funktion, die aufgerufen wird, wenn ein neuer Kunde erfolgreich erstellt wurde
  const handleCustomerFormSuccess = async () => {
    try {
      // Kundenliste aktualisieren
      const updatedCustomers = await getCustomers();
      setCustomers(updatedCustomers);
      
      // Den zuletzt hinzugefügten Kunden auswählen (der erste Kunde in der Liste)
      if (updatedCustomers.length > 0) {
        setSelectedCustomerId(updatedCustomers[0].id);
      }
      
      // Dialog zum Erstellen eines neuen Kunden schließen
      setIsNewCustomerDialogOpen(false);
      
      // Dialog zur Kundenzuweisung öffnen
      setIsCustomerDialogOpen(true);
      
      toast.success("Kunde erfolgreich erstellt.");
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Kundenliste:", error);
      toast.error("Beim Aktualisieren der Kundenliste ist ein Fehler aufgetreten.");
    } finally {
      setIsCreatingCustomer(false);
    }
  };
  
  // Funktion, die aufgerufen wird, wenn das Kundenformular abgebrochen wird
  const handleCustomerFormCancel = () => {
    setIsNewCustomerDialogOpen(false);
    setIsCreatingCustomer(false);
  };

  // Funktion, die aufgerufen wird, wenn die Kundenbearbeitung erfolgreich war
  const handleCustomerEditSuccess = async () => {
    try {
      // Kundenliste aktualisieren
      const updatedCustomers = await getCustomers();
      setCustomers(updatedCustomers);
      setIsCustomerEditDialogOpen(false);
      toast.success("Kunde erfolgreich aktualisiert.");
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Kundenliste:", error);
      toast.error("Beim Aktualisieren der Kundenliste ist ein Fehler aufgetreten.");
    }
  };

  // Funktion, die aufgerufen wird, wenn die Kundenbearbeitung abgebrochen wird
  const handleCustomerEditCancel = () => {
    setIsCustomerEditDialogOpen(false);
    setSelectedCustomerForEdit(null);
  };

  // Termin-Status anzeigen
  const getAppointmentStatusBadge = (status: string) => {
    switch (status) {
      case 'empty':
        return <Badge variant="outline" className="text-muted-foreground">Leer</Badge>;
      case 'edit':
        return <Badge variant="outline" className="text-blue-500 border-blue-500">Zugewiesen</Badge>;
      case 'okay':
        return <Badge variant="outline" className="text-green-500 border-green-500">Bestätigt</Badge>;
      default:
        return <Badge variant="outline">Unbekannt</Badge>;
    }
  };

  // Kundennamen finden
  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : "Kunde nicht gefunden";
  };

  // Termin-Status als Text anzeigen
  const getAppointmentStatusText = (status: string) => {
    switch (status) {
      case "empty": return "Leer";
      case "edit": return "In Bearbeitung";
      case "okay": return "Bestätigt";
      default: return "Unbekannt";
    }
  };

  // Auf druckbare HTML-Seite weiterleiten
  const handlePrintableView = async () => {
    if (!slot || !appointments) {
      toast.error("Daten für die Erstellung der druckbaren Seite fehlen.");
      return;
    }
    
    try {
      // Mit Slot-ID zur druckbaren Seite weiterleiten
      const printUrl = `/dashboard/randevu-slotlari/${slotId}/print`;
      
      // In neuem Tab öffnen
      window.open(printUrl, '_blank');
      
      toast.success("Druckbare Seite wird geöffnet...");
    } catch (error) {
      console.error("Fehler beim Öffnen der druckbaren Seite:", error);
      toast.error("Beim Öffnen der druckbaren Seite ist ein Fehler aufgetreten.");
    }
  };

  // Auf druckbare HTML-Seite für Kundendetails weiterleiten
  const handlePrintableCustomerView = async (customer: Customer) => {
    if (!customer) {
      toast.error("Kundeninformationen für die Erstellung der druckbaren Seite fehlen.");
      return;
    }
    
    try {
      // Mit Slot-ID und Kunden-ID zur druckbaren Seite weiterleiten
      const printUrl = `/dashboard/randevu-slotlari/${slotId}/print?customerId=${customer.id}`;
      
      // In neuem Tab öffnen
      window.open(printUrl, '_blank');
      
      toast.success("Druckbare Kundenseite wird geöffnet...");
    } catch (error) {
      console.error("Fehler beim Öffnen der druckbaren Kundenseite:", error);
      toast.error("Beim Öffnen der druckbaren Kundenseite ist ein Fehler aufgetreten.");
    }
  };

  // PDF erstellen und herunterladen (für Kundendetails) - ALTE FUNKTION
  const handleDownloadCustomerPDF = async (customer: Customer) => {
    if (!customer) {
      toast.error("Kundeninformationen zur PDF-Erstellung fehlen.");
      return;
    }
    
    try {
      // jsPDF importieren
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      
      // PDF erstellen (A4-Format)
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Farben
      const primaryColor = [41, 128, 185]; // Blau
      const secondaryColor = [200, 200, 200]; // Grau
      
      // Kopfzeile
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("Kundendetailbericht", 20, 25);
      
      // Fußzeile
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
      doc.setFontSize(10);
      doc.text(`Erstellungsdatum: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, 20, pageHeight - 8);
      
      // Start des Hauptinhaltsbereichs
      let yPos = 50;
      
             // Abschnitt Grundinformationen
       doc.setTextColor(0, 0, 0);
       doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
       doc.rect(15, yPos, pageWidth - 30, 8, 'F');
       doc.setFontSize(14);
       doc.text("Grundinformationen", 20, yPos + 6);
       
       yPos += 15;
       doc.setFontSize(12);
       doc.text(`Name:`, 20, yPos);
       doc.text(`${customer.name || '-'}`, 70, yPos);
       yPos += 8;
       doc.text(`Nachname:`, 20, yPos);
       doc.text(`${customer.surname || '-'}`, 70, yPos);
       yPos += 8;
       doc.text(`Telefon:`, 20, yPos);
       doc.text(`${customer.tel || '-'}`, 70, yPos);
       yPos += 8;
       doc.text(`E-Mail:`, 20, yPos);
       doc.text(`${customer.email || '-'}`, 70, yPos);
       yPos += 8;
       doc.text(`Alter:`, 20, yPos);
       doc.text(`${customer.age || '-'}`, 70, yPos);
       
       yPos += 20;
       
       // Abschnitt Kontaktdaten
       doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
       doc.rect(15, yPos, pageWidth - 30, 8, 'F');
       doc.setFontSize(14);
       doc.text("Kontaktdaten", 20, yPos + 6);
       
       yPos += 15;
       doc.setFontSize(12);
       doc.text(`Haustelefon:`, 20, yPos);
       doc.text(`${customer.home_tel || '-'}`, 70, yPos);
       yPos += 8;
       doc.text(`Standort:`, 20, yPos);
       doc.text(`${customer.location || '-'}`, 70, yPos);
       yPos += 8;
       doc.text(`Straße:`, 20, yPos);
       doc.text(`${customer.street || '-'}`, 70, yPos);
       yPos += 8;
       doc.text(`Postleitzahl:`, 20, yPos);
       doc.text(`${customer.postal_code || '-'}`, 70, yPos);
       
       yPos += 20;
       
       // Abschnitt Persönliche Informationen
       doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
       doc.rect(15, yPos, pageWidth - 30, 8, 'F');
       doc.setFontSize(14);
       doc.text("Persönliche Informationen", 20, yPos + 6);
       
       yPos += 15;
       doc.setFontSize(12);
       doc.text(`Anzahl Personen im Haushalt:`, 20, yPos);
       doc.text(`${customer.home_people_number || '-'}`, 120, yPos);
       yPos += 8;
       doc.text(`Wer ist der Kunde:`, 20, yPos);
       doc.text(`${customer.who_is_customer || '-'}`, 120, yPos);
       
       yPos += 20;
       
       // Abschnitt Dachinformationen
       doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
       doc.rect(15, yPos, pageWidth - 30, 8, 'F');
       doc.setFontSize(14);
       doc.text("Dachinformationen", 20, yPos + 6);
       
       yPos += 15;
       doc.setFontSize(12);
       doc.text(`Dachtyp:`, 20, yPos);
       doc.text(`${customer.roof_type || '-'}`, 70, yPos);
       
               // Direkten URL für das Dachbild anzeigen
        yPos += 8;
        doc.text(`Dach:`, 20, yPos);
        
        if (customer.roof_image) {
          // Bild-URL direkt von PocketBase abrufen
          const imageUrl = `http://104.247.166.175:32768/api/files/customers/${customer.id}/${customer.roof_image}`;
          console.log("Dachbild-URL:", imageUrl);
          
          // Als klickbaren Link anzeigen
          doc.setTextColor(0, 0, 255); // Blaue Farbe
          doc.textWithLink(customer.roof_image, 70, yPos, { url: imageUrl });
          doc.setTextColor(0, 0, 0); // Zurück zu schwarzer Farbe
          
          // Versuchen, das Bild hinzuzufügen
          try {
            yPos += 15;
            
            // Das Hinzufügen von Bildern als Base64 könnte sicherer sein
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Um CORS-Probleme zu vermeiden
            img.src = imageUrl;
            
            // Bild nach dem Laden zum PDF hinzufügen
            img.onload = function() {
              try {
                doc.addImage(
                  img,
                  'JPEG',
                  20,
                  yPos,
                  80, // Breite
                  60  // Höhe
                );
              } catch (e) {
                console.error("Fehler beim Hinzufügen des Bildes:", e);
              }
            };
            
            yPos += 65;
            
            // Auch als Link hinzufügen - deutlicher
            doc.setTextColor(0, 0, 255); // Blaue Farbe
            doc.setFontSize(12);
            doc.textWithLink("Bild im Browser öffnen", 20, yPos, { url: imageUrl });
            doc.setTextColor(0, 0, 0); // Zurück zu schwarzer Farbe
            
            // Auch die vollständige URL anzeigen
            yPos += 10;
            doc.setFontSize(8);
            doc.text(`URL: ${imageUrl}`, 20, yPos);
            
            // Auch den Dateinamen anzeigen
            yPos += 5;
            doc.setFontSize(8);
            doc.text(`Datei: ${customer.roof_image}`, 20, yPos);
          } catch (imgError) {
            console.error("Fehler beim Hinzufügen des Bildes:", imgError);
            yPos += 10;
            doc.text(`Bild konnte nicht geladen werden: ${customer.roof_image}`, 20, yPos);
          }
        } else {
          doc.text(`${customer.roof || '-'}`, 70, yPos);
        }
      
             // Abschnitt Dachbild wurde entfernt - oben als Link hinzugefügt
      
      yPos += 20;
      
             // Statusinformationen nicht anzeigen
       yPos += 10;
       
       // Abschnitt Besprochenes
       if (customer.note) {
         doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
         doc.rect(15, yPos, pageWidth - 30, 8, 'F');
         doc.setFontSize(14);
         doc.text("Besprochenes", 20, yPos + 6);
         
         yPos += 15;
         doc.setFontSize(12);
         const splitNote = doc.splitTextToSize(customer.note, pageWidth - 40);
         doc.text(splitNote, 20, yPos);
       }
      
      // Notizenseite wurde entfernt - muss nicht erneut angezeigt werden
      
      // PDF herunterladen
      doc.save(`kunde_${customer.name}_${customer.surname || ''}.pdf`);
      
      toast.success("Kundendetails als PDF heruntergeladen.");
    } catch (error) {
      console.error("Fehler bei der PDF-Erstellung:", error);
      toast.error("Bei der PDF-Erstellung ist ein Fehler aufgetreten.");
    }
  };

  if (isLoading && !slot) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Slot nicht gefunden</h2>
        <p className="text-muted-foreground mb-4">Der angeforderte Termin-Slot wurde nicht gefunden oder möglicherweise gelöscht.</p>
        <Button asChild>
          <a href="/dashboard/randevu-slotlari">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zu den Termin-Slots
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="sm" className="mr-4" asChild>
            <Link href="/dashboard/randevu-slotlari">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{slot.name}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrintableView}
        >
          <Printer className="h-4 w-4 mr-2" />
          Druckansicht
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold">Slot-Details: {slot.name}</h1>
          {slot.deaktif && (
            <Badge variant="outline" className="ml-4 text-muted-foreground">
              Deaktiviert
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/randevu-slotlari?edit=${slot.id}`)}>
          <Edit className="mr-2 h-4 w-4" />
          Bearbeiten
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Slot-Informationen</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Datum: {format(new Date(slot.date), "d. MMMM yyyy", { locale: de })}</span>
              </div>
              <div className="flex items-center text-sm">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Zeitfenster: {slot.start}:00 - {slot.end}:00</span>
              </div>
              <div className="flex items-center text-sm">
                <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Kategorie: {categoryName}</span>
              </div>
              <div className="flex items-center text-sm">
                <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Firma: {companyName}</span>
              </div>
              <div className="flex items-start text-sm">
                <Users className="mr-2 h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>Teams: {teamNames.join(", ")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Termin-Statistiken</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/30 p-4 rounded-lg text-center">
                <h3 className="text-2xl font-bold">{appointments.length}</h3>
                <p className="text-sm text-muted-foreground">Gesamtanzahl Termine</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg text-center">
                <h3 className="text-2xl font-bold">{appointments.filter(a => a.status !== 'empty').length}</h3>
                <p className="text-sm text-muted-foreground">Zugewiesene Termine</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg text-center">
                <h3 className="text-2xl font-bold">{appointments.filter(a => a.status === 'empty').length}</h3>
                <p className="text-sm text-muted-foreground">Leere Termine</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Termine</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Uhrzeit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    <p className="text-muted-foreground">Für diesen Slot sind keine Termine vorhanden.</p>
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((appointment) => {
                  const customer = customers.find(c => c.id === appointment.customer);
                  return (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">{appointment.name}</TableCell>
                    <TableCell>{getAppointmentStatusBadge(appointment.status)}</TableCell>
                    <TableCell>
                        {customer ? (
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium">{customer.name} {customer.surname}</div>
                              <div className="text-sm text-muted-foreground">
                                PLZ: {customer.postal_code || '-'}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCustomerForEdit(customer);
                                setIsCustomerEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                      ) : (
                        <span className="text-muted-foreground">Nicht zugewiesen</span>
                      )}
                    </TableCell>
                      <TableCell>
                        {customer ? (
                          customer.tel || "-"
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer ? (
                          customer.email || "-"
                        ) : (
                          <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {appointment.status === 'empty' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setIsCustomerDialogOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                        {appointment.status === 'edit' && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                setIsLoading(true);
                                try {
                                  const result = await approveAppointment(appointment.id);
                                  if (result) {
                                    toast.success("Termin bestätigt.");
                                    setAppointments(appointments.map(app => 
                                      app.id === result.id ? { ...app, status: result.status } : app
                                    ));
                                  } else {
                                    toast.error("Termin konnte nicht bestätigt werden.");
                                  }
                                } catch (error) {
                                  console.error("Fehler bei der Terminbestätigung:", error);
                                  toast.error("Bei der Terminbestätigung ist ein Fehler aufgetreten.");
                                } finally {
                                  setIsLoading(false);
                                }
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveCustomer(appointment.id)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {appointment.status === 'okay' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveCustomer(appointment.id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog zur Kundenzuweisung */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Kunden zuweisen</DialogTitle>
            <DialogDescription>
              {selectedAppointment && `Weisen Sie dem Termin um ${selectedAppointment.name} einen Kunden zu.`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Kunden auswählen</Label>
              <Select
                value={selectedCustomerId}
                onValueChange={setSelectedCustomerId}
              >
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Kunden auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.surname} - {customer.tel} - PLZ: {customer.postal_code || '-'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCustomerDialogOpen(false);
                  setIsNewCustomerDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Neuer Kunde
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAssignCustomer} disabled={isLoading || !selectedCustomerId}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird bearbeitet...
                </>
              ) : (
                "Kunden zuweisen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog zum Erstellen eines neuen Kunden */}
      <Dialog open={isNewCustomerDialogOpen} onOpenChange={setIsNewCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Neuen Kunden erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen Kunden und weisen Sie ihn einem Termin zu.
            </DialogDescription>
          </DialogHeader>
          
          <CustomerForm 
            onSuccess={handleCustomerFormSuccess} 
            onCancel={handleCustomerFormCancel} 
            isEdit={false}
          />
          
        </DialogContent>
      </Dialog>

      {/* Dialog zur Kundenbearbeitung */}
      <Dialog open={isCustomerEditDialogOpen} onOpenChange={setIsCustomerEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Kunden bearbeiten</DialogTitle>
            <DialogDescription>
              Kundeninformationen anzeigen und bearbeiten.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomerForEdit && (
            <>
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintableCustomerView(selectedCustomerForEdit)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Druckansicht
                </Button>
              </div>
              <CustomerForm 
                initialData={selectedCustomerForEdit}
                customerId={selectedCustomerForEdit.id}
                onSuccess={handleCustomerEditSuccess} 
                onCancel={handleCustomerEditCancel} 
                isEdit={true}
              />
            </>
          )}
          
        </DialogContent>
      </Dialog>
    </div>
  );
}