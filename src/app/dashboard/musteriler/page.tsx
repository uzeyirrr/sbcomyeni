"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Search, Filter, Calendar, Users } from "lucide-react";
import { Customer } from "@/types/customer";
import { getCustomers, getCustomersByAgent } from "@/lib/customer-service";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { QC_ON_OPTIONS, QC_FINAL_OPTIONS } from "@/types/customer";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeCustomers } from "@/hooks/use-realtime-customers";
import { getAgents } from "@/lib/user-service";

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

export default function CustomersPage() {
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
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [agents, setAgents] = useState<{id: string, name: string}[]>([]);

  // Echtzeit-Kundenliste
  const customers = useRealtimeCustomers(initialCustomers);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  // Filtereinstellungen aus dem localStorage beim Laden der Seite abrufen
  useEffect(() => {
    const savedMonth = localStorage.getItem('customerDateFilter');
    const savedQcOn = localStorage.getItem('customerQcOnFilter');
    const savedQcFinal = localStorage.getItem('customerQcFinalFilter');
    const savedAgentFilter = localStorage.getItem('customerAgentFilter');

    if (savedMonth) setSelectedMonth(savedMonth);
    if (savedQcOn) setQcOnFilter(savedQcOn);
    if (savedQcFinal) setQcFinalFilter(savedQcFinal);
    if (savedAgentFilter) setAgentFilter(savedAgentFilter);

    // Kunden nach dem Laden des Benutzers abrufen
    if (!loading) {
      fetchCustomers();
    }
  }, [loading, user]);

  // Agent'ları yükle
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const agentsData = await getAgents();
        setAgents(agentsData.map(agent => ({ id: agent.id, name: agent.name })));
      } catch (error) {
        console.error("Error loading agents:", error);
      }
    };

    if (user?.role === "admin" || user?.role === "team-leader") {
      loadAgents();
    }
  }, [user]);

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

    // Agent Filter
    if (agentFilter !== "all") {
      filtered = filtered.filter(customer => customer.agent === agentFilter);
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
  }, [customers, searchTerm, selectedMonth, agentFilter, qcOnFilter, qcFinalFilter]);

  // Filtereinstellungen im localStorage speichern, wenn sie sich ändern
  useEffect(() => {
    localStorage.setItem('customerDateFilter', selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    localStorage.setItem('customerQcOnFilter', qcOnFilter);
  }, [qcOnFilter]);

  useEffect(() => {
    localStorage.setItem('customerQcFinalFilter', qcFinalFilter);
  }, [qcFinalFilter]);

  useEffect(() => {
    localStorage.setItem('customerAgentFilter', agentFilter);
  }, [agentFilter]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      let data;
      // Wenn der Benutzer die Rolle 'Agent' hat, nur seine eigenen Kunden abrufen
      if (user?.role === "agent" && user?.id) {
        data = await getCustomersByAgent(user.id);
      } else {
        // Alle Kunden für Admin oder Teamleiter abrufen
        data = await getCustomers();
      }
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">Kunden</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

            {/* Agent Filter - Sadece admin ve team-leader için göster */}
            {(user?.role === "admin" || user?.role === "team-leader") && (
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger>
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Agent filtern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Agenten</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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
          <CardTitle>Alle Kunden</CardTitle>
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