"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createTeam, updateTeam, Team } from "@/lib/team-service";
import { getUsers, User } from "@/lib/user-service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamFormProps {
  initialData?: Partial<Team>;
  onSuccess: () => void;
  onCancel: () => void;
  isEdit?: boolean;
  teamId?: string;
}

export function TeamForm({
  initialData,
  onSuccess,
  onCancel,
  isEdit = false,
  teamId,
}: TeamFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<Partial<Team>>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    leader: initialData?.leader || "",
    members: initialData?.members || [],
  });
  const [open, setOpen] = useState(false);

  // Benutzer für die Auswahl von Leader und Mitgliedern abrufen
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersList = await getUsers();
        setUsers(usersList);
      } catch (error) {
        console.error("Fehler beim Laden der Benutzer:", error);
        toast.error("Beim Laden der Benutzer ist ein Fehler aufgetreten.");
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const handleMemberToggle = (userId: string) => {
    setFormData((prev) => {
      const currentMembers = prev.members || [];
      if (currentMembers.includes(userId)) {
        return {
          ...prev,
          members: currentMembers.filter(id => id !== userId),
        };
      } else {
        return {
          ...prev,
          members: [...currentMembers, userId],
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Formularvalidierung
      if (!formData.name) {
        toast.error("Bitte geben Sie einen Teamnamen ein.");
        setIsLoading(false);
        return;
      }

      if (!formData.leader) {
        toast.error("Bitte wählen Sie einen Teamleiter aus.");
        setIsLoading(false);
        return;
      }

      // Sicherstellen, dass der Leiter auch in den Mitgliedern enthalten ist
      if (formData.members && !formData.members.includes(formData.leader)) {
        formData.members = [...formData.members, formData.leader];
      }

      let result;
      if (isEdit && teamId) {
        result = await updateTeam(teamId, formData);
      } else {
        result = await createTeam(formData);
      }

      if (result.success) {
        toast.success(isEdit ? "Team aktualisiert." : "Team erstellt.");
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

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : "Unbekannter Benutzer";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">Teamname</label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Teamname"
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">Beschreibung</label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Teambeschreibung"
            disabled={isLoading}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="leader" className="text-sm font-medium">Teamleiter</label>
          {isLoadingUsers ? (
            <div className="flex items-center space-x-2 h-10 px-3 py-2 text-sm border rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Benutzer werden geladen...</span>
            </div>
          ) : (
            <Select
              value={formData.leader}
              onValueChange={(value) => handleSelectChange("leader", value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Teamleiter auswählen" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Teammitglieder</label>
          {isLoadingUsers ? (
            <div className="flex items-center space-x-2 h-10 px-3 py-2 text-sm border rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Benutzer werden geladen...</span>
            </div>
          ) : (
            <div className="border rounded-md p-4 space-y-3">
              <div className="text-sm text-muted-foreground">
                {formData.members && formData.members.length > 0
                  ? `${formData.members.length} Mitglieder ausgewählt`
                  : "Markieren Sie Benutzer aus der Liste unten, um Mitglieder auszuwählen"}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`user-${user.id}`}
                      checked={formData.members?.includes(user.id) || false}
                      onChange={() => handleMemberToggle(user.id)}
                      disabled={isLoading || user.id === formData.leader}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label
                      htmlFor={`user-${user.id}`}
                      className={`text-sm flex-1 ${user.id === formData.leader ? 'font-semibold' : ''}`}
                    >
                      {user.name} {user.id === formData.leader ? '(Leiter)' : ''}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ausgewählte Mitglieder werden jetzt in der obigen Checkbox-Liste angezeigt */}
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