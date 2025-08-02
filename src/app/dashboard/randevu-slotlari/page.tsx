"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale"; // Using German locale
import { toast } from "sonner";
import {
  Building,
  Calendar,
  Clock,
  Edit,
  Loader2,
  Plus,
  Tag,
  Trash2,
  Users,
  AlertCircle,
  Eye,
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  getAppointmentSlots,
  createAppointmentSlot,
  updateAppointmentSlot,
  deleteAppointmentSlot,
} from "@/lib/appointment-slot-service";
import { getAppointmentCategories } from "@/lib/appointment-category-service";
import { getCompanies } from "@/lib/company-service";
import { getTeams } from "@/lib/team-service";

type AppointmentSlot = {
  id: string;
  name: string;
  date: string;
  start: number;
  end: number;
  space: number;
  category: string;
  company: string;
  team: string[];
  deaktif?: boolean;
  appointments?: any[];
};

type AppointmentCategory = {
  id: string;
  name: string;
};

type Company = {
  id: string;
  name: string;
};

type Team = {
  id: string;
  name: string;
};

export default function AppointmentSlotsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [categories, setCategories] = useState<AppointmentCategory[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    start: 10, // Default start time: 10:00
    end: 19, // Default end time: 19:00
    space: 2, // Default interval: 2 hours
    team: [] as string[],
    category: "",
    company: "",
    date: new Date(),
    deaktif: false
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [slotsData, categoriesData, companiesData, teamsData] = await Promise.all([
          getAppointmentSlots(),
          getAppointmentCategories(),
          getCompanies(),
          getTeams()
        ]);
        
        setSlots(slotsData);
        setCategories(categoriesData);
        setCompanies(companiesData);
        setTeams(teamsData);
      } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
        toast.error("Beim Laden der Daten ist ein Fehler aufgetreten.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      start: 9,
      end: 17,
      space: 1,
      team: [],
      category: "",
      company: "",
      date: new Date(),
      deaktif: false
    });
    setSelectedSlot(null);
  };

  // Open dialog
  const openDialog = (slot?: AppointmentSlot) => {
    if (slot) {
      // Edit mode
      setSelectedSlot(slot);
      setFormData({
        name: slot.name,
        start: slot.start,
        end: slot.end,
        space: slot.space,
        team: slot.team || [],
        category: slot.category || "",
        company: slot.company || "",
        date: new Date(slot.date),
        deaktif: slot.deaktif || false
      });
    } else {
      // New creation mode
      resetForm();
    }
    setIsDialogOpen(true);
  };

  // Calculate preview of appointments to be created
  const calculateAppointmentPreview = () => {
    if (formData.start >= formData.end || formData.space <= 0) {
      return [];
    }
    
    const appointments = [];
    for (let hour = formData.start; hour < formData.end; hour += formData.space) {
      appointments.push({
        time: `${hour}:00`,
        status: 'empty'
      });
    }
    
    return appointments;
  };
  
  // Create or update slot
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Form validation
      if (!formData.name) {
        toast.error("Bitte geben Sie einen Slot-Namen ein.");
        return;
      }
      
      if (formData.start >= formData.end) {
        toast.error("Die Startzeit muss vor der Endzeit liegen.");
        return;
      }
      
      if (formData.space <= 0) {
        toast.error("Der Intervallwert muss größer als 0 sein.");
        return;
      }
      
      if (!formData.category) {
        toast.error("Bitte wählen Sie eine Kategorie.");
        return;
      }
      
      if (!formData.company) {
        toast.error("Bitte wählen Sie ein Unternehmen.");
        return;
      }
      
      if (formData.team.length === 0) {
        toast.error("Bitte wählen Sie mindestens ein Team aus.");
        return;
      }
      
      // Prepare data
      const data = {
        ...formData,
        date: format(formData.date, "yyyy-MM-dd")
      };
      
      let result;
      if (selectedSlot) {
        // Update
        result = await updateAppointmentSlot(selectedSlot.id, data);
        if (result) {
          toast.success("Slot erfolgreich aktualisiert.");
          // Update list
          setSlots(slots.map(slot => slot.id === selectedSlot.id ? result! : slot));
        } else {
          toast.error("Beim Aktualisieren des Slots ist ein Fehler aufgetreten.");
        }
      } else {
        // New creation
        result = await createAppointmentSlot(data);
        if (result) {
          toast.success("Slot erfolgreich erstellt.");
          // Add to list
          setSlots([result, ...slots]);
        } else {
          toast.error("Beim Erstellen des Slots ist ein Fehler aufgetreten.");
        }
      }
      
      // Close dialog
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Fehler beim Senden des Formulars:", error);
      toast.error("Beim Verarbeiten der Anfrage ist ein Fehler aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete slot
  const handleDelete = async () => {
    if (!selectedSlot) return;
    
    setIsLoading(true);
    try {
      const success = await deleteAppointmentSlot(selectedSlot.id);
      if (success) {
        toast.success("Slot erfolgreich gelöscht.");
        // Remove from list
        setSlots(slots.filter(slot => slot.id !== selectedSlot.id));
        setIsDeleteDialogOpen(false);
      } else {
        toast.error("Beim Löschen des Slots ist ein Fehler aufgetreten.");
      }
    } catch (error) {
      console.error("Fehler beim Löschen des Slots:", error);
      toast.error("Beim Löschen des Slots ist ein Fehler aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  // Get category name
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : "Unbestimmt";
  };

  // Get company name
  const getCompanyName = (companyId: string) => {
    const company = companies.find(comp => comp.id === companyId);
    return company ? company.name : "Unbestimmt";
  };

  // Get team names
  const getTeamNames = (teamIds: string[]) => {
    return teamIds.map(id => {
      const team = teams.find(t => t.id === id);
      return team ? team.name : "Unbestimmt";
    }).join(", ");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Termin-Slots</h1>
          <p className="text-muted-foreground">
            Termin-Slots erstellen, bearbeiten und verwalten.
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Neuen Slot hinzufügen
        </Button>
      </div>

      <Tabs defaultValue="list" className="mb-6">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="list">Listenansicht</TabsTrigger>
          <TabsTrigger value="card">Kartenansicht</TabsTrigger>
        </TabsList>

        {/* List View */}
        <TabsContent value="list">
          {isLoading && !slots.length ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Slot-Name</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Zeitbereich</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Unternehmen</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Termine</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center h-24">
                        <p className="text-muted-foreground">Es wurden noch keine Termin-Slots erstellt.</p>
                        <Button onClick={() => openDialog()} className="mt-2">
                          <Plus className="mr-2 h-4 w-4" />
                          Neuen Slot hinzufügen
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    slots.map(slot => (
                      <TableRow key={slot.id} className={slot.deaktif ? "opacity-60" : ""}>
                        <TableCell className="font-medium">{slot.name}</TableCell>
                        <TableCell>{format(new Date(slot.date), "d. MMMM yyyy", { locale: de })}</TableCell>
                        <TableCell>{slot.start}:00 - {slot.end}:00 ({slot.space} Stunde(n))</TableCell>
                        <TableCell>{getCategoryName(slot.category)}</TableCell>
                        <TableCell>{getCompanyName(slot.company)}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{getTeamNames(slot.team)}</TableCell>
                        <TableCell>{slot.appointments?.length || 0} Termine</TableCell>
                        <TableCell>
                          {slot.deaktif ? (
                            <Badge variant="outline" className="text-muted-foreground">Deaktiviert</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-500 border-green-500">Aktiv</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={`/dashboard/randevu-slotlari/${slot.id}`}>
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openDialog(slot)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => {
                                setSelectedSlot(slot);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Card View */}
        <TabsContent value="card">
          {isLoading && !slots.length ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {slots.length === 0 ? (
                <div className="md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center h-64 border rounded-lg p-6">
                  <p className="text-muted-foreground mb-4">Es wurden noch keine Termin-Slots erstellt.</p>
                  <Button onClick={() => openDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Neuen Slot hinzufügen
                  </Button>
                </div>
              ) : (
                slots.map(slot => (
                  <Card key={slot.id} className={slot.deaktif ? "opacity-60" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle>{slot.name}</CardTitle>
                        {slot.deaktif && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Deaktiviert
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        {format(new Date(slot.date), "d. MMMM yyyy", { locale: de })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{slot.start}:00 - {slot.end}:00 ({slot.space} Stunde(n) Intervall)</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{getCategoryName(slot.category)}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{getCompanyName(slot.company)}</span>
                        </div>
                        <div className="flex items-start text-sm">
                          <Users className="mr-2 h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{getTeamNames(slot.team)}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{slot.appointments?.length || 0} Termine erstellt</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/dashboard/randevu-slotlari/${slot.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Details
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openDialog(slot)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Bearbeiten
                        </Button>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => {
                          setSelectedSlot(slot);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Löschen
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Slot Creation/Editing Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedSlot ? "Termin-Slot bearbeiten" : "Neuen Termin-Slot erstellen"}
            </DialogTitle>
            <DialogDescription>
              {selectedSlot 
                ? "Bearbeiten Sie den Termin-Slot. Achtung: Wenn Sie die Zeitintervalle ändern, werden bestehende Termine nicht beeinflusst."
                : "Erstellen Sie einen neuen Termin-Slot. Automatische Termine werden zwischen den von Ihnen festgelegten Start- und Endzeiten in den angegebenen Intervallen erstellt."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="name">Slot-Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Beispiel: Montags-Termine"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Datum</Label>
                <DatePicker
                  date={formData.date}
                  setDate={(date) => setFormData({ ...formData, date: date || new Date() })}
                />
              </div>
            </div>
            
            {selectedSlot && (
              <div className="mb-4 p-3 border rounded-md bg-blue-50 text-blue-700 flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  Beim Bearbeiten können Start-, End- und Intervallwerte nicht geändert werden. Diese Werte wurden bei der Erstellung der Termine festgelegt und eine Änderung könnte bestehende Termine beeinflussen.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="start">Startzeit</Label>
                {selectedSlot ? (
                  <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    {formData.start}:00
                  </div>
                ) : (
                  <Select
                    value={formData.start.toString()}
                    onValueChange={(value) => setFormData({ ...formData, start: parseInt(value) })}
                  >
                    <SelectTrigger id="start">
                      <SelectValue placeholder="Startzeit auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                        <SelectItem key={hour} value={hour.toString()}>
                          {hour}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Endzeit</Label>
                {selectedSlot ? (
                  <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    {formData.end}:00
                  </div>
                ) : (
                  <Select
                    value={formData.end.toString()}
                    onValueChange={(value) => setFormData({ ...formData, end: parseInt(value) })}
                  >
                    <SelectTrigger id="end">
                      <SelectValue placeholder="Endzeit auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                        <SelectItem key={hour} value={hour.toString()}>
                          {hour}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="space">Intervall (Stunden)</Label>
                {selectedSlot ? (
                  <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    {formData.space} Stunde(n)
                  </div>
                ) : (
                  <Select
                    value={formData.space.toString()}
                    onValueChange={(value) => setFormData({ ...formData, space: parseInt(value) })}
                  >
                    <SelectTrigger id="space">
                      <SelectValue placeholder="Intervall auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((space) => (
                        <SelectItem key={space} value={space.toString()}>
                          {space} Stunde(n)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Preview of Appointments to be Created - Show only during new creation */}
            {!selectedSlot && formData.start < formData.end && formData.space > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">Zu erstellende Termine:</h3>
                <div className="border rounded-md p-3 bg-muted/30">
                  <div className="grid grid-cols-3 gap-2">
                    {calculateAppointmentPreview().map((appointment, index) => (
                      <div 
                        key={index} 
                        className="flex items-center p-2 rounded-md bg-background border"
                      >
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{appointment.time}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Insgesamt werden {calculateAppointmentPreview().length} Termine erstellt.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <Label htmlFor="category">Kategorie</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Kategorie auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 mb-4">
              <Label htmlFor="company">Unternehmen</Label>
              <Select
                value={formData.company}
                onValueChange={(value) => setFormData({ ...formData, company: value })}
              >
                <SelectTrigger id="company">
                  <SelectValue placeholder="Unternehmen auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 mb-4">
              <Label htmlFor="team">Team</Label>
              <Select
                value={formData.team[0] || ""}
                onValueChange={(value) => setFormData({ ...formData, team: [value] })}
              >
                <SelectTrigger id="team">
                  <SelectValue placeholder="Team auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                id="deaktif"
                checked={formData.deaktif || false}
                onChange={(e) => setFormData({ ...formData, deaktif: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="deaktif">Deaktiviert</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird geladen...
                </>
              ) : (
                <>
                  {selectedSlot ? "Aktualisieren" : "Erstellen"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Slot löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie diesen Slot löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden, und alle diesem Slot zugeordneten Termine werden ebenfalls gelöscht.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gelöscht...
                </>
              ) : (
                "Löschen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}