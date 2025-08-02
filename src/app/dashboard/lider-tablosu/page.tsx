"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Users, User, Medal } from "lucide-react";
import { getCustomers } from "@/lib/customer-service";
import { getUsers } from "@/lib/user-service";
import { getTeams } from "@/lib/team-service";
import { Customer } from "@/types/customer";
import { User as UserType } from "@/lib/user-service";
import { Team } from "@/types/team";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFileUrl } from "@/lib/pocketbase";

// Benutzertyp für die Bestenliste
interface LeaderboardUser extends UserType {
  customerCount: number;
  rank: number;
}

// Teamtyp für die Bestenliste
interface LeaderboardTeam extends Omit<Team, 'members'> {
  customerCount: number;
  rank: number;
  members: LeaderboardUser[];
  description?: string;
}

export default function LeaderboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [teams, setTeams] = useState<LeaderboardTeam[]>([]);
  const [maxUserCustomers, setMaxUserCustomers] = useState(0);
  const [maxTeamCustomers, setMaxTeamCustomers] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Alle Daten abrufen
      const [allCustomers, allUsers, allTeams] = await Promise.all([
        getCustomers(),
        getUsers(),
        getTeams(),
      ]);

      // Benutzer-Bestenliste erstellen
      const userMap = new Map<string, number>();

      // Agenten für jeden Kunden zählen
      allCustomers.forEach((customer: Customer) => {
        if (customer.agent) {
          userMap.set(customer.agent, (userMap.get(customer.agent) || 0) + 1);
        }
      });

      // Benutzer nach Kundenzahl sortieren und nur Agenten filtern
      const leaderboardUsers = allUsers
        .filter((user: UserType) => user.role === "agent") // Nur Benutzer mit der Rolle "agent" filtern
        .map((user: UserType) => ({
          ...user,
          customerCount: userMap.get(user.id) || 0,
          rank: 0, // Temporärer Wert, wird unten aktualisiert
        }))
        .sort((a, b) => b.customerCount - a.customerCount);

      // Ränge hinzufügen
      leaderboardUsers.forEach((user, index) => {
        user.rank = index + 1;
      });

      // Die maximale Kundenzahl des Benutzers finden
      const maxUsers = leaderboardUsers.length > 0 ? leaderboardUsers[0].customerCount : 0;
      setMaxUserCustomers(maxUsers);
      setUsers(leaderboardUsers);

      // Team-Bestenliste erstellen
      const teamCustomers = new Map<string, number>();
      const teamMembersMap = new Map<string, string[]>();

      // Teammitglieder vorbereiten
      allTeams.forEach((team: Team) => {
        if (team.members && Array.isArray(team.members)) {
          teamMembersMap.set(team.id, team.members);
        } else {
          teamMembersMap.set(team.id, []);
        }
        teamCustomers.set(team.id, 0);
      });

      // Team für jeden Kunden zählen
      allCustomers.forEach((customer: Customer) => {
        if (customer.agent) {
          // Teams finden, zu denen der Agent gehört
          teamMembersMap.forEach((members, teamId) => {
            if (customer.agent && members.includes(customer.agent)) {
              teamCustomers.set(teamId, (teamCustomers.get(teamId) || 0) + 1);
            }
          });
        }
      });

      // Teams nach Kundenzahl sortieren
      const leaderboardTeams = allTeams
        .map((team: Team) => ({
          ...team,
          customerCount: teamCustomers.get(team.id) || 0,
          rank: 0, // Temporärer Wert, wird unten aktualisiert
          members: [], // Temporärer Wert, wird unten aktualisiert
        }))
        .sort((a, b) => b.customerCount - a.customerCount);

      // Ränge hinzufügen
      leaderboardTeams.forEach((team, index) => {
        team.rank = index + 1;

        // Teammitglieder hinzufügen
        const memberIds = teamMembersMap.get(team.id) || [];
        team.members = leaderboardUsers.filter(user => memberIds.includes(user.id));
      });

      // Die maximale Kundenzahl des Teams finden
      const maxTeams = leaderboardTeams.length > 0 ? leaderboardTeams[0].customerCount : 0;
      setMaxTeamCustomers(maxTeams);
      setTeams(leaderboardTeams);

    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      toast.error("Beim Laden der Bestenlistendaten ist ein Fehler aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  // Medaillen-Icon abrufen
  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Medal className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-700" />;
      default:
        return <span className="w-6 h-6 inline-flex items-center justify-center font-bold">{rank}</span>;
    }
  };

  // Avatar-URL erstellen
  const getAvatarUrl = (user: UserType) => {
    if (user.avatar) {
      return getFileUrl('users', user.id, user.avatar);
    }
    return '';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bestenliste</CardTitle>
          <CardDescription>
            Die Agenten und Teams mit den meisten Kunden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="users" className="space-y-6">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                <TabsTrigger value="users">
                  <User className="h-4 w-4 mr-2" />
                  Agenten
                </TabsTrigger>
                <TabsTrigger value="teams">
                  <Users className="h-4 w-4 mr-2" />
                  Teams
                </TabsTrigger>
              </TabsList>

              {/* Agenten-Tabelle */}
              <TabsContent value="users" className="space-y-8">
                {/* Top 3 Agenten */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {users.slice(0, 3).map((user) => (
                    <Card key={user.id} className={`overflow-hidden ${
                      user.rank === 1 ? 'border-yellow-500 shadow-yellow-100' :
                      user.rank === 2 ? 'border-gray-400 shadow-gray-100' :
                      'border-amber-700 shadow-amber-100'
                    }`}>
                      <div className={`h-2 w-full ${
                        user.rank === 1 ? 'bg-yellow-500' :
                        user.rank === 2 ? 'bg-gray-400' :
                        'bg-amber-700'
                      }`}></div>
                      <CardContent className="pt-6 text-center">
                        <div className="flex justify-center mb-4">
                          <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                            <AvatarImage src={getAvatarUrl(user)} alt={user.name} />
                            <AvatarFallback className="text-lg">
                              {user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="absolute top-4 right-4">
                          {getMedalIcon(user.rank)}
                        </div>
                        <h3 className="text-lg font-bold">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="mt-4">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Kundenanzahl</span>
                            <span className="text-sm font-bold">{user.customerCount}</span>
                          </div>
                          <Progress value={(user.customerCount / maxUserCustomers) * 100} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Andere Agenten */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Andere Agenten</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {users.slice(3).map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              {getMedalIcon(user.rank)}
                            </div>
                            <div className="flex-shrink-0">
                              <Avatar>
                                <AvatarImage src={getAvatarUrl(user)} alt={user.name} />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            </div>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{user.customerCount}</p>
                            <p className="text-xs text-muted-foreground">Kunden</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Teams-Tabelle */}
              <TabsContent value="teams" className="space-y-8">
                {/* Top 3 Teams */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {teams.slice(0, 3).map((team) => (
                    <Card key={team.id} className={`overflow-hidden ${
                      team.rank === 1 ? 'border-yellow-500 shadow-yellow-100' :
                      team.rank === 2 ? 'border-gray-400 shadow-gray-100' :
                      'border-amber-700 shadow-amber-100'
                    }`}>
                      <div className={`h-2 w-full ${
                        team.rank === 1 ? 'bg-yellow-500' :
                        team.rank === 2 ? 'bg-gray-400' :
                        'bg-amber-700'
                      }`}></div>
                      <CardContent className="pt-6">
                        <div className="absolute top-4 right-4">
                          {getMedalIcon(team.rank)}
                        </div>
                        <h3 className="text-lg font-bold">{team.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{team.description}</p>

                        <div className="mb-4">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Kundenanzahl</span>
                            <span className="text-sm font-bold">{team.customerCount}</span>
                          </div>
                          <Progress value={(team.customerCount / maxTeamCustomers) * 100} className="h-2" />
                        </div>

                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Teammitglieder</h4>
                          <div className="flex flex-wrap gap-2">
                            {team.members.slice(0, 5).map((member) => (
                              <Avatar key={member.id} className="h-8 w-8 border-2 border-white">
                                <AvatarImage src={getAvatarUrl(member)} alt={member.name} />
                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            ))}
                            {team.members.length > 5 && (
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                                +{team.members.length - 5}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Andere Teams */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Andere Teams</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {teams.slice(3).map((team) => (
                        <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              {getMedalIcon(team.rank)}
                            </div>
                            <div>
                              <p className="font-medium">{team.name}</p>
                              <p className="text-sm text-muted-foreground">{team.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex -space-x-2">
                              {team.members.slice(0, 3).map((member) => (
                                <Avatar key={member.id} className="border-2 border-white">
                                  <AvatarImage src={getAvatarUrl(member)} alt={member.name} />
                                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                              ))}
                              {team.members.length > 3 && (
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium border-2 border-white">
                                  +{team.members.length - 3}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{team.customerCount}</p>
                              <p className="text-xs text-muted-foreground">Kunden</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}