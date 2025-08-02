"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, Loader2, Filter, Edit, Trash2, Check } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CustomerForm } from "@/components/customers/customer-form";
import { formatDate } from "@/lib/utils";
import { getUserName } from "@/lib/user-service";

// Verkaufsstatus und Farben
const SALE_OPTIONS = [
  { value: "red", label: "Rot", bgColor: "bg-red-100", textColor: "text-red-800" },
  { value: "green", label: "Grün", bgColor: "bg-green-100", textColor: "text-green-800" },
  { value: "blue", label: "Blau", bgColor: "bg-blue-100", textColor: "text-blue-800" },
  { value: "yellow", label: "Gelb", bgColor: "bg-yellow-100", textColor: "text-yellow-800" },
  { value: "none", label: "Keiner", bgColor: "bg-gray-100", textColor: "text-gray-800" },
];

export default function SalesControlPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [saleFilter, setSaleFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [updatingCustomerId, setUpdatingCustomerId] = useState<string | null>(null);

  // Filterpräferenzen beim Laden der Seite aus localStorage abrufen
  useEffect(() => {
    const savedSaleFilter = localStorage.getItem('saleFilter');
    
    if (savedSaleFilter) {
      setSaleFilter(savedSaleFilter);
    }
    
    fetchCustomers();
    
    // Echtzeit-Updates abonnieren
    subscribeToCustomers(handleRealtimeUpdate);
    
    // Abonnement beim Unmount der Komponente aufheben
    return () => {
      unsubscribeFromCustomers();
    };
  }, []);

  // Suche und Filterung
  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, saleFilter]);
  
  // Filterpräferenzen speichern, wenn sie sich ändern
  useEffect(() => {
    localStorage.setItem('saleFilter', saleFilter);
  }, [saleFilter]);

  // Agentennamen laden
  useEffect(() => {
    const loadAgentNames = async () => {
      const names: Record<string, string> = {};
      
      // Eindeutige Agenten-IDs abrufen
      const uniqueAgentIds = [...new Set(customers.map(c => c.agent).filter(Boolean))];
      
      // Namen für jeden Agenten abrufen
      for (const agentId of uniqueAgentIds) {
        if (agentId) {
          names[agentId] = await getUserName(agentId);
        }
      }
      
      setAgentNames(names);
    };
    
    if (customers.length > 0) {
      loadAgentNames();
    }
  }, [customers]);

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
      
      // Nach dem Erstellungsdatum absteigend sortieren (neueste zuerst)
      fetchedCustomers.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
      
      setCustomers(fetchedCustomers);
      filterCustomers(fetchedCustomers);
    } catch (error) {
      console.error("Fehler beim Abrufen der Kunden:", error);
      toast.error("Beim Laden der Kunden ist ein Fehler aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  const filterCustomers = (customersToFilter = customers) => {
    let filtered = [...customersToFilter];
    
    // Nach Verkaufsstatus filtern
    if (saleFilter !== "all") {
      filtered = filtered.filter(customer => customer.sale === saleFilter);
    }
    
    setFilteredCustomers(filtered);
  };
  
  // Kundenlöschung
  const handleDeleteCustomer = async (id: string) => {
    if (confirm("Sind Sie sicher, dass Sie diesen Kunden löschen möchten?")) {
      try {
        const success = await deleteCustomer(id);
        if (success) {
          toast.success("Kunde erfolgreich gelöscht");
          fetchCustomers(); // Kundenliste aktualisieren
        } else {
          toast.error("Beim Löschen des Kunden ist ein Fehler aufgetreten");
        }
      } catch (error) {
        console.error("Fehler beim Löschen des Kunden:", error);
        toast.error("Beim Löschen des Kunden ist ein Fehler aufgetreten");
      }
    }
  };

  // Verkaufsstatus aktualisieren
  const handleSaleUpdate = async (customerId: string, saleValue: string) => {
    setUpdatingCustomerId(customerId);
    try {
      await updateCustomer(customerId, { sale: saleValue });
      
      // Lokalen Zustand aktualisieren
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, sale: saleValue } 
            : customer
        )
      );
      
      toast.success("Verkaufsstatus aktualisiert");
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Verkaufsstatus:", error);
      toast.error("Beim Aktualisieren des Verkaufsstatus ist ein Fehler aufgetreten");
    } finally {
      setUpdatingCustomerId(null);
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

  // Hintergrundfarbe basierend auf dem Verkaufsstatus
  const getRowBgColor = (sale: string) => {
    switch (sale) {
      case "red": return "bg-red-50";
      case "green": return "bg-green-50";
      case "blue": return "bg-blue-50";
      case "yellow": return "bg-yellow-50";
      default: return "";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {isCustomerFormOpen && selectedCustomer && (
        <Dialog open={isCustomerFormOpen} onOpenChange={setIsCustomerFormOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Kunden bearbeiten</DialogTitle>
              <DialogDescription>
                Aktualisieren Sie die Kundeninformationen.
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
            <CardTitle>Verkaufssteuerung</CardTitle>
            <CardDescription>
              Verwalten Sie den Verkaufsstatus der Kunden.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Kunden suchen..."
                className="pl-8 w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>
            <Select
              value={saleFilter}
              onValueChange={setSaleFilter}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Verkaufsfilter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                {SALE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${option.bgColor}`}></div>
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Standort</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Verkaufsstatus</TableHead>
                    <TableHead>Erstellt am</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        {searchTerm ? "Keine Suchergebnisse gefunden." : "Es sind noch keine Kunden vorhanden."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id} className={getRowBgColor(customer.sale)}>
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
                          {customer.agent ? agentNames[customer.agent] || "Wird geladen..." : "-"}
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="w-[130px] justify-start" 
                                disabled={updatingCustomerId === customer.id}
                              >
                                {updatingCustomerId === customer.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <div className={`w-3 h-3 rounded-full mr-2 ${
                                    SALE_OPTIONS.find(opt => opt.value === customer.sale)?.bgColor || "bg-gray-100"
                                  }`}></div>
                                )}
                                {SALE_OPTIONS.find(opt => opt.value === customer.sale)?.label || "Keiner"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                              <div className="space-y-1 p-2">
                                {SALE_OPTIONS.map(option => (
                                  <Button
                                    key={option.value}
                                    variant="ghost"
                                    className="w-full justify-start"
                                    onClick={() => handleSaleUpdate(customer.id, option.value)}
                                  >
                                    <div className={`w-3 h-3 rounded-full mr-2 ${option.bgColor}`}></div>
                                    {option.label}
                                    {customer.sale === option.value && (
                                      <Check className="ml-auto h-4 w-4" />
                                    )}
                                  </Button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}