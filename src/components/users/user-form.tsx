"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { registerUser, updateUser, User } from "@/lib/user-service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const USER_ROLES = ["admin", "qcmanager", "agent"];

interface UserFormProps {
  initialData?: Partial<User>;
  onSuccess: () => void;
  onCancel: () => void;
  isEdit?: boolean;
  userId?: string;
}

export function UserForm({
  initialData,
  onSuccess,
  onCancel,
  isEdit = false,
  userId,
}: UserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
    name: initialData?.name || "",
    email: initialData?.email || "",
    password: "",
    passwordConfirm: "",
    avatar: initialData?.avatar || "",
    role: initialData?.role || "agent",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      avatar: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Formularvalidierung
      if (!formData.name || !formData.email) {
        toast.error("Bitte füllen Sie die erforderlichen Felder aus.");
        return;
      }

      // Passwortvalidierung für neue Benutzer
      if (!isEdit && (!formData.password || formData.password.length < 8)) {
        toast.error("Das Passwort muss mindestens 8 Zeichen lang sein.");
        return;
      }

      // Passwortbestätigung
      if (!isEdit && formData.password !== formData.passwordConfirm) {
        toast.error("Die Passwörter stimmen nicht überein.");
        return;
      }

      // Datenobjekt für die API erstellen
      const userData = { ...formData };

      // passwordConfirm entfernen, da es für die API nicht benötigt wird
      if ('passwordConfirm' in userData) {
        delete userData.passwordConfirm;
      }

      // Leeres Passwort bei Updates nicht senden
      if (isEdit && (!userData.password || userData.password.trim() === "")) {
        delete userData.password;
      } else if (isEdit && userData.password) {
        // Für Passwort-Updates müssen wir auch passwordConfirm senden
        userData.passwordConfirm = userData.password;
      }

      let result;
      if (isEdit && userId) {
        result = await updateUser(userId, userData);
      } else {
        result = await registerUser(userData);
      }

      if (result.success) {
        toast.success(isEdit ? "Benutzer aktualisiert." : "Benutzer erstellt.");
        onSuccess();
      } else {
        const errorMessage = typeof result.error === 'object' && result.error !== null
          ? (result.error as any).message || "Ein Fehler ist aufgetreten."
          : "Ein Fehler ist aufgetreten.";
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error("Formularübermittlungsfehler:", error);
      toast.error(error.message || "Ein Fehler ist aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="avatar" className="text-sm font-medium">Profilbild</label>
          <ImageUpload
            value={formData.avatar || ""}
            onChange={handleImageChange}
            disabled={isLoading}
            label="Profilbild hochladen"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">Name Nachname</label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Name Nachname"
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">E-Mail</label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="beispiel@mail.com"
            disabled={isLoading || (isEdit && initialData?.email === "admin@example.com")}
            required
          />
          {isEdit && initialData?.email === "admin@example.com" && (
            <p className="text-xs text-muted-foreground">
              Die E-Mail-Adresse des Admin-Benutzers kann nicht geändert werden.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium">Rolle</label>
          <Select
            value={formData.role}
            onValueChange={(value) => handleSelectChange("role", value)}
            disabled={isLoading || (isEdit && initialData?.email === "admin@example.com")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Rolle auswählen" />
            </SelectTrigger>
            <SelectContent>
              {USER_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role === "admin" ? "Administrator" :
                    role === "qcmanager" ? "QC Manager" :
                      "Agent"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isEdit && initialData?.email === "admin@example.com" && (
            <p className="text-xs text-muted-foreground">
              Die Rolle des Admin-Benutzers kann nicht geändert werden.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            {isEdit ? "Neues Passwort (Leer lassen, wenn keine Änderung gewünscht ist)" : "Passwort"}
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={isEdit ? "••••••••" : "Passwort (mindestens 8 Zeichen)"}
            disabled={isLoading}
            required={!isEdit}
            minLength={!isEdit ? 8 : undefined}
          />
        </div>

        {(!isEdit || formData.password) && (
          <div className="space-y-2">
            <label htmlFor="passwordConfirm" className="text-sm font-medium">Passwort bestätigen</label>
            <Input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              value={formData.passwordConfirm}
              onChange={handleChange}
              placeholder="Passwort bestätigen"
              disabled={isLoading}
              required={!isEdit || !!formData.password}
            />
          </div>
        )}
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