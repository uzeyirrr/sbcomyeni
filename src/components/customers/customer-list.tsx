"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Phone,
  Mail,
  Edit,
  MapPin,
  Trash2,
  Loader2,
  UserCircle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteCustomer } from "@/lib/customer-service";
import { Customer } from "@/types/customer";
import { getUserById } from "@/lib/user-service";

interface CustomerListProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onRefresh: () => void;
}

export function CustomerList({ customers, onEdit, onRefresh }: CustomerListProps) {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});

  useEffect(() => {
    // Temsilci isimlerini getir
    const fetchAgentNames = async () => {
      const agentIds = [...new Set(customers.filter(c => c.agent).map(c => c.agent!))];
      const namesMap: Record<string, string> = {};

      for (const agentId of agentIds) {
        try {
          const agentData = await getUserById(agentId);
          if (agentData) {
            namesMap[agentId] = agentData.name;
          }
        } catch (error) {
          console.error("Fehler beim Abrufen der Agentendaten:", error);
        }
      }

      setAgentNames(namesMap);
    };

    fetchAgentNames();
  }, [customers]);

  const handleDelete = async (customerId: string, customerAgent: string | null) => {
    if (!user || (user.role === "agent" && user.id !== customerAgent)) {
      toast.error("Sie sind für diese Aktion nicht autorisiert.");
      return;
    }

    if (confirm("Sind Sie sicher, dass Sie diesen Kunden löschen möchten?")) {
      setIsDeleting(true);
      try {
        const success = await deleteCustomer(customerId);
        if (success) {
          toast.success("Kunde erfolgreich gelöscht");
          onRefresh();
        } else {
          toast.error("Beim Löschen des Kunden ist ein Fehler aufgetreten");
        }
      } catch (error) {
        console.error("Fehler beim Löschen des Kunden:", error);
        toast.error("Beim Löschen des Kunden ist ein Fehler aufgetreten");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name Nachname</TableHead>
            <TableHead>Kontakt</TableHead>
            <TableHead>Standort</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>QC Status</TableHead>
            <TableHead>Verkauf</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Noch keine Kunden gefunden.
              </TableCell>
            </TableRow>
          ) : (
            customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">
                  {customer.name} {customer.surname}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">{customer.tel}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs">{customer.email}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs">{customer.location}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs">
                      {customer.agent ? agentNames[customer.agent] || "Wird geladen..." : "Nicht zugewiesen"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-xs">
                      QC Vor: {customer.qc_on || "Nicht angegeben"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      QC Final: {customer.qc_final || "Nicht angegeben"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={customer.sale === "none" ? "outline" : "default"}
                    className={cn(
                      "text-xs",
                      customer.sale === "red" && "bg-red-100 text-red-800",
                      customer.sale === "green" && "bg-green-100 text-green-800",
                      customer.sale === "blue" && "bg-blue-100 text-blue-800",
                      customer.sale === "yellow" && "bg-yellow-100 text-yellow-800"
                    )}
                  >
                    {customer.sale === "red" && "Rot"}
                    {customer.sale === "green" && "Grün"}
                    {customer.sale === "blue" && "Blau"}
                    {customer.sale === "yellow" && "Gelb"}
                    {(!customer.sale || customer.sale === "none") && "Nicht angegeben"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {/* Agent rolündeki kullanıcı sadece kendi müşterilerini düzenleyebilir */}
                    {(!user || user.role !== "agent" || user.id === customer.agent) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(customer)}
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Agent rolündeki kullanıcı sadece kendi müşterilerini silebilir */}
                    {(!user || user.role !== "agent" || user.id === customer.agent) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(customer.id, customer.agent)}
                        disabled={isDeleting}
                        title="Löschen"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}