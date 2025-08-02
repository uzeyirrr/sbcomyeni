"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Search, Loader2, Edit, Trash } from "lucide-react";
import { getAppointmentCategories, deleteAppointmentCategory, AppointmentCategory } from "@/lib/appointment-category-service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

import { AppointmentCategoryForm } from "@/components/appointment-categories/appointment-category-form";

export default function AppointmentCategoriesPage() {
  const [categories, setCategories] = useState<AppointmentCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AppointmentCategory | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<AppointmentCategory[]>([]);

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Filter categories when search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter(
        (category) =>
          category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          category.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
  }, [searchTerm, categories]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const fetchedCategories = await getAppointmentCategories();
      setCategories(fetchedCategories);
      setFilteredCategories(fetchedCategories);
    } catch (error) {
      console.error("Fehler beim Abrufen der Kategorien:", error);
      toast.error("Beim Laden der Kategorien ist ein Fehler aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = () => {
    setIsAddDialogOpen(true);
  };

  const handleEditCategory = (category: AppointmentCategory) => {
    setSelectedCategory(category);
    setIsEditDialogOpen(true);
  };

  const handleDeleteCategory = (category: AppointmentCategory) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!selectedCategory) return;

    try {
      const success = await deleteAppointmentCategory(selectedCategory.id);
      if (success) {
        toast.success("Kategorie erfolgreich gelöscht.");
        fetchCategories();
      } else {
        toast.error("Beim Löschen der Kategorie ist ein Fehler aufgetreten.");
      }
    } catch (error) {
      console.error("Fehler beim Löschen der Kategorie:", error);
      toast.error("Beim Löschen der Kategorie ist ein Fehler aufgetreten.");
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Terminkategorien</CardTitle>
            <CardDescription>
              Terminkategorien anzeigen, hinzufügen, bearbeiten oder löschen.
            </CardDescription>
          </div>
          <Button onClick={handleAddCategory}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Kategorie
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Kategorie suchen..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farbe</TableHead>
                    <TableHead>Kategoriename</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        {searchTerm ? "Keine Suchergebnisse gefunden." : "Noch keine Kategorien vorhanden."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div 
                            className="h-6 w-6 rounded-full border" 
                            style={{ backgroundColor: category.color }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.description || "-"}</TableCell>
                        <TableCell>
                          {category.deaktif ? (
                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                              Deaktiviert
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                              Aktiv
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditCategory(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCategory(category)}
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            >
                              <Trash className="h-4 w-4" />
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
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Neue Kategorie hinzufügen</DialogTitle>
            <DialogDescription>
              Füllen Sie das folgende Formular aus, um eine neue Terminkategorie zu erstellen.
            </DialogDescription>
          </DialogHeader>
          <AppointmentCategoryForm
            onSuccess={() => {
              setIsAddDialogOpen(false);
              fetchCategories();
            }}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Kategorie bearbeiten</DialogTitle>
            <DialogDescription>
              Füllen Sie das folgende Formular aus, um die Kategorieinformationen zu aktualisieren.
            </DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <AppointmentCategoryForm
              initialData={selectedCategory}
              isEdit={true}
              categoryId={selectedCategory.id}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setSelectedCategory(null);
                fetchCategories();
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedCategory(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kategorie löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Sind Sie sicher, dass Sie diese Kategorie löschen möchten?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}