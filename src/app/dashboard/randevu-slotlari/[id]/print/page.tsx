"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale"; // Almanca yerel ayarı içe aktar
import {
  getAppointmentSlotById,
  AppointmentSlot,
  Appointment,
} from "@/lib/appointment-slot-service";
import { Customer } from "@/lib/customer-service";
import { getAppointmentCategories } from "@/lib/appointment-category-service";
import { getCompanies } from "@/lib/company-service";
import { getTeams } from "@/lib/team-service";
import { getUsers } from "@/lib/user-service";
import { pb } from "@/lib/pocketbase";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { toast } from "sonner";

export default function PrintPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slotId = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const customerId = searchParams.get("customerId");

  const [isLoading, setIsLoading] = useState(true);
  const [slot, setSlot] = useState<AppointmentSlot | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [agentName, setAgentName] = useState("");
  const [usersData, setUsersData] = useState<any[]>([]);
  const [usersDataResult, setUsersDataResult] = useState<any[]>([]);

  // Word dokümanı oluşturma fonksiyonu
  const generateWordDocument = async (customer?: Customer) => {
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              // Başlık
              new Paragraph({
                text: customer ? "Kunden-Detailbericht" : "Termin-Slot-Bericht",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                text: format(new Date(), "dd MMMM yyyy HH:mm", { locale: de }),
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({ text: "" }), // Boş satır

              // Slot bilgileri
              new Paragraph({
                text: "Slot-Informationen",
                heading: HeadingLevel.HEADING_2,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Slot-Name: ", bold: true }),
                  new TextRun({ text: slot?.name || "-" }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Datum: ", bold: true }),
                  new TextRun({ text: slot ? format(new Date(slot.date), "dd MMMM yyyy", { locale: de }) : "-" }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Uhrzeit: ", bold: true }),
                  new TextRun({ text: slot ? `${slot.start}:00 - ${slot.end}:00` : "-" }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Kategorie: ", bold: true }),
                  new TextRun({ text: categoryName }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Firma: ", bold: true }),
                  new TextRun({ text: companyName }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Teams: ", bold: true }),
                  new TextRun({ text: teamNames.join(", ") }),
                ],
              }),
              new Paragraph({ text: "" }), // Boş satır

              // Termin istatistikleri (tüm müşteriler için)
              ...(!customer ? [
                new Paragraph({
                  text: "Termin-Statistiken",
                  heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Gesamtzahl der Termine: ", bold: true }),
                    new TextRun({ text: appointments.length.toString() }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Zugewiesene Termine: ", bold: true }),
                    new TextRun({ text: appointments.filter((a) => a.status !== "empty").length.toString() }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Freie Termine: ", bold: true }),
                    new TextRun({ text: appointments.filter((a) => a.status === "empty").length.toString() }),
                  ],
                }),
                new Paragraph({ text: "" }), // Boş satır
              ] : []),

              // Müşteri bilgileri (eğer tek müşteri seçilmişse)
              ...(customer ? [
                new Paragraph({
                  text: "Basisinformationen",
                  heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Vorname: ", bold: true }),
                    new TextRun({ text: customer.name || "-" }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Nachname: ", bold: true }),
                    new TextRun({ text: customer.surname || "-" }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Telefon: ", bold: true }),
                    new TextRun({ text: customer.tel || "-" }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "E-Mail: ", bold: true }),
                    new TextRun({ text: customer.email || "-" }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Alter: ", bold: true }),
                    new TextRun({ text: customer.age?.toString() || "-" }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Agent: ", bold: true }),
                    new TextRun({ text: agentName || "-" }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Termin-Slot: ", bold: true }),
                    new TextRun({ text: slot?.name || "-" }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Termin-Datum: ", bold: true }),
                    new TextRun({ text: slot ? format(new Date(slot.date), "dd MMMM yyyy", { locale: de }) : "-" }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Termin-Uhrzeit: ", bold: true }),
                    new TextRun({ 
                      text: (() => {
                        const customerAppointment = appointments.find(app => app.customer === customer.id);
                        return customerAppointment ? customerAppointment.name : `${slot?.start}:00 - ${slot?.end}:00`;
                      })()
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Kategorie: ", bold: true }),
                    new TextRun({ text: categoryName }),
                  ],
                }),
                new Paragraph({ text: "" }), // Boş satır

                new Paragraph({
                  text: "Kontaktdaten",
                  heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Heimtelefon: ", bold: true }),
                    new TextRun({ text: customer.home_tel || "-" }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Standort: ", bold: true }),
                    new TextRun({ text: customer.location || "-" }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Straße: ", bold: true }),
                    new TextRun({ text: customer.street || "-" }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Postleitzahl: ", bold: true }),
                    new TextRun({ text: customer.postal_code || "-" }),
                  ],
                }),
                new Paragraph({ text: "" }), // Boş satır

                new Paragraph({
                  text: "Persönliche Informationen",
                  heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Anzahl der Personen im Haushalt: ", bold: true }),
                    new TextRun({ text: customer.home_people_number?.toString() || "-" }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Wer ist der Kunde: ", bold: true }),
                    new TextRun({ text: customer.who_is_customer || "-" }),
                  ],
                }),
                new Paragraph({ text: "" }), // Boş satır

                new Paragraph({
                  text: "Dachinformationen",
                  heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Dachtyp: ", bold: true }),
                    new TextRun({ text: customer.roof_type || "-" }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Dachansicht: ", bold: true }),
                    new TextRun({ text: customer.roof || "-" }),
                  ],
                }),
                ...(customer.roof ? [
                  new Paragraph({ text: "" }),
                  new Paragraph({
                    text: "Dachbild-URL:",
                    heading: HeadingLevel.HEADING_3,
                  }),
                  new Paragraph({ 
                    text: `https://sbapi.yezuri.com/api/files/customers/${customer.id}/${customer.roof}` 
                  }),
                ] : []),
                new Paragraph({ text: "" }), // Boş satır

                ...(customer.note ? [
                  new Paragraph({
                    text: "Notiz",
                    heading: HeadingLevel.HEADING_2,
                  }),
                  new Paragraph({ text: customer.note }),
                  new Paragraph({ text: "" }), // Boş satır
                ] : []),

                new Paragraph({
                  text: "Gesprochene Punkte",
                  heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({ text: customer.what_talked || "-" }),
                new Paragraph({ text: "" }), // Boş satır

                new Paragraph({
                  text: "QC-Notiz",
                  heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({ text: customer.qc_note || "-" }),
              ] : []),

              // Tüm müşteriler listesi (eğer tek müşteri seçilmemişse)
              ...(!customer && slotAssignedCustomers.length > 0 ? [
                new Paragraph({
                  text: "Kundendetails",
                  heading: HeadingLevel.HEADING_2,
                }),
                ...slotAssignedCustomers.flatMap((customer, index) => [
                  new Paragraph({
                    text: `${index + 1}. Kunde: ${customer.name} ${customer.surname || ""}`,
                    heading: HeadingLevel.HEADING_3,
                  }),
                  
                  new Paragraph({
                    text: "Basisinformationen:",
                    heading: HeadingLevel.HEADING_4,
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Vorname: ", bold: true }),
                      new TextRun({ text: customer.name || "-" }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Nachname: ", bold: true }),
                      new TextRun({ text: customer.surname || "-" }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Telefon: ", bold: true }),
                      new TextRun({ text: customer.tel || "-" }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "E-Mail: ", bold: true }),
                      new TextRun({ text: customer.email || "-" }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Alter: ", bold: true }),
                      new TextRun({ text: customer.age?.toString() || "-" }),
                    ],
                  }),
                  new Paragraph({ text: "" }), // Boş satır

                  new Paragraph({
                    text: "Kontaktdaten:",
                    heading: HeadingLevel.HEADING_4,
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Heimtelefon: ", bold: true }),
                      new TextRun({ text: customer.home_tel || "-" }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Standort: ", bold: true }),
                      new TextRun({ text: customer.location || "-" }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Straße: ", bold: true }),
                      new TextRun({ text: customer.street || "-" }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Postleitzahl: ", bold: true }),
                      new TextRun({ text: customer.postal_code || "-" }),
                    ],
                  }),
                  new Paragraph({ text: "" }), // Boş satır

                  new Paragraph({
                    text: "Termin-Informationen:",
                    heading: HeadingLevel.HEADING_4,
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Agent: ", bold: true }),
                      new TextRun({ 
                        text: customer.agent ? 
                          (customer.expand?.agent ? 
                            customer.expand.agent.name : 
                            (() => {
                              const agent = usersDataResult.find((u: any) => u.id === customer.agent);
                              return agent?.name || "Unbekannt";
                            })()
                          ) : "-"
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Termin-Slot: ", bold: true }),
                      new TextRun({ text: slot?.name || "-" }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Termin-Datum: ", bold: true }),
                      new TextRun({ text: slot ? format(new Date(slot.date), "dd MMMM yyyy", { locale: de }) : "-" }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Termin-Uhrzeit: ", bold: true }),
                      new TextRun({ 
                        text: (() => {
                          const customerAppointment = appointments.find(app => app.customer === customer.id);
                          return customerAppointment ? customerAppointment.name : `${slot?.start}:00 - ${slot?.end}:00`;
                        })()
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Kategorie: ", bold: true }),
                      new TextRun({ text: categoryName }),
                    ],
                  }),
                  new Paragraph({ text: "" }), // Boş satır

                  new Paragraph({
                    text: "Persönliche Informationen:",
                    heading: HeadingLevel.HEADING_4,
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Anzahl der Personen im Haushalt: ", bold: true }),
                      new TextRun({ text: customer.home_people_number?.toString() || "-" }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Wer ist der Kunde: ", bold: true }),
                      new TextRun({ text: customer.who_is_customer || "-" }),
                    ],
                  }),
                  new Paragraph({ text: "" }), // Boş satır

                  new Paragraph({
                    text: "Dachinformationen:",
                    heading: HeadingLevel.HEADING_4,
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Dachtyp: ", bold: true }),
                      new TextRun({ text: customer.roof_type || "-" }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Dachansicht: ", bold: true }),
                      new TextRun({ text: customer.roof || "-" }),
                    ],
                  }),
                  ...(customer.roof ? [
                    new Paragraph({ text: "" }),
                    new Paragraph({
                      text: "Dachbild-URL:",
                      heading: HeadingLevel.HEADING_4,
                    }),
                    new Paragraph({ 
                      text: `https://sbapi.yezuri.com/api/files/customers/${customer.id}/${customer.roof}` 
                    }),
                  ] : []),
                  new Paragraph({ text: "" }), // Boş satır

                  ...(customer.note ? [
                    new Paragraph({
                      text: "Notiz:",
                      heading: HeadingLevel.HEADING_4,
                    }),
                    new Paragraph({ text: customer.note }),
                    new Paragraph({ text: "" }), // Boş satır
                  ] : []),

                  new Paragraph({
                    text: "Gesprochene Punkte:",
                    heading: HeadingLevel.HEADING_4,
                  }),
                  new Paragraph({ text: customer.what_talked || "-" }),
                  new Paragraph({ text: "" }), // Boş satır

                  new Paragraph({
                    text: "QC-Notiz:",
                    heading: HeadingLevel.HEADING_4,
                  }),
                  new Paragraph({ text: customer.qc_note || "-" }),
                  new Paragraph({ text: "" }), // Müşteriler arası boşluk
                ]),
              ] : []),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = customer ? 
        `kunde_${customer.name}_${customer.surname || ''}.docx` : 
        `slot_${slot?.name || 'bericht'}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Word dokümanı başarıyla indirildi.");
    } catch (error) {
      console.error("Word dokümanı oluşturma hatası:", error);
      toast.error("Word dokümanı oluşturulurken bir hata oluştu.");
    }
  };

  // Daten laden
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const slotData = await getAppointmentSlotById(slotId).catch((error) => {
          console.error("Fehler beim Abrufen des Slots:", error); // Çeviri
          return null;
        });

        if (!slotData) {
          console.error("Slot nicht gefunden"); // Çeviri
          return;
        }

        setSlot(slotData);

        const [categoriesData, companiesData, teamsData, usersDataResult] =
          await Promise.all([
            getAppointmentCategories().catch(() => []),
            getCompanies().catch(() => []),
            getTeams().catch(() => []),
            getUsers().catch(() => []),
          ]);

        // Customer verilerini doğrudan PocketBase'den al
        console.log("Fetching customers directly from PocketBase...");
        const customersResponse = await pb.collection('customers').getList(1, 50, {
          sort: '-created',
          expand: 'agent',
        });
        const customersData = customersResponse.items as unknown as Customer[];
        console.log("Direct customers response:", customersData);
        console.log("First customer expand:", customersData[0]?.expand);



        setUsersData(usersDataResult);
        setUsersDataResult(usersDataResult);

        const category = categoriesData.find((c) => c.id === slotData.category);
        setCategoryName(category?.name || "Unbekannt"); // Çeviri

        const company = companiesData.find((c) => c.id === slotData.company);
        setCompanyName(company?.name || "Unbekannt"); // Çeviri

        const teams = teamsData.filter((t) => slotData.team.includes(t.id));
        setTeamNames(teams.map((t) => t.name));

        setCustomers(customersData);
        
        // Debug: Customer verilerini kontrol et
        console.log("Loaded customers:", customersData);
        console.log("First customer expand:", customersData[0]?.expand);
        console.log("First customer agent:", customersData[0]?.agent);

        if (slotData.expand?.appointments) {
          setAppointments(slotData.expand.appointments);
        }

        // Her müşteri için appointment bilgisini bul
        const customerAppointmentMap = new Map<string, Appointment>();
        if (slotData.expand?.appointments) {
          slotData.expand.appointments.forEach(appointment => {
            if (appointment.customer) {
              customerAppointmentMap.set(appointment.customer, appointment);
            }
          });
        }

        // Agent bilgilerini yükle
        const customerAgentMap = new Map<string, string>();
        customersData.forEach(customer => {
          if (customer.agent) {
            const agent = usersDataResult.find((u: any) => u.id === customer.agent);
            customerAgentMap.set(customer.id, agent?.name || "Unbekannt");
          }
        });

        if (customerId) {
          const customer = customersData.find((c) => c.id === customerId);
          if (customer) {
            setSelectedCustomer(customer);
            
                    // Agent bilgisini bul
        if (customer.agent) {
          console.log("Customer agent ID:", customer.agent);
          console.log("Customer expand:", customer.expand);
          
          // Customer'ın expand edilmiş agent bilgisini kullan
          if (customer.expand?.agent) {
            console.log("Found agent in expand:", customer.expand.agent);
            setAgentName(customer.expand.agent.name || "Unbekannt");
          } else {
            console.log("Agent not found in expand, searching in users list");
            // Fallback olarak users listesinden bul
            const agent = usersDataResult.find((u: any) => u.id === customer.agent);
            console.log("Found agent in users list:", agent);
            setAgentName(agent?.name || "Unbekannt");
          }
        } else {
          console.log("No agent assigned to customer");
        }
          }
        }
      } catch (error) {
        console.error("Fehler beim Laden der Daten:", error); // Çeviri
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [slotId, customerId]);

  // Druckdialog automatisch öffnen, wenn die Seite geladen ist
  useEffect(() => {
    if (!isLoading && (slot || selectedCustomer)) {
      const printTimer = setTimeout(() => {
        const images = document.querySelectorAll("img");
        let allImagesLoaded = true;

        images.forEach((img) => {
          if (!img.complete) {
            allImagesLoaded = false;
          }
        });

        if (allImagesLoaded) {
          window.print();
        } else {
          setTimeout(() => window.print(), 2000); // Zusätzliche Wartezeit
        }
      }, 2000); // Ursprüngliche Verzögerung, damit Seiteninhalt gerendert wird

      return () => clearTimeout(printTimer);
    }
  }, [isLoading, slot, selectedCustomer]);

  const renderRoofImage = (customer: Customer) => (
    <div className="mb-4 avoid-break">
      <div className="bg-gray-200 p-2 mb-4">
        <h4 className="font-bold">Dachansicht</h4> {/* Çeviri */}
      </div>

      <div className="flex flex-col items-center">
        <div className="w-full border-2 border-gray-300 p-4 rounded-lg mb-4">
          <div className="text-center mb-2">
            <strong>Dachansicht</strong> {/* Çeviri */}
          </div>

          <a
            href={`https://sbapi.yezuri.com/api/files/customers/${customer.id}/${customer.roof}`}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer block"
          >
            <img
              src={`https://sbapi.yezuri.com/api/files/customers/${customer.id}/${customer.roof}`}
              alt="Dachansicht" // Çeviri
              className="max-w-full w-full max-h-[400px] object-contain border border-gray-300 p-2 hover:border-blue-500 mx-auto"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const errorElement = document.createElement("div");
                errorElement.className =
                  "text-red-500 p-8 border-2 border-red-300 bg-red-50 rounded text-center my-4";
                errorElement.innerHTML = `
                  <p class="text-xl font-bold mb-2">Bild konnte nicht geladen werden!</p> {/* Çeviri */}
                  <p class="mb-4">Beim Laden des Dachbildes ist ein Problem aufgetreten.</p> {/* Çeviri */}
                  <a href="https://sbapi.yezuri.com/api/files/customers/${customer.id}/${customer.roof}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-block">
                    Bild im Browser öffnen {/* Çeviri */}
                  </a>
                `;
                e.currentTarget.parentNode?.appendChild(errorElement);
              }}
            />
          </a>

          <div className="text-center mt-4">
            <a
              href={`https://sbapi.yezuri.com/api/files/customers/${customer.id}/${customer.roof}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-block"
            >
              Bild in voller Größe öffnen {/* Çeviri */}
            </a>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          URL: https://sbapi.yezuri.com/api/files/customers/{customer.id}/
          {customer.roof}
        </p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl">Wird geladen...</p> {/* Çeviri */}
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-500">Slot nicht gefunden</h1> {/* Çeviri */}
        <p className="mt-2">Der gewünschte Terminslot wurde nicht gefunden oder wurde möglicherweise gelöscht.</p> {/* Çeviri */}
      </div>
    );
  }

  const slotAssignedAppointments = appointments.filter((a) => a.status !== "empty");
  const slotAssignedCustomers = slotAssignedAppointments
    .map((app) => customers.find((c) => c.id === app.customer))
    .filter((customer): customer is Customer => customer !== undefined);

  return (
    <>
      {/* --- Druck- und Bildschirmstile --- */}
      <style jsx global>{`
        @media print {
          /* Druckeinstellungen: Hintergrundfarben und Ränder vollständig drucken */
          body {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            margin: 0;
            padding: 0;
            width: 100%;
            height: auto !important; /* Höhe automatisch für den gesamten Inhalt */
            overflow: visible !important; /* Überlauf sichtbar machen */
          }

          /* Seiteneinstellungen */
          @page {
            size: auto; /* Automatische Größe gemäß Drucker */
            margin: 1cm; /* Seitenränder */
          }

          /* Überlauf- und Höheneinstellungen für allgemeine Elemente */
          html,
          .container,
          main,
          .main-content,
          .content,
          [role="main"],
          #main,
          #content,
          .content-wrapper,
          .main-wrapper,
          .page-content,
          div, p, span, section, article {
            height: auto !important;
            overflow: visible !important;
            max-height: none !important; /* Jegliche maximale Höhenbeschränkung entfernen */
            width: 100% !important; /* Breite 100% setzen */
            position: relative !important; /* Probleme mit fest/absolut positionierten Elementen verhindern */
            transform: none !important; /* Transformationswerte zurücksetzen */
            box-sizing: border-box; /* Box-Modell beibehalten */
          }

          /* Standard-Padding und -Margin von Tailwind im Druckmodus zurücksetzen/reduzieren */
          /* Dies ist entscheidend, um UI-Verzerrungen zu reduzieren. */
          .p-6, .px-6, .py-6 {
              padding: 0 !important; /* Allgemeine Paddings zurücksetzen */
          }
          .mb-6, .mt-6 {
              margin-bottom: 0.5rem !important; /* Weniger Abstand */
              margin-top: 0.5rem !important;
          }

          /* Padding und Margin innerhalb der Kundenkarte ausgeglichener gestalten */
          .customer-card .p-4 {
              padding: 0.75rem !important; /* Kleineres Padding lassen */
          }
          .customer-card .p-2 {
              padding: 0.3rem !important; /* Kleineres Padding lassen */
          }
          .customer-card .mb-8 {
            margin-bottom: 1.5rem !important; /* Weniger Abstand zwischen den Karten */
          }

          /* Spezielle Einstellungen für Flex- und Grid-Layouts */
          .grid, .flex {
            display: block !important; /* Sicherstellen, dass sie im Druckmodus als Blockelemente fungieren */
            overflow: visible !important;
            height: auto !important;
            width: 100% !important; /* Innerhalb ihres Elternelements 100% Breite einnehmen */
            gap: 0 !important; /* Grid/Flex-Lücken zurücksetzen */
          }
          /* Grid-Spalten im Druck auf eine einzige Spalte reduzieren */
          .grid-cols-2 {
            grid-template-columns: 1fr !important; /* 2-spaltiges Raster auf eine Spalte reduzieren */
            display: block !important; /* Spalten untereinander anordnen */
          }
          .grid-cols-3 {
            grid-template-columns: 1fr !important;
            display: block !important;
          }

          /* Verhindern, dass Überschriften am Seitenende umbrechen */
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Sicherstellen, dass Bilder innerhalb der Seite bleiben und ihre Breite angepasst wird */
          img {
            max-width: 100% !important;
            height: auto !important;
            page-break-inside: avoid !important;
          }

          /* Seitenumbruchregeln */
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Im Druckmodus nicht sichtbare Elemente ausblenden */
          .no-print,
          header, nav, aside, .sidebar, .navbar, .header, .footer,
          [role="banner"], [role="navigation"], [role="complementary"],
          [data-testid="header"], [data-testid="sidebar"],
          #header, #sidebar, #nav, #navigation, #menu,
          #search, #searchbar, #profile, #user-profile, #user-menu, #user-dropdown,
          .search-bar, .search-container, .profile-container, .user-avatar,
          .top-bar, .app-header, .app-sidebar, .main-header, .main-sidebar {
            display: none !important;
          }

          /* Seitenumbruch zwischen Kundenkarten hinzufügen */
          .customer-card {
            page-break-after: always !important;
            break-after: page !important;
          }

          /* Nach der letzten Kundenkarte keinen Seitenumbruch */
          .customer-card:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
            margin-bottom: 0 !important; /* Kein Abstand nach der letzten Karte */
          }
        }

        /* --- Nur Bildschirmansicht Stile --- */
        @media screen {
          html, body {
            height: 100%;
            overflow-y: auto; /* Scrollbar auf dem Bildschirm aktivieren */
          }
          .container {
              max-width: 960px; /* Ein Wert, der max-w-4xl auf dem Bildschirm entspricht */
              margin-left: auto;
              margin-right: auto;
          }
          .p-6 { padding: 1.5rem; } /* Tailwind's Standard p-6 auf dem Bildschirm wiederherstellen */
          .mb-6 { margin-bottom: 1.5rem; }
          .mt-6 { margin-top: 1.5rem; }
          .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
          .py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
          /* Bei Bedarf können Sie hier weitere Tailwind-Klassen hinzufügen */
        }
      `}</style>

      {/* --- Drucktaste (Nur auf dem Bildschirm sichtbar) --- */}
      <div className="flex justify-between items-center mb-6 no-print container mx-auto p-6 max-w-4xl">
        <a
          href={`/dashboard/randevu-slotlari/${slotId}`}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Zurück {/* Çeviri */}
        </a>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold text-lg flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            PDF Yazdır
          </button>
          <button
            onClick={() => generateWordDocument(selectedCustomer || undefined)}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold text-lg flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Word İndir
          </button>
        </div>
      </div>

      {/* --- Kunden-Detailbericht (Wenn bestimmter Kunde ausgewählt ist) --- */}
      {selectedCustomer && (
        <div className="container mx-auto p-6 max-w-4xl print:p-0 print-layout">
          {/* Überschrift */}
          <div className="bg-blue-500 text-white p-6 mb-6">
            <h1 className="text-2xl font-bold">Kunden-Detailbericht</h1> {/* Çeviri */}
            <p className="text-sm mt-2">
              {format(new Date(), "dd MMMM yyyy HH:mm", { locale: de })} {/* locale: de */}
            </p>
          </div>

          {/* Kundeninformationen */}
          <div className="mb-8">
            <div className="bg-gray-200 p-2 mb-4">
              <h2 className="text-xl font-bold">Basisinformationen</h2> {/* Çeviri */}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p>
                  <strong>Vorname:</strong> {selectedCustomer.name || "-"} {/* Çeviri */}
                </p>
                <p>
                  <strong>Nachname:</strong> {selectedCustomer.surname || "-"} {/* Çeviri */}
                </p>
                <p>
                  <strong>Telefon:</strong> {selectedCustomer.tel || "-"} {/* Çeviri */}
                </p>
                <p>
                  <strong>E-Mail:</strong> {selectedCustomer.email || "-"} {/* Çeviri */}
                </p>
                <p>
                  <strong>Alter:</strong> {selectedCustomer.age || "-"} {/* Çeviri */}
                </p>
              </div>
              <div>
                <p>
                  <strong>Agent:</strong> {agentName || "-"} {/* Çeviri */}
                </p>
                <p>
                  <strong>Termin-Slot:</strong> {slot.name} {/* Çeviri */}
                </p>
                <p>
                  <strong>Termin-Datum:</strong>{" "} {/* Çeviri */}
                  {format(new Date(slot.date), "dd MMMM yyyy", { locale: de })}
                </p>
                <p>
                  <strong>Termin-Uhrzeit:</strong>{" "}
                  {(() => {
                    // Müşterinin appointment'ını bul
                    const customerAppointment = appointments.find(app => app.customer === selectedCustomer.id);
                    return customerAppointment ? customerAppointment.name : `${slot.start}:00 - ${slot.end}:00`;
                  })()}
                </p>
                <p>
                  <strong>Kategorie:</strong> {categoryName} {/* Çeviri */}
                </p>
              </div>
            </div>

            <div className="bg-gray-200 p-2 mb-4">
              <h2 className="text-xl font-bold">Kontaktdaten</h2> {/* Çeviri */}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p>
                  <strong>Heimtelefon:</strong> {selectedCustomer.home_tel || "-"} {/* Çeviri */}
                </p>
                <p>
                  <strong>Standort:</strong> {selectedCustomer.location || "-"} {/* Çeviri */}
                </p>
                <p>
                  <strong>Straße:</strong> {selectedCustomer.street || "-"} {/* Çeviri */}
                </p>
                <p>
                  <strong>Postleitzahl:</strong> {selectedCustomer.postal_code || "-"} {/* Çeviri */}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <div className="bg-gray-200 p-2 mb-4">
                  <h2 className="text-xl font-bold">Persönliche Informationen</h2> {/* Çeviri */}
                </div>
                <p>
                  <strong>Anzahl der Personen im Haushalt:</strong>{" "} {/* Çeviri */}
                  {selectedCustomer.home_people_number || "-"}
                </p>
                <p>
                  <strong>Wer ist der Kunde:</strong>{" "} {/* Çeviri */}
                  {selectedCustomer.who_is_customer || "-"}
                </p>
              </div>

              <div>
                <div className="bg-gray-200 p-2 mb-4">
                  <h2 className="text-xl font-bold">Dachinformationen</h2> {/* Çeviri */}
                </div>
                <p>
                  <strong>Dachtyp:</strong> {selectedCustomer.roof_type || "-"} {/* Çeviri */}
                </p>
                <p>
                  <strong>Dachansicht:</strong>{" "} {/* Çeviri */}
                  {selectedCustomer.roof ? (
                    <a
                      href={`https://sbapi.yezuri.com/api/files/customers/${selectedCustomer.id}/${selectedCustomer.roof}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      {selectedCustomer.roof}
                    </a>
                  ) : (
                    "-"
                  )}
                </p>
              </div>
            </div>

            {selectedCustomer.roof && renderRoofImage(selectedCustomer)}

            {selectedCustomer.note && (
              <div className="mb-6">
                <div className="bg-gray-200 p-2 mb-4">
                  <h2 className="text-xl font-bold">Notiz</h2> {/* Çeviri */}
                </div>
                <p className="whitespace-pre-wrap">{selectedCustomer.note}</p>
              </div>
            )}

            <div className="mb-6">
              <div className="bg-gray-200 p-2 mb-4">
                <h2 className="text-xl font-bold">Gesprochene Punkte</h2> {/* Çeviri */}
              </div>
              <p className="whitespace-pre-wrap">{selectedCustomer.what_talked || "-"}</p>
            </div>

            <div className="mb-6">
              <div className="bg-gray-200 p-2 mb-4">
                <h2 className="text-xl font-bold">QC-Notiz</h2> {/* Çeviri */}
              </div>
              <p className="whitespace-pre-wrap">{selectedCustomer.qc_note || "-"}</p>
            </div>
          </div>

          {/* Fußzeile */}
          <div className="bg-blue-500 text-white p-4 mt-8">
            <p className="text-sm">
              {slot.name} -{" "}
              {format(new Date(slot.date), "dd MMMM yyyy", { locale: de })} {/* locale: de */}
            </p>
          </div>
        </div>
      )}

      {/* --- Termin-Slot-Bericht (Wenn alle Kunden aufgelistet sind) --- */}
      {!selectedCustomer && (
        <div className="container mx-auto p-6 max-w-4xl print:p-0 print-layout">
          {/* Überschrift */}
          <div className="bg-blue-500 text-white p-6 mb-6">
            <h1 className="text-2xl font-bold">Termin-Slot-Bericht</h1> {/* Çeviri */}
            <p className="text-sm mt-2">
              {format(new Date(), "dd MMMM yyyy HH:mm", { locale: de })} {/* locale: de */}
            </p>
          </div>

          {/* Slot-Informationen */}
          <div className="mb-8">
            <div className="bg-gray-200 p-2 mb-4">
              <h2 className="text-xl font-bold">Slot-Informationen</h2> {/* Çeviri */}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p>
                  <strong>Slot-Name:</strong> {slot.name} {/* Çeviri */}
                </p>
                <p>
                  <strong>Datum:</strong>{" "} {/* Çeviri */}
                  {format(new Date(slot.date), "dd MMMM yyyy", { locale: de })} {/* locale: de */}
                </p>
                <p>
                  <strong>Uhrzeit:</strong> {slot.start}:00 - {slot.end}:00 {/* Çeviri */}
                </p>
              </div>
              <div>
                <p>
                  <strong>Kategorie:</strong> {categoryName} {/* Çeviri */}
                </p>
                <p>
                  <strong>Firma:</strong> {companyName} {/* Çeviri */}
                </p>
                <p>
                  <strong>Teams:</strong> {teamNames.join(", ")} {/* Çeviri */}
                </p>
              </div>
            </div>
          </div>

          {/* Termin-Statistiken */}
          <div className="mb-8">
            <div className="bg-gray-200 p-2 mb-4">
              <h2 className="text-xl font-bold">Termin-Statistiken</h2> {/* Çeviri */}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-100 p-4 text-center">
                <h3 className="text-2xl font-bold">{appointments.length}</h3>
                <p className="text-sm">Gesamtzahl der Termine</p> {/* Çeviri */}
              </div>
              <div className="bg-gray-100 p-4 text-center">
                <h3 className="text-2xl font-bold">
                  {appointments.filter((a) => a.status !== "empty").length}
                </h3>
                <p className="text-sm">Zugewiesene Termine</p> {/* Çeviri */}
              </div>
              <div className="bg-gray-100 p-4 text-center">
                <h3 className="text-2xl font-bold">
                  {appointments.filter((a) => a.status === "empty").length}
                </h3>
                <p className="text-sm">Freie Termine</p> {/* Çeviri */}
              </div>
            </div>
          </div>

          {/* Kundendetails */}
          {slotAssignedCustomers.length > 0 && (
            <div className="mb-8">
              <div className="bg-gray-200 p-2 mb-4 avoid-break">
                <h2 className="text-xl font-bold">Kundendetails</h2> {/* Çeviri */}
              </div>

              {slotAssignedCustomers.map((customer, index) => (
                <div key={customer.id} className="customer-card">
                  {/* Wichtige Korrektur: Zusätzliches manuelles Seitenumbruch-Div entfernt */}
                  <div className="mb-8 border p-4 rounded avoid-break">
                    <h3 className="text-xl font-bold mb-4 bg-blue-500 text-white p-2">
                      {index + 1}. Kunde: {customer.name}{" "} {/* Çeviri */}
                      {customer.surname || ""}
                    </h3>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-bold mb-2">Basisinformationen:</h4> {/* Çeviri */}
                        <p>
                          <strong>Vorname:</strong> {customer.name || "-"} {/* Çeviri */}
                        </p>
                        <p>
                          <strong>Nachname:</strong> {customer.surname || "-"} {/* Çeviri */}
                        </p>
                        <p>
                          <strong>Telefon:</strong> {customer.tel || "-"} {/* Çeviri */}
                        </p>
                        <p>
                          <strong>E-Mail:</strong> {customer.email || "-"} {/* Çeviri */}
                        </p>
                        <p>
                          <strong>Alter:</strong> {customer.age || "-"} {/* Çeviri */}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold mb-2">Kontaktdaten:</h4> {/* Çeviri */}
                        <p>
                          <strong>Heimtelefon:</strong> {customer.home_tel || "-"} {/* Çeviri */}
                        </p>
                        <p>
                          <strong>Standort:</strong> {customer.location || "-"} {/* Çeviri */}
                        </p>
                        <p>
                          <strong>Straße:</strong> {customer.street || "-"} {/* Çeviri */}
                        </p>
                        <p>
                          <strong>Postleitzahl:</strong> {customer.postal_code || "-"} {/* Çeviri */}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-bold mb-2">Termin-Informationen:</h4> {/* Çeviri */}
                        <p>
                          <strong>Agent:</strong>{" "}
                          {customer.agent ? (
                            customer.expand?.agent ? 
                              customer.expand.agent.name : 
                              (() => {
                                console.log("Customer in list - agent ID:", customer.agent);
                                console.log("Customer in list - expand:", customer.expand);
                                const agent = usersDataResult.find((u: any) => u.id === customer.agent);
                                console.log("Found agent in users list for list:", agent);
                                return agent?.name || "Unbekannt";
                              })()
                          ) : "-"}
                        </p>
                        <p>
                          <strong>Termin-Slot:</strong> {slot.name}
                        </p>
                        <p>
                          <strong>Termin-Datum:</strong>{" "}
                          {format(new Date(slot.date), "dd MMMM yyyy", { locale: de })}
                        </p>
                        <p>
                          <strong>Termin-Uhrzeit:</strong>{" "}
                          {(() => {
                            // Müşterinin appointment'ını bul
                            const customerAppointment = appointments.find(app => app.customer === customer.id);
                            return customerAppointment ? customerAppointment.name : `${slot.start}:00 - ${slot.end}:00`;
                          })()}
                        </p>
                        <p>
                          <strong>Kategorie:</strong> {categoryName}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-bold mb-2">Persönliche Informationen:</h4> {/* Çeviri */}
                        <p>
                          <strong>Anzahl der Personen im Haushalt:</strong>{" "} {/* Çeviri */}
                          {customer.home_people_number || "-"}
                        </p>
                        <p>
                          <strong>Wer ist der Kunde:</strong>{" "} {/* Çeviri */}
                          {customer.who_is_customer || "-"}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold mb-2">Dachinformationen:</h4> {/* Çeviri */}
                        <p>
                          <strong>Dachtyp:</strong> {customer.roof_type || "-"} {/* Çeviri */}
                        </p>
                        <p>
                          <strong>Dachansicht:</strong>{" "} {/* Çeviri */}
                          {customer.roof ? (
                            <a
                              href={`https://sbapi.yezuri.com/api/files/customers/${customer.id}/${customer.roof}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 underline"
                            >
                              Bild anzeigen {/* Çeviri */}
                            </a>
                          ) : (
                            "-"
                          )}
                        </p>
                      </div>
                    </div>

                    {customer.roof && renderRoofImage(customer)}

                    {customer.note && (
                      <div className="avoid-break">
                        <h4 className="font-bold mb-2">Notiz:</h4> {/* Çeviri */}
                        <p className="whitespace-pre-wrap">{customer.note}</p>
                      </div>
                    )}

                    <div className="avoid-break">
                      <h4 className="font-bold mb-2">Gesprochene Punkte:</h4> {/* Çeviri */}
                      <p className="whitespace-pre-wrap">{customer.what_talked || "-"}</p>
                    </div>

                    <div className="avoid-break">
                      <h4 className="font-bold mb-2">QC-Notiz:</h4> {/* Çeviri */}
                      <p className="whitespace-pre-wrap">{customer.qc_note || "-"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fußzeile */}
          <div className="bg-blue-500 text-white p-4 mt-8">
            <p className="text-sm">
              {slot.name} -{" "}
              {format(new Date(slot.date), "dd MMMM yyyy", { locale: de })} {/* locale: de */}
            </p>
          </div>
        </div>
      )}
    </>
  );
}