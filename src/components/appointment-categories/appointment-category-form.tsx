"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createAppointmentCategory, updateAppointmentCategory, AppointmentCategory } from "@/lib/appointment-category-service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AppointmentCategoryFormProps {
  initialData?: Partial<AppointmentCategory>;
  onSuccess: () => void;
  onCancel: () => void;
  isEdit?: boolean;
  categoryId?: string;
}

export function AppointmentCategoryForm({
  initialData,
  onSuccess,
  onCancel,
  isEdit = false,
  categoryId,
}: AppointmentCategoryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<AppointmentCategory>>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    color: initialData?.color || "#3b82f6", // Default blue color
    deaktif: initialData?.deaktif || false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      deaktif: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.name) {
        toast.error("Bitte geben Sie einen Kategorienamen ein.");
        setIsLoading(false);
        return;
      }

      if (!formData.color) {
        toast.error("Bitte wählen Sie eine Farbe aus.");
        setIsLoading(false);
        return;
      }

      let result;
      if (isEdit && categoryId) {
        result = await updateAppointmentCategory(categoryId, formData);
      } else {
        result = await createAppointmentCategory(formData);
      }

      if (result.success) {
        toast.success(isEdit ? "Kategorie aktualisiert." : "Kategorie erstellt.");
        onSuccess();
      } else {
        const errorMessage = typeof result.error === 'object' && result.error !== null
          ? (result.error as any).message || "Ein Fehler ist aufgetreten."
          : "Ein Fehler ist aufgetreten.";
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error("Form submission error:", error);
      toast.error(error.message || "Ein Fehler ist aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Kategoriename</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Kategoriename"
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Beschreibung</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Kategoriebeschreibung"
            disabled={isLoading}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Farbe</Label>
          <div className="flex items-center gap-3">
            <Input
              id="color"
              name="color"
              type="color"
              value={formData.color}
              onChange={handleChange}
              className="w-16 h-10 p-1"
              disabled={isLoading}
            />
            <div
              className="h-10 flex-1 rounded-md border"
              style={{ backgroundColor: formData.color }}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="deaktif"
            checked={formData.deaktif}
            onCheckedChange={handleSwitchChange}
            disabled={isLoading}
          />
          <Label htmlFor="deaktif">Deaktivieren</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Abbrechen
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Aktualisieren" : "Erstellen"}
        </Button>
      </div>
    </form>
  );
}