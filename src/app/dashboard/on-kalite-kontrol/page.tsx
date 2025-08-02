"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, Loader2, CalendarDays, CalendarIcon, Filter, Trash2, Edit } from "lucide-react";
import { Customer } from "@/types/customer";
import { 
  getCustomers, 
  searchCustomers, 
  deleteCustomer, 
  updateCustomer,
  subscribeToCustomers,
  unsubscribeFromCustomers,
  RealtimeCustomerEvent
} from "@/lib/customer-service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomerForm } from "@/components/customers/customer-form";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { formatDate } from "@/lib/utils";

export default function QCOnPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<"daily" | "weekly" | "monthly" | "all">("all");
  const [qcFilter, setQcFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);

  // Filtereinstellungen aus dem localStorage beim Laden der Seite abrufen
  useEffect(() => {
    const savedDateFilter = localStorage.getItem('qcDateFilter');
    const savedQcFilter = localStorage.getItem('qcStatusFilter');
    
    if (savedDateFilter) {
      setDateFilter(savedDateFilter as "daily" | "weekly" | "monthly" | "all");
    }
    
    if (savedQcFilter) {
      setQcFilter(savedQcFilter);
    }
    
    fetchCustomers();
    
    // Echtzeit-Updates abonnieren
    subscribeToCustomers(handleRealtimeUpdate);
    
    // Abonnement beim Unmount der Komponente abbestellen
    return () => {
      unsubscribeFromCustomers();
    };
  }, []);

  // Suchen und Filtern
  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, qcFilter]);
  
  // Filtereinstellungen im localStorage speichern, wenn sie sich ändern
  useEffect(() => {
    localStorage.setItem('qcDateFilter', dateFilter);
  }, [dateFilter]);
  
  useEffect(() => {
    localStorage.setItem('qcStatusFilter', qcFilter);
  }, [qcFilter]);

  // Echtzeit-Updates verarbeiten
  const handleRealtimeUpdate = (event: RealtimeCustomerEvent) => {
    const { action, record } = event;
    
    switch (action) {
      case 'create':
        setCustomers(prev => [record, ...prev].sort((a, b) => 
          new Date(b.created).getTime() - new Date(a.created).getTime()
        ));
        toast.success("Neuer Kunde hinzugefügt");
        break;
        
      case 'update':
        setCustomers(prev => 
          prev.map(customer => customer.id === record.id ? record : customer)
        );
        toast.success("Kundeninformationen aktualisiert");
        break;
        
      case 'delete':
        setCustomers(prev => 
          prev.filter(customer => customer.id !== record.id)
        );
        toast.success("Kunde gelöscht");
        break;
    }
  };

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      let fetchedCustomers;
      if (searchTerm.trim() !== "") {
        fetchedCustomers = await searchCustomers(searchTerm);
      } else {
        fetchedCustomers = await getCustomers();
      }
      
      // Sortieren, sodass die zuletzt hinzugefügten oben stehen
      fetchedCustomers.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
      
      setCustomers(fetchedCustomers);
      filterCustomers(fetchedCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Beim Laden der Kunden ist ein Fehler aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  const filterCustomers = (customersToFilter = customers) => {
    let filtered = [...customersToFilter];
    
    // Nach QC-Status filtern
    if (qcFilter !== "all") {
      filtered = filtered.filter(customer => customer.qc_on === qcFilter);
    }
    
    setFilteredCustomers(filtered);
  };
  
  // Kundenlöschvorgang
  const handleDeleteCustomer = async (id: string) => {
    if (confirm("Möchten Sie diesen Kunden wirklich löschen?")) {
      try {
        const success = await deleteCustomer(id);
        if (success) {
          toast.success("Kunde erfolgreich gelöscht");
          fetchCustomers(); // Kundenliste aktualisieren
        } else {
          toast.error("Beim Löschen des Kunden ist ein Fehler aufgetreten");
        }
      } catch (error) {
        console.error("Error deleting customer:", error);
        toast.error("Beim Löschen des Kunden ist ein Fehler aufgetreten");
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  // Kundenformular schließen und Kundenliste aktualisieren
  const handleCustomerFormClose = () => {
    setIsCustomerFormOpen(false);
    setSelectedCustomer(null);
    fetchCustomers();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {isCustomerFormOpen && selectedCustomer && (
        <Dialog open={isCustomerFormOpen} onOpenChange={setIsCustomerFormOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Kunden bearbeiten</DialogTitle>
              <DialogDescription>
                Kundeninformationen aktualisieren.
              </DialogDescription>
            </DialogHeader>
            <CustomerForm 
              initialData={selectedCustomer} 
              customerId={selectedCustomer.id}
              isEdit={true}
              onSuccess={handleCustomerFormClose} 
              onCancel={() => setIsCustomerFormOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Vorab-Qualitätskontrolle</CardTitle>
            <CardDescription>
              Verwalten Sie den Vorab-Qualitätskontrollstatus der Kunden.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={dateFilter}
              onValueChange={(value) => setDateFilter(value as "daily" | "weekly" | "monthly" | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Datumsfilter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Täglich</SelectItem>
                <SelectItem value="weekly">Wöchentlich</SelectItem>
                <SelectItem value="monthly">Monatlich</SelectItem>
                <SelectItem value="all">Alle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Kanban Board */}
              <KanbanBoard 
                customers={customers} 
                onCustomersUpdated={fetchCustomers} 
                dateFilter={dateFilter}
              />
              
              {/* Kundenliste */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Kundenliste</CardTitle>
                    <div className="flex items-center gap-2">
                      <form onSubmit={handleSearch} className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="search"
                          placeholder="Kunde suchen..."
                          className="pl-8 w-[250px]"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </form>
                      <Select
                        value={qcFilter}
                        onValueChange={setQcFilter}
                      >
                        <SelectTrigger className="w-[180px]">
                          <Filter className="mr-2 h-4 w-4" />
                          <SelectValue placeholder="Statusfilter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Status</SelectItem>
                          <SelectItem value="Yeni">Neu</SelectItem>
                          <SelectItem value="Aranacak">Anzurufen</SelectItem>
                          <SelectItem value="Rausgefallen">Rausgefallen</SelectItem>
                          <SelectItem value="Rausgefallen WP">Rausgefallen WP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kunde</TableHead>
                          <TableHead>Kontakt</TableHead>
                          <TableHead>Standort</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Erstellt am</TableHead>
                          <TableHead>Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">
                              {searchTerm ? "Keine Suchergebnisse gefunden." : "Es sind noch keine Kunden vorhanden."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCustomers.map((customer) => (
                            <TableRow key={customer.id}>
                              <TableCell className="font-medium">
                                {customer.name} {customer.surname}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div>{customer.tel}</div>
                                  <div className="text-xs text-muted-foreground">{customer.email}</div>
                                </div>
                              </TableCell>
                              <TableCell>{customer.location}</TableCell>
                              <TableCell>
                                <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                                  {(() => {
                                    switch (customer.qc_on) {
                                      case "Yeni":
                                        return <span className="text-blue-700 bg-blue-100 px-2 py-1 rounded-full">Neu</span>;
                                      case "Aranacak":
                                        return <span className="text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">Anzurufen</span>;
                                      case "Rausgefallen":
                                        return <span className="text-red-700 bg-red-100 px-2 py-1 rounded-full">Rausgefallen</span>;
                                      case "Rausgefallen WP":
                                        return <span className="text-purple-700 bg-purple-100 px-2 py-1 rounded-full">Rausgefallen WP</span>;
                                      default:
                                        return <span className="text-gray-700 bg-gray-100 px-2 py-1 rounded-full">{customer.qc_on}</span>;
                                    }
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(customer.created)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => {
                                      setSelectedCustomer(customer);
                                      setIsCustomerFormOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDeleteCustomer(customer.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}