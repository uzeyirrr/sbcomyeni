"use client";

import { useState, useEffect } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Customer } from "@/types/customer";
import { formatDate } from "@/lib/utils";
import { Edit, Phone, Mail, MapPin, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomerForm } from "@/components/customers/customer-form";
import { getUserName } from "@/lib/user-service";

interface KanbanCardProps {
  customer: Customer;
  index: number;
  onCustomerUpdated: () => void;
}

export function KanbanCard({ customer, index, onCustomerUpdated }: KanbanCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [agentName, setAgentName] = useState<string>("");

  // Agentennamen abrufen
  useEffect(() => {
    const fetchAgentName = async () => {
      if (customer.agent) {
        const name = await getUserName(customer.agent);
        setAgentName(name);
      }
    };

    fetchAgentName();
  }, [customer.agent]);

  // Randfarbe basierend auf dem Verkaufsstatus festlegen
  const getBorderColor = () => {
    switch (customer.sale) {
      case "red":
        return "border-red-500";
      case "green":
        return "border-green-500";
      case "blue":
        return "border-blue-500";
      case "yellow":
        return "border-yellow-500";
      default:
        return "border-gray-200";
    }
  };

  return (
    <>
      <Draggable draggableId={customer.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`p-3 mb-2 bg-white rounded-md shadow-sm border-l-4 ${getBorderColor()} ${
              snapshot.isDragging ? "shadow-md" : ""
            }`}
            onClick={() => setIsDialogOpen(true)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-sm truncate">
                {customer.name} {customer.surname}
              </h3>
              <span className="text-xs text-gray-500">
                {formatDate(customer.created)}
              </span>
            </div>

            <div className="space-y-1 text-xs text-gray-600">
              {customer.tel && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span>{customer.tel}</span>
                </div>
              )}

              {customer.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}

              {customer.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{customer.location}</span>
                </div>
              )}

              {customer.agent && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="truncate">Agent: {agentName || "Wird geladen..."}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Kundendetails</DialogTitle> {/* "Müşteri Detayları" -> "Kundendetails" */}
          </DialogHeader>
          <CustomerForm
            initialData={customer}
            isEdit={true}
            customerId={customer.id}
            onSuccess={() => {
              setIsDialogOpen(false);
              onCustomerUpdated();
            }}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}