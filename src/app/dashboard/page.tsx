"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Building2, BarChart, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCustomerStatistics, getLatestCustomers, Customer } from "@/lib/customer-service";
import { getUserPerformanceStats } from "@/lib/user-service";
import { getTeamPerformanceStats } from "@/lib/team-service";
import { getFileUrl } from "@/lib/pocketbase";

// Analiz grafiği bileşeni
const AnalyticsChart = ({ 
  title, 
  data
}: { 
  title: string; 
  data: { label: string; value: number; percentage: number; originalLabel?: string }[]; 
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
              className={`h-2 ${item.originalLabel ? `bg-${item.originalLabel}-100` : ''}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// Tip tanımları
interface UserStats {
  totalUsers: number;
  averageCustomersPerUser: number;
  topUsers: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
    customerCount: number;
  }>;
}

interface TeamStats {
  totalTeams: number;
  topTeams: Array<{
    team: {
      id: string;
      name: string;
      expand?: {
        leader?: {
          name: string;
        };
        members?: Array<{
          id: string;
          name: string;
          avatar?: string;
        }>;
      };
    };
    customerCount: number;
  }>;
}

interface CustomerStats {
  totalCustomers: number;
  qcOnStats: Array<{ label: string; value: number; percentage: number }>;
  qcFinalStats: Array<{ label: string; value: number; percentage: number }>;
  saleStats: Array<{ label: string; value: number; percentage: number }>;
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [latestCustomers, setLatestCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        // Müşteri istatistiklerini yükle
        const customerStatistics = await getCustomerStatistics();
        setCustomerStats(customerStatistics);
        
        // Kullanıcı performans istatistiklerini yükle
        const userPerformance = await getUserPerformanceStats();
        setUserStats(userPerformance);
        
        // Takım performans istatistiklerini yükle
        const teamPerformance = await getTeamPerformanceStats();
        setTeamStats(teamPerformance);
        
        // Son eklenen müşterileri yükle
        const latest = await getLatestCustomers(5);
        setLatestCustomers(latest);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDashboardData();
  }, []);

  // QC durumuna göre etiket rengi
  const getQcStatusColor = (status: string | null) => {
    switch (status) {
      case "Yeni": return "text-blue-700 bg-blue-100";
      case "Aranacak": return "text-yellow-700 bg-yellow-100";
      case "Okey": return "text-green-700 bg-green-100";
      case "Rausgefallen": return "text-red-700 bg-red-100";
      case "Rausgefallen WP": return "text-purple-700 bg-purple-100";
      case "Neuleger": return "text-indigo-700 bg-indigo-100";
      case "Neuleger WP": return "text-pink-700 bg-pink-100";
      default: return "text-gray-700 bg-gray-100";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Willkommen! Hier können Sie den allgemeinen Status Ihres CRM-Systems verfolgen.
        </p>
      </div>
      
      {/* Özet Kartları */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamte Kunden</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerStats?.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Alle Kundenaufzeichnungen
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamte Benutzer</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Aktive Systembenutzer
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamte Teams</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats?.totalTeams || 0}</div>
            <p className="text-xs text-muted-foreground">
              Aktive Arbeitsteams
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durchschnitt pro Person</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.averageCustomersPerUser || 0}</div>
            <p className="text-xs text-muted-foreground">
              Kunden pro Benutzer
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Müşteri Analizleri und Sonstige */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Müşteri Analysen */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Kundenanalysen</CardTitle>
            <CardDescription>
              Allgemeine Analyse der Kundenstatus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="qc-on">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="qc-on">QC Vor-Status</TabsTrigger>
                <TabsTrigger value="qc-final">QC Final-Status</TabsTrigger>
                <TabsTrigger value="sale">Verkaufsstatus</TabsTrigger>
              </TabsList>
              
              <TabsContent value="qc-on" className="mt-4">
                <AnalyticsChart 
                  title="Vor-Qualitätskontrolle Status" 
                  data={customerStats?.qcOnStats || []} 
                />
              </TabsContent>
              
              <TabsContent value="qc-final" className="mt-4">
                <AnalyticsChart 
                  title="Final-Qualitätskontrolle Status" 
                  data={customerStats?.qcFinalStats || []} 
                />
              </TabsContent>
              
              <TabsContent value="sale" className="mt-4">
                <AnalyticsChart 
                  title="Verkaufsstatus" 
                  data={customerStats?.saleStats || []} 
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Son Eklenen Müşteriler */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Zuletzt hinzugefügte Kunden</CardTitle>
            <CardDescription>
              Die letzten 5 Kunden im System
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {latestCustomers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Noch keine Kundenaufzeichnungen vorhanden.</p>
              ) : (
                latestCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${customer.sale === 'red' ? 'bg-red-500' : customer.sale === 'green' ? 'bg-green-500' : customer.sale === 'blue' ? 'bg-blue-500' : customer.sale === 'yellow' ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{customer.name} {customer.surname}</p>
                      <p className="text-xs text-muted-foreground">{customer.location}, {customer.tel}</p>
                    </div>
                    <div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getQcStatusColor(customer.qc_on)}`}>
                        {customer.qc_on || "Neu"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Performans Analysen */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Beste Benutzer */}
        <Card>
          <CardHeader>
            <CardTitle>Beste Benutzer</CardTitle>
            <CardDescription>
              Benutzer mit den meisten Kunden
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userStats?.topUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Noch keine Benutzerdaten vorhanden.</p>
              ) : (
                userStats?.topUsers.map((item, index: number) => (
                  <div key={item.user.id} className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium">
                      {index + 1}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={item.user.avatar} alt={item.user.name} />
                      <AvatarFallback>{item.user.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.user.name}</p>
                      <p className="text-xs text-muted-foreground">{item.user.email}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.customerCount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Beste Teams */}
        <Card>
          <CardHeader>
            <CardTitle>Beste Teams</CardTitle>
            <CardDescription>
              Teams mit den meisten Kunden
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamStats?.topTeams.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Noch keine Teamdaten vorhanden.</p>
              ) : (
                teamStats?.topTeams.map((item, index: number) => (
                  <div key={item.team.id} className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.team.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.team.expand?.leader?.name ? `Leiter: ${item.team.expand.leader.name}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {item.team.expand?.members?.slice(0, 3).map((member) => (
                          <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                            <AvatarImage 
                              src={member.avatar ? getFileUrl('users', member.id, member.avatar) : ''} 
                              alt={member.name} 
                            />
                            <AvatarFallback className="text-xs">{member.name?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                        ))}
                        {item.team.expand?.members && item.team.expand.members.length > 3 && (
                          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-medium">
                            +{item.team.expand.members.length - 3}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.customerCount}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
