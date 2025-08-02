"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, Loader2, Filter, Calendar } from "lucide-react";
import { Customer } from "@/types/customer";
import { getCustomersByAgent } from "@/lib/customer-service";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { tr } from "date-fns/locale"; // Keep this if 'tr' locale is intentionally used for date formatting, otherwise consider changing to 'de'.
import { QC_ON_OPTIONS, QC_FINAL_OPTIONS } from "@/types/customer";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeCustomers } from "@/hooks/use-realtime-customers";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CustomerForm } from "@/components/customers/customer-form";
import { CustomerList } from "@/components/customers/customer-list";

export default function MyCustomersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [initialCustomers, setInitialCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [qcOnFilter, setQcOnFilter] = useState<string>("all");
  const [qcFinalFilter, setQcFinalFilter] = useState<string>("all");

  // Echtzeit-Kundenliste
  const customers = useRealtimeCustomers(initialCustomers);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  // Benutzerberechtigung überprüfen
  useEffect(() => {
    if (!loading) {
      if (!user) {
        toast.error("Bitte melden Sie sich an");
        router.push("/");
      } else {
        // Kunden für Benutzer mit der Agentenrolle abrufen
        fetchCustomers();
      }
    }
  }, [user, loading, router]);

  // Filtereinstellungen aus dem localStorage beim Laden der Seite abrufen
  useEffect(() => {
    const savedMonth = localStorage.getItem('myCustomerDateFilter');
    const savedQcOn = localStorage.getItem('myCustomerQcOnFilter');
    const savedQcFinal = localStorage.getItem('myCustomerQcFinalFilter');

    if (savedMonth) setSelectedMonth(savedMonth);
    if (savedQcOn) setQcOnFilter(savedQcOn);
    if (savedQcFinal) setQcFinalFilter(savedQcFinal);
  }, []);

  // Kunden filtern, wenn sich die Filterung ändert
  useEffect(() => {
    if (customers.length === 0) return;

    let filtered = [...customers];

    // Suchfilter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchLower) ||
        customer.surname.toLowerCase().includes(searchLower) ||
        customer.tel.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.location.toLowerCase().includes(searchLower)
      );
    }

    // Datumsfilter
    if (selectedMonth !== "all") {
      filtered = filtered.filter(customer => {
        const customerDate = new Date(customer.created);

        if (selectedMonth === "current") {
          const now = new Date();
          const startDate = startOfMonth(now);
          const endDate = endOfMonth(now);
          return customerDate >= startDate && customerDate <= endDate;
        } else if (selectedMonth === "last1") {
          const now = new Date();
          const startDate = startOfMonth(subMonths(now, 1));
          const endDate = endOfMonth(subMonths(now, 1));
          return customerDate >= startDate && customerDate <= endDate;
        } else if (selectedMonth === "last3") {
          const now = new Date();
          const startDate = startOfMonth(subMonths(now, 3));
          const endDate = new Date();
          return customerDate >= startDate && customerDate <= endDate;
        }

        return true;
      });
    }

    // QC Vorabstatusfilter
    if (qcOnFilter !== "all") {
      filtered = filtered.filter(customer => customer.qc_on === qcOnFilter);
    }

    // QC Endgültiger Statusfilter
    if (qcFinalFilter !== "all") {
      filtered = filtered.filter(customer => customer.qc_final === qcFinalFilter);
    }

    setFilteredCustomers(filtered);
  }, [customers, searchTerm, selectedMonth, qcOnFilter, qcFinalFilter]);

  // Filtereinstellungen im localStorage speichern, wenn sie sich ändern
  useEffect(() => {
    localStorage.setItem('myCustomerDateFilter', selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    localStorage.setItem('myCustomerQcOnFilter', qcOnFilter);
  }, [qcOnFilter]);

  useEffect(() => {
    localStorage.setItem('myCustomerQcFinalFilter', qcFinalFilter);
  }, [qcFinalFilter]);

  const fetchCustomers = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const data = await getCustomersByAgent(user.id);
      setInitialCustomers(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Beim Laden der Kunden ist ein Fehler aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setSelectedCustomer(null);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditDialogOpen(true);
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">Meine Kunden</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Kunde
        </Button>
      </div>

      {/* Filterbereich */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filteroptionen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Suche */}
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Kunde suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Datumsfilter */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Datum filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Zeiten</SelectItem>
                <SelectItem value="current">Diesen Monat</SelectItem>
                <SelectItem value="last1">Letzten Monat</SelectItem>
                <SelectItem value="last3">Letzte 3 Monate</SelectItem>
              </SelectContent>
            </Select>

            {/* QC Vorabstatus Filter */}
            <Select value={qcOnFilter} onValueChange={setQcOnFilter}>
              <SelectTrigger>
                <SelectValue placeholder="QC Vorabstatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle QC Vorabstatus</SelectItem>
                {QC_ON_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* QC Endgültiger Status Filter */}
            <Select value={qcFinalFilter} onValueChange={setQcFinalFilter}>
              <SelectTrigger>
                <SelectValue placeholder="QC Endgültiger Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle QC Endgültiger Status</SelectItem>
                {QC_FINAL_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Kundenliste */}
      <Card>
        <CardHeader>
          <CardTitle>Meine Kunden</CardTitle>
          <CardDescription>
            {isLoading ? (
              "Kunden werden geladen..."
            ) : (
              `Insgesamt ${filteredCustomers.length} Kunden werden aufgelistet`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerList
            customers={filteredCustomers}
            onEdit={handleEditCustomer}
            onRefresh={fetchCustomers}
          />
        </CardContent>
      </Card>

      {/* Dialog zum Hinzufügen eines neuen Kunden */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Neuen Kunden hinzufügen</DialogTitle>
            <DialogDescription>
              Füllen Sie das folgende Formular aus, um einen neuen Kunden hinzuzufügen.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            onSuccess={handleAddSuccess}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog zum Bearbeiten des Kunden */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Kunden bearbeiten</DialogTitle>
            <DialogDescription>
              Verwenden Sie das Formular, um die Kundeninformationen zu bearbeiten.
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <CustomerForm
              initialData={selectedCustomer}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
              isEdit
              customerId={selectedCustomer.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}