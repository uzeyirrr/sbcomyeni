"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X, Upload, Eye } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CustomerFormData, QC_ON_OPTIONS, QC_FINAL_OPTIONS } from "@/types/customer";
import { useAuth } from "@/hooks/use-auth";
import { getFileUrl } from "@/lib/pocketbase";
import { createCustomer, updateCustomer } from "@/lib/customer-service";
import { getUsers } from "@/lib/user-service";
import { User } from "@/lib/user-service";

interface CustomerFormProps {
  initialData?: Partial<CustomerFormData>;
  onSuccess: () => void;
  onCancel: () => void;
  isEdit?: boolean;
  customerId?: string;
}

// Form şeması
const customerFormSchema = z.object({
  name: z.string().min(2, "Der Name muss mindestens 2 Zeichen lang sein"),
  surname: z.string().min(2, "Der Nachname muss mindestens 2 Zeichen lang sein"),
  tel: z.string().min(10, "Die Telefonnummer muss mindestens 10 Zeichen lang sein"),
  home_tel: z.string().optional().nullable(),
  email: z.string().optional().nullable().or(z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein")),
  home_people_number: z.number().optional().nullable(),
  age: z.number().optional().nullable(),
  location: z.string().min(2, "Der Standort muss mindestens 2 Zeichen lang sein"),
  street: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  who_is_customer: z.string().optional().nullable(),
  roof_type: z.string().optional().nullable(),
  what_talked: z.string().optional().nullable(),
  roof: z.string().optional().nullable(),
  roof_image: z.string().optional().nullable(),
  qc_on: z.string().optional().nullable(),
  qc_final: z.string().optional().nullable(),
  agent: z.string().optional().nullable(),
  sale: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  qc_note: z.string().optional().nullable(),
});

export function CustomerForm({
  initialData,
  onSuccess,
  onCancel,
  isEdit = false,
  customerId,
}: CustomerFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [roofImagePreview, setRoofImagePreview] = useState<string | null>(null);
  const roofImageFileRef = useRef<HTMLInputElement>(null);
  const [agents, setAgents] = useState<User[]>([]);

  const form = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      surname: "",
      tel: "",
      home_tel: "",
      email: "",
      home_people_number: 0,
      age: 0,
      location: "",
      street: "",
      postal_code: "",
      who_is_customer: "",
      roof_type: "",
      what_talked: "",
      roof: "",
      roof_image: "",
      qc_on: "Yeni", // "Neu"
      qc_final: "Yeni", // "Neu"
      agent: user?.role === "agent" ? user?.id || "" : "unassigned", // "nicht zugewiesen"
      sale: "none", // "keine"
      note: "",
      qc_note: "",
      ...initialData,
    },
  });

  // Pano görsellerini yakalamak için paste event listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            if (typeof event.target?.result === 'string') {
              form.setValue("roof", event.target.result);
              setRoofImagePreview(event.target.result);
              toast.success("Bild wurde aus der Zwischenablage eingefügt"); // "Bild wurde aus der Zwischenablage eingefügt"
            }
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    // Belgeye paste event listener ekle
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [form]);

  useEffect(() => {
    const value = form.getValues("roof");
    if (value) {
      if (typeof value === "string" && value.startsWith("data:")) {
        setRoofImagePreview(value);
      } else if (value && customerId) {
        setRoofImagePreview(getFileUrl("customers", customerId, value));
      }
    } else {
      setRoofImagePreview(null);
    }
  }, [form.watch("roof"), customerId]);

  // Temsilcileri getir
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const allUsers = await getUsers();
        // Sadece agent rolündeki kullanıcıları filtrele
        const agentUsers = allUsers.filter(u => u.role === "agent");
        setAgents(agentUsers);
      } catch (error) {
        console.error("Fehler beim Laden der Agenten:", error); // "Fehler beim Laden der Agenten:"
        toast.error("Beim Laden der Agenten ist ein Fehler aufgetreten."); // "Beim Laden der Agenten ist ein Fehler aufgetreten."
      }
    };

    fetchAgents();
  }, []);

  const onSubmit = async (data: z.infer<typeof customerFormSchema>) => {
    setIsLoading(true);
    try {
      // Form verilerini logla
      console.log('Form data:', data); // "Form data:"
      console.log('QC on:', data.qc_on); // "QC on:"
      console.log('QC final:', data.qc_final); // "QC final:"
      console.log('Sale:', data.sale); // "Sale:"
      console.log('Roof image:', data.roof_image); // "Roof image:"

      // Sayısal alanları kontrol et
      const formData = {
        ...data,
        home_people_number: data.home_people_number ? Number(data.home_people_number) : null,
        age: data.age ? Number(data.age) : null,
        // Agent bilgisini formdan al, eğer kullanıcı agent ise kendi ID'sini kullan
        agent: (user?.role === "agent") ? user.id : (data.agent === "unassigned" ? null : data.agent), // "nicht zugewiesen"
        // Varsayılan değerleri ekle
        qc_on: (data.qc_on || "Yeni") as "Yeni" | "Aranacak" | "Rausgefallen" | "Rausgefallen WP", // "Neu" | "Anzurufen" | "Rausgefallen" | "Rausgefallen WP"
        qc_final: (data.qc_final || "Yeni") as "Yeni" | "Okey" | "Rausgefallen" | "Rausgefallen WP" | "Neuleger" | "Neuleger WP", // "Neu" | "Okay" | "Rausgefallen" | "Rausgefallen WP" | "Neuleger" | "Neuleger WP"
        sale: (data.sale || "none") as "red" | "green" | "blue" | "yellow" | "none" // "rot" | "grün" | "blau" | "gelb" | "keine"
      };

      console.log('Processed form data:', formData); // "Verarbeitete Formulardaten:"

      if (isEdit && customerId) {
        await updateCustomer(customerId, formData);
        toast.success("Kunde erfolgreich aktualisiert"); // "Kunde erfolgreich aktualisiert"
      } else {
        await createCustomer(formData);
        toast.success("Kunde erfolgreich hinzugefügt"); // "Kunde erfolgreich hinzugefügt"
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving customer:", error);
      if (error instanceof Error) {
        toast.error(`Fehler: ${error.message}`); // "Fehler:"
      } else {
        toast.error(isEdit ? "Beim Aktualisieren des Kunden ist ein Fehler aufgetreten" : "Beim Hinzufügen des Kunden ist ein Fehler aufgetreten"); // "Beim Aktualisieren des Kunden ist ein Fehler aufgetreten" : "Beim Hinzufügen des Kunden ist ein Fehler aufgetreten"
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Dosyayı base64'e çevir
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          form.setValue("roof", event.target.result as string);
          setRoofImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRoofImageRemove = () => {
    form.setValue("roof", null);
    setRoofImagePreview(null);
    if (roofImageFileRef.current) {
      roofImageFileRef.current.value = '';
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto max-h-[70vh] pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vorname</FormLabel>
                <FormControl>
                  <Input placeholder="Vorname des Kunden" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="surname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nachname</FormLabel>
                <FormControl>
                  <Input placeholder="Nachname des Kunden" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefon</FormLabel>
                <FormControl>
                  <Input placeholder="Telefonnummer des Kunden" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="home_tel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Festnetztelefon</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Festnetztelefon des Kunden"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-Mail</FormLabel>
                <FormControl>
                  <Input
                    placeholder="E-Mail des Kunden"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === '' ? null : value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="home_people_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Anzahl Personen im Haushalt</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Anzahl Personen im Haushalt"
                    onChange={(e) => {
                      field.onChange(e.target.valueAsNumber || null);
                    }}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alter</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Alter des Kunden"
                    onChange={(e) => {
                      field.onChange(e.target.valueAsNumber || null);
                    }}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Standort</FormLabel>
                <FormControl>
                  <Input placeholder="Standort des Kunden" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="street"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Straße</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Straße des Kunden"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postleitzahl</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Postleitzahl des Kunden"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="who_is_customer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wer ist der Kunde</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Wer ist der Kunde"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="roof_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dachtyp</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Dachtyp"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="what_talked"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Besprochenes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Besprochenes"
                    {...field}
                    value={field.value || ''}
                    className="min-h-[150px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="roof"
            render={({ field }) => {
              console.log('roof field render:', {
                value: field.value,
                type: typeof field.value,
                hasValue: !!field.value
              });

              return (
                <FormItem>
                  <FormLabel>Dachbild</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={roofImageFileRef}
                        onChange={handleRoofImageChange}
                      />

                      {roofImagePreview ? (
                        <div className="relative">
                          <img
                            src={roofImagePreview}
                            alt="Dachbild"
                            className="max-h-64 rounded-md object-contain border border-border"
                            onError={(e) => {
                              console.log('Bild konnte nicht geladen werden:', roofImagePreview); // "Bild konnte nicht geladen werden:"
                              e.currentTarget.style.display = 'none';
                            }}
                            onLoad={() => {
                              console.log('Bild erfolgreich geladen:', roofImagePreview); // "Bild erfolgreich geladen:"
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 left-2"
                            onClick={() => window.open(roofImagePreview, '_blank')}
                            title="Bild in neuem Tab öffnen" // "Bild in neuem Tab öffnen"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={handleRoofImageRemove}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          onClick={() => roofImageFileRef.current?.click()}
                          className="flex flex-col items-center justify-center rounded-md border border-dashed p-6 cursor-pointer hover:border-primary transition-colors"
                        >
                          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                          <div className="text-sm text-muted-foreground text-center space-y-1">
                            <p className="font-medium">Dachbild hochladen</p>
                            <p>Klicken Sie, um ein Bild hochzuladen oder mit Strg+V einzufügen</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* Temsilci seçimi - sadece admin ve team-leader için gösterilir ve düzenleme modunda gösterilmez */}
          {user && (user.role === "admin" || user.role === "team-leader") && (
            <FormField
              control={form.control}
              name="agent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Agent auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Nicht zugewiesen</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* QC ve Satış durumları - Tüm kullanıcılar için gösterilir */}
          <FormField
            control={form.control}
            name="qc_on"
            render={({ field }) => {
              console.log('qc_on field value:', field.value);
              return (
                <FormItem>
                  <FormLabel>QC Vorstatus</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="QC Vorstatus auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {QC_ON_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="qc_final"
            render={({ field }) => {
              console.log('qc_final field value:', field.value);
              return (
                <FormItem>
                  <FormLabel>QC Endstatus</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="QC Endstatus auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {QC_FINAL_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="sale"
            render={({ field }) => {
              console.log('sale field value:', field.value);
              return (
                <FormItem>
                  <FormLabel>Verkaufsstatus</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Verkaufsstatus auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Keine</SelectItem>
                      <SelectItem value="red">Rot</SelectItem>
                      <SelectItem value="green">Grün</SelectItem>
                      <SelectItem value="blue">Blau</SelectItem>
                      <SelectItem value="yellow">Gelb</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notiz</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="qc_note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>QC Notiz</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="QC Notiz"
                  {...field}
                  value={field.value || ''}
                  className="min-h-[150px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Aktualisieren" : "Speichern"}
          </Button>
        </div>
      </form>
    </Form>
  );
}