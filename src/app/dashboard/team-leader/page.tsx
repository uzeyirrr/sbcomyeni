"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { tr } from "date-fns/locale"; // Keep 'tr' if Turkish date formatting is intended elsewhere, otherwise change to 'de'
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  PhoneCall,
  Mail,
  MapPin,
  TrendingUp,
  Loader2,
  BarChart2,
  Trophy,
  Target,
  Star
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Customer } from "@/types/customer";
import { Team } from "@/types/team";
import { User } from "@/types/user";
import { getTeams } from "@/lib/team-service";
import { getUsers } from "@/lib/user-service";
import { getCustomersByAgent } from "@/lib/customer-service";
import { useAuth } from "@/hooks/use-auth";
import { AnalyticsChart } from "@/components/analytics-chart";
import { getFileUrl } from "@/lib/pocketbase";

export default function TeamLeaderDashboardPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [teamCustomers, setTeamCustomers] = useState<Customer[]>([]);
  const [analytics, setAnalytics] = useState({
    qcOn: [] as { label: string; value: number; percentage: number }[],
    qcFinal: [] as { label: string; value: number; percentage: number }[],
    sale: [] as { label: string; value: number; percentage: number }[],
    memberPerformance: [] as { label: string; value: number; percentage: number }[]
  });
  const [stats, setStats] = useState({
    total: 0,
    okeyCount: 0,
    rausgefallenCount: 0,
    aranacakCount: 0,
    todayCount: 0,
    weekCount: 0,
    monthCount: 0,
    averagePerMember: 0
  });

  useEffect(() => {
    loadTeams();
  }, [user?.id]);

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamData(selectedTeamId);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    if (teamCustomers.length > 0) {
      calculateAnalytics();
      calculateStats();
    }
  }, [teamCustomers, selectedPeriod, teamMembers]);

  const loadTeams = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const allTeams = await getTeams();
      setTeams(allTeams);

      // Wenn der Benutzer ein Teamleiter ist, wähle dieses Team aus
      const userTeam = allTeams.find(t => t.leader === user.id);
      if (userTeam) {
        setSelectedTeamId(userTeam.id);
      }
      // Andernfalls, wenn die Teamliste nicht leer ist, wähle das erste Team aus
      else if (allTeams.length > 0) {
        setSelectedTeamId(allTeams[0].id);
      }
    } catch (error) {
      console.error("Error loading teams:", error);
      toast.error("Beim Laden der Teams ist ein Fehler aufgetreten.");
    }
  };

  const loadTeamData = async (teamId: string) => {
    setIsLoading(true);
    try {
      const selectedTeam = teams.find(t => t.id === teamId);
      if (!selectedTeam) {
        toast.error("Das ausgewählte Team wurde nicht gefunden.");
        return;
      }

      setTeam(selectedTeam);

      // Teammitglieder abrufen
      const users = await getUsers();
      const members = users.filter(u => selectedTeam.members.includes(u.id));
      setTeamMembers(members);

      // Kunden aller Teammitglieder abrufen
      const allCustomers: Customer[] = [];
      for (const member of members) {
        const memberCustomers = await getCustomersByAgent(member.id);
        allCustomers.push(...memberCustomers);
      }
      setTeamCustomers(allCustomers);

    } catch (error) {
      console.error("Error loading team data:", error);
      toast.error("Beim Laden der Teamdaten ist ein Fehler aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAnalytics = () => {
    let filteredCustomers = [...teamCustomers];

    // Periodenfilterung
    if (selectedPeriod !== "all") {
      filteredCustomers = filterCustomersByPeriod(filteredCustomers, selectedPeriod);
    }

    const totalCustomers = filteredCustomers.length;
    if (totalCustomers === 0) return;

    // QC Vorab-Statusanalyse
    const qcOnCounts: Record<string, number> = {};
    filteredCustomers.forEach(customer => {
      const status = customer.qc_on || "Unbestimmt";
      qcOnCounts[status] = (qcOnCounts[status] || 0) + 1;
    });

    // QC Endgültige Statusanalyse
    const qcFinalCounts: Record<string, number> = {};
    filteredCustomers.forEach(customer => {
      const status = customer.qc_final || "Unbestimmt";
      qcFinalCounts[status] = (qcFinalCounts[status] || 0) + 1;
    });

    // Verkaufsstatusanalyse
    const saleCounts: Record<string, number> = {};
    filteredCustomers.forEach(customer => {
      const status = customer.sale || "none";
      saleCounts[status] = (saleCounts[status] || 0) + 1;
    });

    const saleLabels = {
      red: "Rot",
      green: "Grün",
      blue: "Blau",
      yellow: "Gelb",
      none: "Unbestimmt"
    };

    // Mitglieder-Leistungsanalyse
    const memberPerformance: Record<string, number> = {};
    teamMembers.forEach(member => {
      const memberCustomers = filteredCustomers.filter(c => c.agent === member.id);
      memberPerformance[member.name] = memberCustomers.length;
    });

    setAnalytics({
      qcOn: Object.entries(qcOnCounts).map(([label, value]) => ({
        label,
        value,
        percentage: Math.round((value / totalCustomers) * 100)
      })),
      qcFinal: Object.entries(qcFinalCounts).map(([label, value]) => ({
        label,
        value,
        percentage: Math.round((value / totalCustomers) * 100)
      })),
      sale: Object.entries(saleCounts).map(([label, value]) => ({
        label: saleLabels[label as keyof typeof saleLabels] || label,
        value,
        percentage: Math.round((value / totalCustomers) * 100)
      })),
      memberPerformance: Object.entries(memberPerformance).map(([label, value]) => ({
        label,
        value,
        percentage: Math.round((value / totalCustomers) * 100)
      }))
    });
  };

  const calculateStats = () => {
    let filteredCustomers = [...teamCustomers];

    // Periodenfilterung
    if (selectedPeriod !== "all") {
      filteredCustomers = filterCustomersByPeriod(filteredCustomers, selectedPeriod);
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    setStats({
      total: filteredCustomers.length,
      okeyCount: filteredCustomers.filter(c => c.qc_final === "Okey").length,
      rausgefallenCount: filteredCustomers.filter(c =>
        c.qc_final === "Rausgefallen" || c.qc_final === "Rausgefallen WP"
      ).length,
      aranacakCount: filteredCustomers.filter(c => c.qc_on === "Aranacak").length,
      todayCount: filteredCustomers.filter(c => new Date(c.created) >= todayStart).length,
      weekCount: filteredCustomers.filter(c => new Date(c.created) >= weekStart).length,
      monthCount: filteredCustomers.filter(c => new Date(c.created) >= monthStart).length,
      averagePerMember: Math.round(filteredCustomers.length / (teamMembers.length || 1))
    });
  };

  const filterCustomersByPeriod = (customers: Customer[], period: string) => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));
    const last3MonthStart = startOfMonth(subMonths(today, 3));

    return customers.filter(customer => {
      const customerDate = new Date(customer.created);

      switch (period) {
        case "current":
          return customerDate >= monthStart && customerDate <= monthEnd;
        case "last1":
          return customerDate >= lastMonthStart && customerDate <= lastMonthEnd;
        case "last3":
          return customerDate >= last3MonthStart && customerDate <= today;
        default:
          return true;
      }
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Team-Dashboard</h1>
          {team && (
            <p className="text-muted-foreground">
              {team.name} - {teamMembers.length} Mitglieder
            </p>
          )}
        </div>
        <div className="flex gap-4">
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-[200px]">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Team auswählen" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Zeitraum auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Gesamtzeit</SelectItem>
              <SelectItem value="current">Dieser Monat</SelectItem>
              <SelectItem value="last1">Letzter Monat</SelectItem>
              <SelectItem value="last3">Letzte 3 Monate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Zusammenfassende Statistiken */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesamtkunden</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  Alle Teamkunden
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Durchschnitt pro Mitglied</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averagePerMember}</div>
                <p className="text-xs text-muted-foreground">
                  Kunden pro Mitglied
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Okey-Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.total > 0 ? Math.round((stats.okeyCount / stats.total) * 100) : 0}%
                </div>
                <Progress
                  value={stats.total > 0 ? (stats.okeyCount / stats.total) * 100 : 0}
                  className="h-2 mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rausgefallen-Rate</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.total > 0 ? Math.round((stats.rausgefallenCount / stats.total) * 100) : 0}%
                </div>
                <Progress
                  value={stats.total > 0 ? (stats.rausgefallenCount / stats.total) * 100 : 0}
                  className="h-2 mt-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* Zeitbasierte Statistiken */}
          <Card>
            <CardHeader>
              <CardTitle>Zeitbasierte Statistiken</CardTitle>
              <CardDescription>
                Anzahl der hinzugefügten Kunden in verschiedenen Zeiträumen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-blue-700">Heute</h3>
                    <Clock className="h-4 w-4 text-blue-700" />
                  </div>
                  <p className="text-2xl font-bold text-blue-700 mt-2">{stats.todayCount}</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-green-700">Diese Woche</h3>
                    <Calendar className="h-4 w-4 text-green-700" />
                  </div>
                  <p className="text-2xl font-bold text-green-700 mt-2">{stats.weekCount}</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-purple-700">Dieser Monat</h3>
                    <BarChart2 className="h-4 w-4 text-purple-700" />
                  </div>
                  <p className="text-2xl font-bold text-purple-700 mt-2">{stats.monthCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analyse-Diagramme */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Mitglieder-Leistungsanalyse</CardTitle>
                <CardDescription>
                  Kundenverteilung unter den Teammitgliedern
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  title=""
                  data={analytics.memberPerformance}
                  colors={["primary", "secondary", "success", "warning", "danger"]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>QC Endgültige Statusanalyse</CardTitle>
                <CardDescription>
                  Endgültige Qualitätskontrollstatus der Teamkunden
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
          </div>

          {/* Teammitglieder */}
          <Card>
            <CardHeader>
              <CardTitle>Teammitglieder</CardTitle>
              <CardDescription>
                Detaillierte Leistungsinformationen der Teammitglieder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.map((member) => {
                  const memberCustomers = teamCustomers.filter(c => c.agent === member.id);
                  const okeyCount = memberCustomers.filter(c => c.qc_final === "Okey").length;
                  const rausgefallenCount = memberCustomers.filter(c =>
                    c.qc_final === "Rausgefallen" || c.qc_final === "Rausgefallen WP"
                  ).length;

                  return (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-muted/10 rounded-lg">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage
                            src={member.avatar ? getFileUrl('users', member.id, member.avatar) : ''}
                            alt={member.name}
                          />
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {memberCustomers.length} Kunden
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {okeyCount} Okey
                            </span>
                            <span className="flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              {rausgefallenCount} Rausgefallen
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Progress
                          value={stats.total > 0 ? (memberCustomers.length / stats.total) * 100 : 0}
                          className="h-2 w-32"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Team-Anteil: {stats.total > 0 ? Math.round((memberCustomers.length / stats.total) * 100) : 0}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}