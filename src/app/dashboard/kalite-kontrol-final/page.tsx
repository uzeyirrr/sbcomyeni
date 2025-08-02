"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, Loader2, CalendarIcon, Filter, Trash2, Edit } from "lucide-react";
import { Customer } from "@/types/customer";
import { 
  getCustomers, 
  searchCustomers, 
  deleteCustomer, 
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
import { CustomerForm } from "@/components/customers/customer-form";
import { KanbanBoardFinal } from "@/components/kanban/kanban-board-final";
import { formatDate } from "@/lib/utils";

export default function QCFinalPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<"daily" | "weekly" | "monthly" | "all">("all");
  const [qcFilter, setQcFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);

  // Sayfa yüklenirken localStorage'dan filtreleme tercihlerini al
  useEffect(() => {
    const savedDateFilter = localStorage.getItem('qcFinalDateFilter');
    const savedQcFilter = localStorage.getItem('qcFinalStatusFilter');
    
    if (savedDateFilter) {
      setDateFilter(savedDateFilter as "daily" | "weekly" | "monthly" | "all");
    }
    
    if (savedQcFilter) {
      setQcFilter(savedQcFilter);
    }
    
    fetchCustomers();
    
    // Gerçek zamanlı güncellemelere abone ol
    subscribeToCustomers(handleRealtimeUpdate);
    
    // Component unmount olduğunda aboneliği iptal et
    return () => {
      unsubscribeFromCustomers();
    };
  }, []);

  // Arama ve filtreleme
  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, qcFilter]);
  
  // Filtreleme tercihleri değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('qcFinalDateFilter', dateFilter);
  }, [dateFilter]);
  
  useEffect(() => {
    localStorage.setItem('qcFinalStatusFilter', qcFilter);
  }, [qcFilter]);

  // Gerçek zamanlı güncellemeleri işle
  const handleRealtimeUpdate = (event: RealtimeCustomerEvent) => {
    const { action, record } = event;
    
    // Sadece qc_on durumu "Aranacak" olan müşterileri işle
    if (record.qc_on !== "Aranacak") return;
    
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
      
      // Sadece qc_on durumu "Aranacak" olan müşterileri filtrele
      fetchedCustomers = fetchedCustomers.filter(customer => customer.qc_on === "Aranacak");
      
      // En son eklenen en üstte olacak şekilde sırala
      fetchedCustomers.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
      
      setCustomers(fetchedCustomers);
      filterCustomers(fetchedCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Fehler beim Laden der Kunden.");
    } finally {
      setIsLoading(false);
    }
  };

  const filterCustomers = (customersToFilter = customers) => {
    let filtered = [...customersToFilter];
    
    // QC durumuna göre filtrele
    if (qcFilter !== "all") {
      filtered = filtered.filter(customer => customer.qc_final === qcFilter);
    }
    
    setFilteredCustomers(filtered);
  };
  
  // Müşteri silme işlemi
  const handleDeleteCustomer = async (id: string) => {
    if (confirm("Sind Sie sicher, dass Sie diesen Kunden löschen möchten?")) {
      try {
        const success = await deleteCustomer(id);
        if (success) {
          toast.success("Kunde erfolgreich gelöscht");
          fetchCustomers(); // Müşteri listesini yenile
        } else {
          toast.error("Fehler beim Löschen des Kunden");
        }
      } catch (error) {
        console.error("Error deleting customer:", error);
        toast.error("Fehler beim Löschen des Kunden");
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  // Müşteri formunu kapat ve müşteri listesini yenile
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
              <DialogTitle>Kunde bearbeiten</DialogTitle>
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
            <CardTitle>Qualitätskontrolle Final</CardTitle>
            <CardDescription>
              Verwalten Sie die finalen Qualitätskontrollstatus von zu kontaktierenden Kunden.
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
              <KanbanBoardFinal 
                customers={customers} 
                onCustomersUpdated={fetchCustomers} 
                dateFilter={dateFilter}
              />
              
              {/* Müşteri Listesi */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Kundenliste (Zu kontaktieren)</CardTitle>
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
                          <SelectItem value="Okey">Okey</SelectItem>
                          <SelectItem value="Rausgefallen">Rausgefallen</SelectItem>
                          <SelectItem value="Rausgefallen WP">Rausgefallen WP</SelectItem>
                          <SelectItem value="Neuleger">Neuleger</SelectItem>
                          <SelectItem value="Neuleger WP">Neuleger WP</SelectItem>
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
                          <TableHead>Final Status</TableHead>
                          <TableHead>Erstellt</TableHead>
                          <TableHead>Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">
                              {searchTerm ? "Keine Suchergebnisse gefunden." : "Noch keine zu kontaktierenden Kunden vorhanden."}
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
                                    switch (customer.qc_final) {
                                      case "Yeni":
                                        return <span className="text-blue-700 bg-blue-100 px-2 py-1 rounded-full">Neu</span>;
                                      case "Okey":
                                        return <span className="text-green-700 bg-green-100 px-2 py-1 rounded-full">Okey</span>;
                                      case "Rausgefallen":
                                        return <span className="text-red-700 bg-red-100 px-2 py-1 rounded-full">Rausgefallen</span>;
                                      case "Rausgefallen WP":
                                        return <span className="text-purple-700 bg-purple-100 px-2 py-1 rounded-full">Rausgefallen WP</span>;
                                      case "Neuleger":
                                        return <span className="text-orange-700 bg-orange-100 px-2 py-1 rounded-full">Neuleger</span>;
                                      case "Neuleger WP":
                                        return <span className="text-pink-700 bg-pink-100 px-2 py-1 rounded-full">Neuleger WP</span>;
                                      default:
                                        return <span className="text-gray-700 bg-gray-100 px-2 py-1 rounded-full">{customer.qc_final}</span>;
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
