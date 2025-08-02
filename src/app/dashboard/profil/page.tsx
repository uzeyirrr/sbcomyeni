"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, User, Mail, Phone, MapPin, Edit, Save, X, Calendar, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFileUrl, pb, getCurrentUser } from "@/lib/pocketbase";
import { getCustomersByAgent, Customer } from "@/lib/customer-service";
import { updateUser, User as UserType } from "@/lib/user-service";
import { formatDate } from "@/lib/utils";
import { format, parse, isValid, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Chart component
const AnalyticsChart = ({ 
  title, 
  data, 
  colors 
}: { 
  title: string; 
  data: { label: string; value: number; percentage: number }[]; 
  colors: string[] 
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{title}</h3>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{item.label}</span>
              <span>{item.value} Kunden ({item.percentage}%)</span>
            </div>
            <Progress 
              value={item.percentage} 
              color={colors[index % colors.length]}
              size="md" 
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserType | null>(null);
  const [avatarFallback, setAvatarFallback] = useState<string>('K');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<Partial<UserType>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc"); // Default to newest to oldest
  const [analytics, setAnalytics] = useState({
    qcOn: [] as { label: string; value: number; percentage: number }[],
    qcFinal: [] as { label: string; value: number; percentage: number }[],
    sale: [] as { label: string; value: number; percentage: number }[]
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

  // Load user and customer data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Get current user
        const currentUser = getCurrentUser();
        if (currentUser) {
          setUser(currentUser as unknown as UserType);
          setEditedUser({
            name: (currentUser as any).name || "",
            email: (currentUser as any).email || "",
          });
          
          // Get user's customers
          const userCustomers = await getCustomersByAgent((currentUser as any).id);
          
          // Sort by newest to oldest by default
          const sortedCustomers = [...userCustomers].sort((a, b) => {
            return new Date(b.created).getTime() - new Date(a.created).getTime();
          });
          
          setCustomers(sortedCustomers);
          setFilteredCustomers(sortedCustomers);
          
          // Calculate analytics data
          calculateAnalytics(userCustomers);
        }
      } catch (error) {
        console.error("Error loading profile data:", error);
        toast.error("Beim Laden der Profildaten ist ein Fehler aufgetreten.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Filter customers when month filter or sort order changes
  useEffect(() => {
    if (customers.length === 0) return;
    
    let filtered = [...customers];
    
    // Apply month filter
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
    
    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.created).getTime();
      const dateB = new Date(b.created).getTime();
      return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
    });
    
    setFilteredCustomers(filtered);
  }, [customers, selectedMonth, sortDirection]);
  
  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "desc" ? "asc" : "desc");
  };

  // Calculate analytics data
  const calculateAnalytics = (customerData: Customer[]) => {
    const totalCustomers = customerData.length;
    if (totalCustomers === 0) {
      setAnalytics({
        qcOn: [{ label: "Keine Daten", value: 0, percentage: 0 }],
        qcFinal: [{ label: "Keine Daten", value: 0, percentage: 0 }],
        sale: [{ label: "Keine Daten", value: 0, percentage: 0 }]
      });
      return;
    }
    
    // QC On status analysis
    const qcOnCounts: Record<string, number> = {};
    customerData.forEach(customer => {
      const status = customer.qc_on || "Unspecified";
      qcOnCounts[status] = (qcOnCounts[status] || 0) + 1;
    });
    
    const qcOnAnalytics = Object.entries(qcOnCounts).map(([label, value]) => ({
      label,
      value,
      percentage: Math.round((value / totalCustomers) * 100)
    })).sort((a, b) => b.value - a.value);
    
    // QC Final status analysis
    const qcFinalCounts: Record<string, number> = {};
    customerData.forEach(customer => {
      const status = customer.qc_final || "Unspecified";
      qcFinalCounts[status] = (qcFinalCounts[status] || 0) + 1;
    });
    
    const qcFinalAnalytics = Object.entries(qcFinalCounts).map(([label, value]) => ({
      label,
      value,
      percentage: Math.round((value / totalCustomers) * 100)
    })).sort((a, b) => b.value - a.value);
    
    // Sale status analysis
    const saleCounts: Record<string, number> = {};
    customerData.forEach(customer => {
      const status = customer.sale || "none";
      saleCounts[status] = (saleCounts[status] || 0) + 1;
    });
    
    const saleAnalytics = Object.entries(saleCounts).map(([label, value]) => {
      let displayLabel = label;
      switch (label) {
        case "red": displayLabel = "Rot"; break;
        case "green": displayLabel = "Grün"; break;
        case "blue": displayLabel = "Blau"; break;
        case "yellow": displayLabel = "Gelb"; break;
        case "none": displayLabel = "Nicht spezifiziert"; break;
      }
      
      return {
        label: displayLabel,
        value,
        percentage: Math.round((value / totalCustomers) * 100)
      };
    }).sort((a, b) => b.value - a.value);
    
    setAnalytics({
      qcOn: qcOnAnalytics,
      qcFinal: qcFinalAnalytics,
      sale: saleAnalytics
    });
  };

  // Update profile
  const handleProfileUpdate = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const result = await updateUser(user.id, editedUser);
      if (result.success) {
        toast.success("Profil erfolgreich aktualisiert");
        setUser({ ...user, ...editedUser } as UserType);
        setIsEditing(false);
      } else {
        toast.error("Beim Aktualisieren des Profils ist ein Fehler aufgetreten");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Beim Aktualisieren des Profils ist ein Fehler aufgetreten");
    } finally {
      setIsLoading(false);
    }
  };

  // Background color based on sale status
  const getRowBgColor = (sale: string) => {
    switch (sale) {
      case "red": return "bg-red-50";
      case "green": return "bg-green-50";
      case "blue": return "bg-blue-50";
      case "yellow": return "bg-yellow-50";
      default: return "";
    }
  };

  // Label based on sale status
  const getSaleLabel = (sale: string) => {
    switch (sale) {
      case "red": return <span className="text-red-700 bg-red-100 px-2 py-1 rounded-full">Rot</span>;
      case "green": return <span className="text-green-700 bg-green-100 px-2 py-1 rounded-full">Grün</span>;
      case "blue": return <span className="text-blue-700 bg-blue-100 px-2 py-1 rounded-full">Blau</span>;
      case "yellow": return <span className="text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">Gelb</span>;
      default: return <span className="text-gray-700 bg-gray-100 px-2 py-1 rounded-full">Nicht spezifiziert</span>;
    }
  };

  // Update avatar fallback
  useEffect(() => {
    if (user?.name) {
      setAvatarFallback(user.name.charAt(0).toUpperCase());
    }
  }, [user?.name]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {isLoading && !user ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Profile Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Profilinformationen</CardTitle>
                <CardDescription>
                  Ihre persönlichen Informationen ansehen und bearbeiten.
                </CardDescription>
              </div>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Bearbeiten
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Abbrechen
                  </Button>
                  <Button onClick={handleProfileUpdate} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Speichern
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={user?.avatar ? getFileUrl('users', user.id, user.avatar) : ''} 
                      alt={user?.name || 'Benutzer'} 
                    />
                    <AvatarFallback>
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h3 className="text-lg font-medium">{user?.name}</h3>
                    <p className="text-sm text-muted-foreground">{user?.role || 'Benutzer'}</p>
                  </div>
                </div>
                
                <div className="flex-1 space-y-4">
                  {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">Name</label>
                        <Input
                          id="name"
                          value={editedUser.name || ''}
                          onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">E-Mail</label>
                        <Input
                          id="email"
                          type="email"
                          value={editedUser.email || ''}
                          onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium">{user?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">E-Mail</p>
                          <p className="font-medium">{user?.email}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Customer and Analytics Tabs */}
          <Tabs defaultValue="customers" className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="customers">Meine Kunden</TabsTrigger>
              <TabsTrigger value="analytics">Analysen</TabsTrigger>
            </TabsList>
            
            {/* Customers Tab */}
            <TabsContent value="customers" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Meine Kunden</CardTitle>
                      <CardDescription>
                        Eine Liste der Ihnen zugewiesenen Kunden.
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={toggleSortDirection}
                          className="flex items-center space-x-1"
                        >
                          {sortDirection === "desc" ? (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              <span>Neueste zuerst</span>
                            </>
                          ) : (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              <span>Älteste zuerst</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <div>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                          <SelectTrigger className="w-[180px]">
                            <Calendar className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Nach Monat filtern" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle Zeiten</SelectItem>
                            <SelectItem value="current">Dieser Monat</SelectItem>
                            <SelectItem value="last1">Letzter Monat</SelectItem>
                            <SelectItem value="last3">Letzte 3 Monate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
                          <TableHead>QC-Status (On)</TableHead>
                          <TableHead>QC-Status (Final)</TableHead>
                          <TableHead>Verkaufsstatus</TableHead>
                          <TableHead>Erstellt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center h-24">
                              {customers.length === 0 ? "Ihnen sind noch keine Kunden zugewiesen." : "Keine Kunden für die ausgewählten Filter gefunden."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCustomers.map((customer) => (
                            <TableRow key={customer.id} className={getRowBgColor(customer.sale)}>
                              <TableCell className="font-medium">
                                {customer.name} {customer.surname}
                                {customer.note && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-2"
                                    onClick={() => {
                                      setSelectedCustomer(customer);
                                      setIsNoteDialogOpen(true);
                                    }}
                                  >
                                    Notiz ansehen
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    <span>{customer.tel}</span>
                                  </div>
                                  {customer.email && (
                                    <div className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      <span className="text-xs">{customer.email}</span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{customer.location}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                                  {(() => {
                                    switch (customer.qc_on) {
                                      case "Yeni":
                                        return <span className="text-blue-700 bg-blue-100 px-2 py-1 rounded-full">Neu</span>;
                                      case "Aranacak":
                                        return <span className="text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">Anzurufen</span>;
                                      case "Rausgefallen":
                                        return <span className="text-red-700 bg-red-100 px-2 py-1 rounded-full">Abgelehnt</span>;
                                      case "Rausgefallen WP":
                                        return <span className="text-purple-700 bg-purple-100 px-2 py-1 rounded-full">Abgelehnt WP</span>;
                                      default:
                                        return <span className="text-gray-700 bg-gray-100 px-2 py-1 rounded-full">{customer.qc_on || "Nicht spezifiziert"}</span>;
                                    }
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                                  {(() => {
                                    switch (customer.qc_final) {
                                      case "Yeni":
                                        return <span className="text-blue-700 bg-blue-100 px-2 py-1 rounded-full">Neu</span>;
                                      case "Okey":
                                        return <span className="text-green-700 bg-green-100 px-2 py-1 rounded-full">Okay</span>;
                                      case "Rausgefallen":
                                        return <span className="text-red-700 bg-red-100 px-2 py-1 rounded-full">Abgelehnt</span>;
                                      case "Rausgefallen WP":
                                        return <span className="text-purple-700 bg-purple-100 px-2 py-1 rounded-full">Abgelehnt WP</span>;
                                      case "Neuleger":
                                        return <span className="text-orange-700 bg-orange-100 px-2 py-1 rounded-full">Neuaufnahme</span>;
                                      case "Neuleger WP":
                                        return <span className="text-pink-700 bg-pink-100 px-2 py-1 rounded-full">Neuaufnahme WP</span>;
                                      default:
                                        return <span className="text-gray-700 bg-gray-100 px-2 py-1 rounded-full">{customer.qc_final || "Nicht spezifiziert"}</span>;
                                    }
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getSaleLabel(customer.sale)}
                              </TableCell>
                              <TableCell>{formatDate(customer.created)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>QC-Status (On) Analyse</CardTitle>
                    <CardDescription>
                      Die anfänglichen Qualitätskontroll-Status Ihrer Kunden.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsChart 
                      title="" 
                      data={analytics.qcOn} 
                      colors={["primary", "secondary", "success", "warning", "danger"]} 
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>QC-Status (Final) Analyse</CardTitle>
                    <CardDescription>
                      Die finalen Qualitätskontroll-Status Ihrer Kunden.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsChart 
                      title="" 
                      data={analytics.qcFinal} 
                      colors={["success", "primary", "danger", "warning", "secondary"]} 
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Verkaufsstatus Analyse</CardTitle>
                    <CardDescription>
                      Die Verkaufs-Status Ihrer Kunden.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsChart 
                      title="" 
                      data={analytics.sale} 
                      colors={["danger", "success", "primary", "warning", "secondary"]} 
                    />
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Allgemeine Statistiken</CardTitle>
                  <CardDescription>
                    Gesamtstatistiken bezüglich Ihrer Kunden.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-blue-700">Gesamtkunden</h3>
                      <p className="text-3xl font-bold">{customers.length}</p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-green-700">Im Status "Okay"</h3>
                      <p className="text-3xl font-bold">
                        {customers.filter(c => c.qc_final === "Okey").length}
                      </p>
                    </div>
                    
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-yellow-700">Im Status "Anzurufen"</h3>
                      <p className="text-3xl font-bold">
                        {customers.filter(c => c.qc_on === "Aranacak").length}
                      </p>
                    </div>
                    
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-red-700">Im Status "Abgelehnt"</h3>
                      <p className="text-3xl font-bold">
                        {customers.filter(c => c.qc_final === "Rausgefallen" || c.qc_final === "Rausgefallen WP").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Note Viewing Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer?.name} {selectedCustomer?.surname} - Kundennotiz
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="whitespace-pre-wrap">{selectedCustomer?.note}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}