"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Search, Loader2, Edit, Trash, Users } from "lucide-react";
import { getTeams, deleteTeam, Team } from "@/lib/team-service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

import { TeamForm } from "@/components/teams/team-form";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);

  // Fetch teams on component mount
  useEffect(() => {
    fetchTeams();
  }, []);

  // Filter teams when search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTeams(teams);
    } else {
      const filtered = teams.filter(
        (team) =>
          team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          team.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTeams(filtered);
    }
  }, [searchTerm, teams]);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const fetchedTeams = await getTeams();
      setTeams(fetchedTeams);
      setFilteredTeams(fetchedTeams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast.error("Beim Laden der Teams ist ein Fehler aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTeam = () => {
    setIsAddDialogOpen(true);
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setIsEditDialogOpen(true);
  };

  const handleDeleteTeam = (team: Team) => {
    setSelectedTeam(team);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTeam = async () => {
    if (!selectedTeam) return;

    try {
      const success = await deleteTeam(selectedTeam.id);
      if (success) {
        toast.success("Team erfolgreich gelöscht.");
        fetchTeams();
      } else {
        toast.error("Beim Löschen des Teams ist ein Fehler aufgetreten.");
      }
    } catch (error) {
      console.error("Error deleting team:", error);
      toast.error("Beim Löschen des Teams ist ein Fehler aufgetreten.");
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedTeam(null);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Teamverwaltung</CardTitle>
            <CardDescription>
              Teams anzeigen, hinzufügen, bearbeiten oder löschen.
            </CardDescription>
          </div>
          <Button onClick={handleAddTeam}>
            <Plus className="mr-2 h-4 w-4" />
            Neues Team
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Team suchen..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teamname</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Leiter</TableHead>
                    <TableHead>Mitglieder</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        {searchTerm ? "Keine Suchergebnisse gefunden." : "Noch keine Teams vorhanden."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>{team.description || "-"}</TableCell>
                        <TableCell>
                          {team.expand?.leader ? (
                            <div className="flex items-center space-x-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary text-xs font-medium">
                                  {team.expand.leader.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span>{team.expand.leader.name}</span>
                            </div>
                          ) : (
                            "Kein Leiter zugewiesen"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                            <Badge variant="outline">
                              {team.expand?.members ? team.expand.members.length : (team.members ? team.members.length : 0)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTeam(team)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTeam(team)}
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            >
                              <Trash className="h-4 w-4" />
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

      {/* Dialog zum Hinzufügen eines Teams */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Neues Team hinzufügen</DialogTitle>
            <DialogDescription>
              Füllen Sie das folgende Formular aus, um ein neues Team zu erstellen.
            </DialogDescription>
          </DialogHeader>
          <TeamForm
            onSuccess={() => {
              setIsAddDialogOpen(false);
              fetchTeams();
            }}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog zum Bearbeiten eines Teams */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Team bearbeiten</DialogTitle>
            <DialogDescription>
              Füllen Sie das folgende Formular aus, um die Teaminformationen zu aktualisieren.
            </DialogDescription>
          </DialogHeader>
          {selectedTeam && (
            <TeamForm
              initialData={selectedTeam}
              isEdit={true}
              teamId={selectedTeam.id}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setSelectedTeam(null);
                fetchTeams();
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedTeam(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bestätigungsdialog zum Löschen */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Team löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Sind Sie sicher, dass Sie dieses Team löschen möchten?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTeam} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}