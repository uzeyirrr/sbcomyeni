"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const authData = await pb.collection("users").authWithPassword(formData.email, formData.password);

      // Admin role check
      if (authData.record.role !== "admin") {
        // End session
        pb.authStore.clear();
        toast.error("Sie haben keine Berechtigung, auf diese Seite zuzugreifen.", {
          description: "Nur Administratoren können sich anmelden."
        });
        return;
      }

      toast.success("Anmeldung erfolgreich!");
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("Login error:", error);

      // Handle different error cases with appropriate messages
      if (error && typeof error === 'object' && 'status' in error) {
        const err = error as { status: number };
        if (err.status === 400) {
          toast.warning("Falsche E-Mail oder falsches Passwort. Bitte überprüfen Sie Ihre Daten.", {
            description: "Anmeldung fehlgeschlagen"
          });
        } else if (err.status === 404) {
          toast.warning("Es wurde kein Benutzer mit dieser E-Mail-Adresse gefunden.", {
            description: "Benutzer nicht gefunden"
          });
        }
      } else if (error instanceof Error && (error.message.includes("Failed to fetch") || error.message.includes("Network Error"))) {
        toast.error("Verbindung zum Server konnte nicht hergestellt werden. Bitte überprüfen Sie Ihre Internetverbindung.", {
          description: "Verbindungsfehler"
        });
      } else {
        toast.error("Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.", {
          description: "Anmeldung nicht möglich"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">CRM-System</h1>
          <p className="mt-2 text-muted-foreground">CRM-Anwendung, powered by Yezuri</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Administrator-Anmeldung</CardTitle>
            <CardDescription>Melden Sie sich mit Ihrem Administrator-Konto an</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  E-Mail
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="beispiel@firma.de"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Passwort
                  </label>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Anmeldung läuft..." : "Anmelden"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}