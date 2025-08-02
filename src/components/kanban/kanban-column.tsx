"use client";

import { Droppable } from "@hello-pangea/dnd";
import { Customer } from "@/types/customer";
import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
  id: string;
  title: string;
  customers: Customer[];
  onCustomerUpdated: () => void;
}

export function KanbanColumn({ id, title, customers, onCustomerUpdated }: KanbanColumnProps) {
  // Farbe für den Titel bestimmen
  const getHeaderColor = () => {
    switch (id) {
      case "Yeni": // "Yeni" -> "Neu"
        return "bg-blue-100 text-blue-800";
      case "Aranacak": // "Aranacak" -> "Anzurufen"
        return "bg-yellow-100 text-yellow-800";
      case "Rausgefallen":
        return "bg-red-100 text-red-800";
      case "Rausgefallen WP":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col h-full min-w-[280px] bg-gray-50 rounded-md shadow-sm">
      <div className={`p-2 rounded-t-md ${getHeaderColor()}`}>
        <h3 className="font-medium text-sm">{title}</h3>
        <div className="text-xs mt-1 font-normal">
          {customers.length} Kunden {/* "müşteri" -> "Kunden" */}
        </div>
      </div>

      <Droppable droppableId={id}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 p-2 overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 300px)" }}
          >
            {customers.map((customer, index) => (
              <KanbanCard
                key={customer.id}
                customer={customer}
                index={index}
                onCustomerUpdated={onCustomerUpdated}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}