"use client";

import { useEffect, useState } from "react";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { de } from "date-fns/locale"; // Changed to German locale
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Loader2, Clock, Users, Tag, UserPlus, ChevronDown, ChevronUp, GripHorizontal, GripVertical, MoreHorizontal } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CustomerForm } from "@/components/customers/customer-form";
import { AppointmentSlot, getAppointmentSlots, Appointment, assignCustomerToAppointment, updateAppointment, approveAppointment } from "@/lib/appointment-slot-service";
import { getAppointmentCategories, AppointmentCategory } from "@/lib/appointment-category-service";
import { pb } from "@/lib/pocketbase";
import { useAuth } from "@/hooks/use-auth";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, useDraggable, useDroppable, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";

// Kundenkarten-Komponente
function CustomerCard({ customer, isDragging = false }: { customer: any, isDragging?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${isDragging ? 'bg-background border rounded-md px-2 py-1 shadow-lg' : ''}`}>
      <span className="font-medium truncate">
        {customer.postal_code && customer.surname ? 
          `${customer.postal_code} ${customer.surname}` : 
          customer.name || 'Kunde'
        }
      </span>
      {!isDragging && (
        <GripHorizontal className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      )}
    </div>
  );
}

// Ziehbare Kundenkomponente
function DraggableCustomer({ appointment, children }: { appointment: any, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `customer-${appointment.id}`,
    data: {
      type: 'customer',
      appointment: appointment
    }
  });

  return (
    <div 
      ref={setNodeRef} 
      {...attributes} 
      {...listeners}
      className={`relative ${isDragging ? 'opacity-50' : ''}`}
    >
      {children}
    </div>
  );
}

// Ziehbare Slot-Karte Komponente
function DraggableSlot({ slot, children }: { slot: any, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `slot-${slot.id}`,
    data: {
      type: 'slot',
      slot: slot
    }
  });

  return (
    <div 
      ref={setNodeRef} 
      {...attributes} 
      {...listeners}
      className={`relative ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}

// Ablegbare Tageskomponente
function DroppableDay({ day, children }: { day: Date, children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${format(day, 'yyyy-MM-dd')}`,
    data: {
      type: 'day',
      date: day
    }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`min-h-[300px] border rounded-lg p-2 overflow-y-auto ${isOver ? 'bg-secondary/10' : ''}`}
    >
      {children}
    </div>
  );
}

// Ablegbare Terminkomponente
function DroppableAppointment({ appointment, children }: { appointment: any, children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `appointment-${appointment.id}`,
    data: {
      type: 'appointment',
      appointment: appointment
    }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`relative ${isOver ? 'bg-secondary/20' : ''}`}
    >
      {children}
    </div>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [categories, setCategories] = useState<AppointmentCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all_categories");
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  
  // States für den Kundenerstellungsdialog
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [collapsedSlots, setCollapsedSlots] = useState<Record<string, boolean>>({});
  const [activeCustomer, setActiveCustomer] = useState<any>(null);
  const [activeSlot, setActiveSlot] = useState<any>(null);

  // Drag-and-Drop-Sensoren einstellen
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Wochentage erstellen
  useEffect(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    setWeekDays(days);
  }, [currentWeekStart]);

  // Daten laden
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Kategorien laden
        const categoriesData = await getAppointmentCategories();
        setCategories(categoriesData);
        
        // Slots laden
        await loadSlots();
      } catch (error) {
        console.error("Error loading calendar data:", error);
        toast.error("Beim Laden der Kalenderdaten ist ein Fehler aufgetreten.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // Echtzeit-Abonnements
    
    // Slot-Änderungen überwachen
    pb.collection('appointments_slots').subscribe('*', function(e) {
      console.log("Slot-Änderung erkannt:", e.action);
      // Daten neu laden, wenn sich Slots ändern
      loadSlots();
    }, {
      expand: 'team,category,company,appointments.customer' // Expand-Parameter hinzufügen
    });
    
    // Termin-Änderungen überwachen
    pb.collection('appointments').subscribe('*', function(e) {
      console.log("Termin-Änderung erkannt:", e.action);
      // Daten neu laden, wenn sich Termine ändern
      loadSlots();
    }, {
      expand: 'customer' // Kundeninformationen ebenfalls abrufen
    });
    
    return () => {
      // Abonnements bereinigen
      pb.collection('appointments_slots').unsubscribe();
      pb.collection('appointments').unsubscribe();
    };
  }, []);

  // Slots basierend auf Filtern laden
  const loadSlots = async () => {
    try {
      let filter = "";
      
      // Kategorie-Filter
      if (selectedCategory && selectedCategory !== "all_categories") {
        filter += `category="${selectedCategory}"`;
      }
      
      // Team-Filter (falls kullanıcının takımı varsa)
      if (user?.team) {
        if (filter) filter += " && ";
        filter += `team~"${user.team}"`;
      }
      
      const slotsData = await getAppointmentSlots(filter);
      setSlots(slotsData);
    } catch (error) {
      console.error("Error loading slots:", error);
      toast.error("Beim Laden der Slots ist ein Fehler aufgetreten.");
    }
  };

  // Slots bei Filteränderungen neu laden
  useEffect(() => {
    loadSlots();
  }, [selectedCategory]);

  // Slots für einen bestimmten Tag filtern
  const getSlotsByDay = (day: Date) => {
    return slots.filter(slot => {
      const slotDate = parseISO(slot.date);
      return isSameDay(slotDate, day);
    });
  };

  // Kategorie-Farbe finden
  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || "#808080"; // Standardgrau
  };

  // Zur vorherigen Woche wechseln
  const goToPreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  // Zur nächsten Woche wechseln
  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  // Zum heutigen Tag wechseln
  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };
  
  // Aktion bei Klick auf leeren Termin
  const handleAppointmentClick = (appointment: Appointment) => {
    // Nur leere Termine können angeklickt werden
    if (appointment.status !== 'empty') {
      return;
    }
    
    // Terminstatus auf "edit" aktualisieren
    setIsLoading(true);
    updateAppointment(appointment.id, { status: 'edit' })
      .then((updatedAppointment) => {
        if (updatedAppointment) {
          // Bei Erfolg den ausgewählten Termin setzen und den Kundendialog öffnen
          setSelectedAppointment(updatedAppointment);
          setIsCustomerDialogOpen(true);
          
          // Slot-Liste aktualisieren
          loadSlots();
        } else {
          toast.error("Beim Aktualisieren des Termins ist ein Fehler aufgetreten.");
        }
      })
      .catch((error) => {
        console.error("Error updating appointment:", error);
        toast.error("Beim Aktualisieren des Termins ist ein Fehler aufgetreten.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  // Funktion, die nach erfolgreicher Kundenerstellung aufgerufen wird
  const handleCustomerFormSuccess = async () => {
    try {
      setIsCreatingCustomer(true);
      
      // Kundenliste aktualisieren
      const updatedCustomers = await getCustomers();
      setCustomers(updatedCustomers);
      
      // Neuesten Kunden auswählen (erster Kunde in der Liste)
      if (updatedCustomers.length > 0 && selectedAppointment) {
        // Kunden dem Termin zuweisen
        const result = await assignCustomerToAppointment(selectedAppointment.id, updatedCustomers[0].id);
        
        if (result) {
          // Termin genehmigen
          const approvedAppointment = await approveAppointment(selectedAppointment.id);
          
          if (approvedAppointment) {
            toast.success("Kunde wurde erfolgreich erstellt und dem Termin zugewiesen.");
            
            // Slot-Liste aktualisieren
            await loadSlots();
          } else {
            toast.error("Beim Genehmigen des Termins ist ein Fehler aufgetreten.");
          }
        } else {
          toast.error("Beim Zuweisen des Kunden zum Termin ist ein Fehler aufgetreten.");
        }
      }
      
      // Dialog schließen
      setIsCustomerDialogOpen(false);
      setSelectedAppointment(null);
    } catch (error) {
      console.error("Error handling customer creation:", error);
      toast.error("Beim Erstellen des Kunden ist ein Fehler aufgetreten.");
    } finally {
      setIsCreatingCustomer(false);
    }
  };
  
  // Funktion, die aufgerufen wird, wenn das Kundenformular abgebrochen wird
  const handleCustomerFormCancel = async () => {
    // Wenn ein Termin ausgewählt ist, den Status auf "empty" zurücksetzen
    if (selectedAppointment) {
      try {
        await updateAppointment(selectedAppointment.id, { status: 'empty' });
        // Slot-Liste aktualisieren
        await loadSlots();
      } catch (error) {
        console.error("Error resetting appointment status:", error);
      }
    }
    
    // Dialog schließen
    setIsCustomerDialogOpen(false);
    setSelectedAppointment(null);
    setIsCreatingCustomer(false);
  };

  // Slot einklappen/ausklappen
  const toggleSlotCollapse = (slotId: string) => {
    setCollapsedSlots(prev => ({
      ...prev,
      [slotId]: !prev[slotId]
    }));
  };

  // Randevu durumunu değiştir
  const handleAppointmentStatusChange = async (appointmentId: string, newStatus: 'empty' | 'edit' | 'okay') => {
    try {
      setIsLoading(true);
      
      const updatedAppointment = await updateAppointment(appointmentId, { status: newStatus });
      
      if (updatedAppointment) {
        toast.success(`Terminstatus wurde erfolgreich auf "${newStatus}" geändert.`);
        await loadSlots();
      } else {
        toast.error("Beim Ändern des Terminstatus ist ein Fehler aufgetreten.");
      }
    } catch (error) {
      console.error("Error updating appointment status:", error);
      toast.error("Beim Ändern des Terminstatus ist ein Fehler aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  // Beim Start des Ziehens
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const dragType = (active.data?.current as any)?.type;
    
    if (dragType === 'customer') {
      const appointment = (active.data?.current as any)?.appointment;
      if (appointment?.expand?.customer) {
        setActiveCustomer(appointment.expand.customer);
      }
    } else if (dragType === 'slot') {
      const slot = (active.data?.current as any)?.slot;
      if (slot) {
        setActiveSlot(slot);
      }
    }
  };

  // Beim Ende des Ziehens
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    setActiveCustomer(null);
    setActiveSlot(null);

    if (!over) return;

    const dragType = (active.data?.current as any)?.type;

    if (dragType === 'customer') {
      // Logik für das Verschieben bestehender Kunden
      const customerId = (active.data?.current as any)?.appointment?.expand?.customer?.id;
      const sourceAppointmentId = (active.data?.current as any)?.appointment?.id;
      const targetAppointmentId = (over.data?.current as any)?.appointment?.id;

      if (!customerId || !sourceAppointmentId || !targetAppointmentId || sourceAppointmentId === targetAppointmentId) {
        return;
      }

      try {
        // Zieltermin überprüfen
        const targetAppointment = slots.flatMap(slot => 
          slot.expand?.appointments || []
        ).find(app => app.id === targetAppointmentId);

        if (!targetAppointment) return;

        // Wenn der Zieltermin nicht leer ist, den Vorgang abbrechen
        if (targetAppointment.status !== 'empty') {
          toast.error("Der Zieltermin ist belegt. Bitte wählen Sie einen leeren Termin.");
          return;
        }

        setIsLoading(true);

        // Alten Termin leeren
        await updateAppointment(sourceAppointmentId, { 
          status: 'empty',
          customer: '' 
        });

        // Neuen Termin dem Kunden zuweisen
        await assignCustomerToAppointment(targetAppointmentId, customerId);
        await approveAppointment(targetAppointmentId);

        // Slots neu laden
        await loadSlots();
        toast.success("Kunde wurde erfolgreich verschoben.");
      } catch (error) {
        console.error("Error moving customer:", error);
        toast.error("Beim Verschieben des Kunden ist ein Fehler aufgetreten.");
      } finally {
        setIsLoading(false);
      }
    } else if (dragType === 'slot') {
      // Logik für das Verschieben von Slots
      const slot = (active.data?.current as any)?.slot;
      const targetDate = (over.data?.current as any)?.date;

      if (!slot || !targetDate || isSameDay(parseISO(slot.date), targetDate)) {
        return;
      }

      try {
        setIsLoading(true);
        
        // Datum des Slots aktualisieren
        const updatedSlot = await pb.collection('appointments_slots').update(slot.id, {
          date: format(targetDate, 'yyyy-MM-dd')
        });

        if (updatedSlot) {
          toast.success("Slot wurde erfolgreich verschoben.");
          // Slots neu laden
          await loadSlots();
        }
      } catch (error) {
        console.error("Error moving slot:", error);
        toast.error("Beim Verschieben des Slots ist ein Fehler aufgetreten.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Wochenkalender</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goToPreviousWeek}>
            Vorherige Woche
          </Button>
          <Button variant="default" onClick={goToToday}>
            Heute
          </Button>
          <Button variant="outline" onClick={goToNextWeek}>
            Nächste Woche
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="w-full md:w-1/3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Kategorie filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_categories">Alle Kategorien</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    ></div>
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-full md:w-1/3">
        </div>
      </div>
      
      {/* Kundenerstellungsdialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={(open) => {
        if (!open) handleCustomerFormCancel();
      }}>
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
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Kalender wird geladen...</span>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToWindowEdges]}
        >
          <div className="grid grid-cols-7 gap-4">
            {/* Wochentagsüberschriften */}
            {weekDays.map((day, index) => (
              <div key={index} className="text-center p-2 font-medium border-b">
                <div className="text-sm text-muted-foreground">
                  {format(day, "EEEE", { locale: de })}
                </div>
                <div className="text-lg">
                  {format(day, "d. MMMM", { locale: de })}
                </div>
              </div>
            ))}
            
            {/* Tägliche Slots */}
            {weekDays.map((day, dayIndex) => {
              const daySlots = getSlotsByDay(day);
              return (
                <DroppableDay key={dayIndex} day={day}>
                  {daySlots.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Keine Slots verfügbar
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {daySlots.map((slot) => (
                        <DraggableSlot key={slot.id} slot={slot}>
                          <Card className="overflow-hidden group">
                            <div 
                              className="h-2" 
                              style={{ backgroundColor: getCategoryColor(slot.category) }}
                            ></div>
                            <CardHeader className="p-3 pl-8">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <CardTitle className="text-base">{slot.name}</CardTitle>
                                  <CardDescription className="text-xs flex flex-wrap gap-1">
                                    <span className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {format(new Date(slot.start * 1000), "HH:mm")} - 
                                      {format(new Date(slot.end * 1000), "HH:mm")}
                                    </span>
                                    <span className="flex items-center">
                                      <Tag className="h-3 w-3 mr-1" />
                                      {categories.find(cat => cat.id === slot.category)?.name || "Keine Kategorie"}
                                    </span>
                                  </CardDescription>
                                </div>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => toggleSlotCollapse(slot.id)}
                                  >
                                    {collapsedSlots[slot.id] ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronUp className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => router.push(`/dashboard/randevu-slotlari/${slot.id}`)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            {!collapsedSlots[slot.id] && (
                              <>
                                <CardContent className="p-3 pt-0">
                                                                        {slot.expand?.appointments && slot.expand.appointments.length > 0 ? (
                                    <div className="flex flex-col space-y-1">
                                      {slot.expand.appointments.map((appointment) => (
                                        <DroppableAppointment key={appointment.id} appointment={appointment}>
                                          <div className="relative group">
                                            <Badge 
                                              variant={appointment.status === 'empty' ? 'outline' : (
                                                appointment.status === 'edit' ? 'secondary' : 'default'
                                              )}
                                              className={`text-xs w-full flex justify-between py-1 px-2 
                                                ${appointment.status === 'empty' ? 'cursor-pointer hover:bg-secondary/20' : ''}
                                                ${appointment.expand?.customer?.qc_final === 'Okey' ? 'bg-green-600 text-white' : ''}`}
                                              onClick={() => appointment.status === 'empty' && handleAppointmentClick(appointment)}
                                            >
                                              <span>{appointment.name}</span>
                                              {appointment.expand?.customer ? (
                                                <DraggableCustomer appointment={appointment}>
                                                  <CustomerCard customer={appointment.expand.customer} />
                                                </DraggableCustomer>
                                              ) : appointment.status === 'empty' ? (
                                                <span className="text-muted-foreground flex items-center">
                                                  <UserPlus className="h-3 w-3 mr-1" />
                                                  Hinzufügen
                                                </span>
                                              ) : null}
                                            </Badge>
                                            
                                            {/* Sağ tık menüsü - sadece müşteri yoksa göster */}
                                            {!appointment.expand?.customer && (
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    <MoreHorizontal className="h-3 w-3" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                  <DropdownMenuItem
                                                    onClick={() => handleAppointmentStatusChange(appointment.id, 'empty')}
                                                    className={appointment.status === 'empty' ? 'bg-secondary' : ''}
                                                  >
                                                    Leer
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    onClick={() => handleAppointmentStatusChange(appointment.id, 'edit')}
                                                    className={appointment.status === 'edit' ? 'bg-secondary' : ''}
                                                  >
                                                    Bearbeiten
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    onClick={() => handleAppointmentStatusChange(appointment.id, 'okay')}
                                                    className={appointment.status === 'okay' ? 'bg-secondary' : ''}
                                                  >
                                                    Okay
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            )}
                                          </div>
                                        </DroppableAppointment>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-muted-foreground">Keine Termine</div>
                                  )}
                                </CardContent>
                                <CardFooter className="p-3 pt-0 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-3 w-3" />
                                    <span>
                                      {slot.expand?.team ? 
                                        (Array.isArray(slot.expand.team) ? 
                                          slot.expand.team.map((t: any) => t.name).join(", ") : 
                                          (slot.expand.team as any).name
                                        ) : 
                                        "Kein Team"
                                      }
                                    </span>
                                  </div>
                                </CardFooter>
                              </>
                            )}
                          </Card>
                        </DraggableSlot>
                      ))}
                    </div>
                  )}
                </DroppableDay>
              );
            })}
          </div>

          {/* Drag-Overlay (Vorschau während des Ziehens) */}
          <DragOverlay>
            {activeCustomer ? (
              <CustomerCard customer={activeCustomer} isDragging={true} />
            ) : activeSlot ? (
              <Card className="overflow-hidden w-[300px]">
                <div 
                  className="h-2" 
                  style={{ backgroundColor: getCategoryColor(activeSlot.category) }}
                ></div>
                <CardHeader className="p-3">
                  <CardTitle className="text-base">{activeSlot.name}</CardTitle>
                  <CardDescription className="text-xs flex flex-wrap gap-1">
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(activeSlot.start * 1000), "HH:mm")} - 
                      {format(new Date(activeSlot.end * 1000), "HH:mm")}
                    </span>
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}