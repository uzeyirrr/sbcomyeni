"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  Loader2, 
  Eye, 
  Edit, 
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCompanies, createCompany, updateCompany, deleteCompany, Company } from "@/lib/company-service";

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    deaktif: false,
    password: "123456789" // Standardpasswort
  });

  // Unternehmen laden
  useEffect(() => {
    const loadCompanies = async () => {
      setIsLoading(true);
      try {
        const data = await getCompanies();
        setCompanies(data);
        setFilteredCompanies(data);
      } catch (error) {
        console.error("Fehler beim Laden der Unternehmen:", error);
        toast.error("Beim Laden der Unternehmen ist ein Fehler aufgetreten.");
      } finally {
        setIsLoading(false);
      }
    };

    loadCompanies();
  }, []);

  // Suchfunktion
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredCompanies(companies);
    } else {
      const filtered = companies.filter(company => 
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCompanies(filtered);
    }
  }, [searchTerm, companies]);

  // Formularänderungen verfolgen
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Checkbox-Änderungen verfolgen
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  // Neues Unternehmen erstellen oder bestehendes aktualisieren
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Formularvalidierung
      if (!formData.name.trim()) {
        toast.error("Der Firmenname ist obligatorisch.");
        setIsLoading(false);
        return;
      }

      // E-Mail-Überprüfung
      if (formData.email && !formData.email.includes('@')) {
        toast.error("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
        setIsLoading(false);
        return;
      }

      if (selectedCompany) {
        // Unternehmen aktualisieren - Passwortfeld entfernen
        const { password, ...updateData } = formData;
        console.log("Zu aktualisierende Daten:", updateData);
        const result = await updateCompany(selectedCompany.id, updateData);
        if (result.success) {
          toast.success("Unternehmen erfolgreich aktualisiert.");
          // Unternehmenliste aktualisieren
          const updatedCompanies = companies.map(company => 
            company.id === selectedCompany.id ? { ...company, ...formData } : company
          );
          setCompanies(updatedCompanies);
        } else {
          console.error("Aktualisierungsfehler:", result.error);
          toast.error("Beim Aktualisieren des Unternehmens ist ein Fehler aufgetreten.");
        }
      } else {
        // Neues Unternehmen erstellen
        const result = await createCompany(formData);
        if (result.success) {
          toast.success("Unternehmen erfolgreich erstellt.");
          // Neues Unternehmen zur Liste hinzufügen
          setCompanies(prev => [...prev, result.data as unknown as Company]);
        } else {
          const errorMessage = typeof result.error === 'object' && result.error !== null 
            ? (result.error as any).message || "Beim Erstellen des Unternehmens ist ein Fehler aufgetreten."
            : "Beim Erstellen des Unternehmens ist ein Fehler aufgetreten.";
          toast.error(errorMessage);
        }
      }

      // Dialog schließen und Formular zurücksetzen
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Fehler beim Senden des Unternehmens:", error);
      toast.error("Während des Vorgangs ist ein Fehler aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  // Unternehmen löschen
  const handleDelete = async () => {
    if (!selectedCompany) return;

    setIsLoading(true);
    try {
      const success = await deleteCompany(selectedCompany.id);
      if (success) {
        toast.success("Unternehmen erfolgreich gelöscht.");
        // Gelöschtes Unternehmen aus der Liste entfernen
        setCompanies(prev => prev.filter(company => company.id !== selectedCompany.id));
      } else {
        toast.error("Beim Löschen des Unternehmens ist ein Fehler aufgetreten.");
      }
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Fehler beim Löschen des Unternehmens:", error);
      toast.error("Beim Löschen des Unternehmens ist ein Fehler aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  // Unternehmen bearbeiten
  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      description: company.description || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      deaktif: company.deaktif || false,
      password: "123456789" // Standardpasswort
    });
    setIsDialogOpen(true);
  };

  // Formular zurücksetzen
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      deaktif: false,
      password: "123456789" // Standardpasswort
    });
    setSelectedCompany(null);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Unternehmen</h1>
        <Button onClick={() => {
          resetForm();
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Neues Unternehmen
        </Button>
      </div>

      <div className="flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Unternehmen suchen..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Wird geladen...</span>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unternehmensname</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Kein Unternehmen gefunden
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.email || "-"}</TableCell>
                    <TableCell>{company.phone || "-"}</TableCell>
                    <TableCell>{company.address || "-"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${company.deaktif ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                        {company.deaktif ? "Inaktiv" : "Aktiv"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => router.push(`/dashboard/sirketler/${company.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEdit(company)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedCompany(company);
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

      {/* Dialog zum Hinzufügen/Bearbeiten von Unternehmen */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedCompany ? "Unternehmen bearbeiten" : "Neues Unternehmen hinzufügen"}</DialogTitle>
            <DialogDescription>
              {selectedCompany ? "Bearbeiten Sie die Unternehmensinformationen." : "Fügen Sie ein neues Unternehmen hinzu."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Unternehmensname</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Unternehmensname"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Telefonnummer"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="E-Mail-Adresse"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="Website-URL"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Unternehmensadresse"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Unternehmensbeschreibung"
                rows={3}
              />
            </div>

            {!selectedCompany && (
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  name="password"
                  type="text"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Unternehmenspasswort"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Standardpasswort: 123456789
                </p>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="deaktif"
                name="deaktif"
                checked={formData.deaktif}
                onChange={handleCheckboxChange}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="deaktif">Inaktiv</Label>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
                disabled={isLoading}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {selectedCompany ? "Wird aktualisiert..." : "Wird hinzugefügt..."}
                  </>
                ) : (
                  selectedCompany ? "Aktualisieren" : "Hinzufügen"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog zum Löschen von Unternehmen */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Unternehmen löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie dieses Unternehmen löschen möchten? Dieser Vorgang kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedCompany && (
              <p className="font-medium">{selectedCompany.name}</p>
            )}
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isLoading}
            >
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