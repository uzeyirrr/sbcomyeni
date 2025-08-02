"use client";

import { useState, useEffect } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Customer } from "@/types/customer";
import { KanbanColumn } from "./kanban-column";
import { updateCustomer } from "@/lib/customer-service";
import { toast } from "sonner";

interface KanbanBoardFinalProps {
  customers: Customer[];
  onCustomersUpdated: () => void;
  dateFilter: "daily" | "weekly" | "monthly" | "all";
}

export function KanbanBoardFinal({ customers, onCustomersUpdated, dateFilter }: KanbanBoardFinalProps) {
  const [columns, setColumns] = useState<Record<string, Customer[]>>({
    "Neu": [], // "Yeni" -> "Neu"
    "Okey": [],
    "Rausgefallen": [],
    "Rausgefallen WP": [],
    "Neuleger": [],
    "Neuleger WP": [],
  });

  // Kunden den Spalten zuordnen
  useEffect(() => {
    const filteredCustomers = filterCustomersByDate(customers, dateFilter);

    const newColumns: Record<string, Customer[]> = {
      "Neu": [], // "Yeni" -> "Neu"
      "Okey": [],
      "Rausgefallen": [],
      "Rausgefallen WP": [],
      "Neuleger": [],
      "Neuleger WP": [],
    };

    filteredCustomers.forEach(customer => {
      if (newColumns[customer.qc_final]) {
        newColumns[customer.qc_final].push(customer);
      } else {
        // Wenn der qc_final Wert keine gültige Spalte ist, füge ihn der Spalte "Neu" hinzu
        newColumns["Neu"].push(customer); // "Yeni" -> "Neu"
      }
    });

    setColumns(newColumns);
  }, [customers, dateFilter]);

  // Kunden nach Datum filtern
  const filterCustomersByDate = (customers: Customer[], filter: string): Customer[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Zuerst nur Kunden filtern, deren qc_on Status "Aranacak" ist
    const aranacakCustomers = customers.filter(customer => customer.qc_on === "Aranacak"); // "Aranacak" bleibt gleich

    return aranacakCustomers.filter(customer => {
      const createdDate = new Date(customer.created);

      switch (filter) {
        case "daily":
          // Heute erstellte Kunden
          return createdDate >= today;
        case "weekly":
          // In den letzten 7 Tagen erstellte Kunden
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return createdDate >= weekAgo;
        case "monthly":
          // In den letzten 30 Tagen erstellte Kunden
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          return createdDate >= monthAgo;
        default:
          // Alle Kunden
          return true;
      }
    });
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Wenn kein Ziel vorhanden ist (außerhalb des Kanban gezogen), keine Aktion durchführen
    if (!destination) return;

    // Ziehen an die gleiche Stelle
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Den gezogenen Kunden finden
    const customer = customers.find(c => c.id === draggableId);
    if (!customer) return;

    // Spalten aktualisieren
    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];

    // Kunden aus der Quellspalte entfernen
    const newSourceColumn = [...sourceColumn];
    newSourceColumn.splice(source.index, 1);

    // Kunden zur Zielspalte hinzufügen
    const newDestColumn = [...destColumn];
    newDestColumn.splice(destination.index, 0, customer);

    // Spalten aktualisieren
    const newColumns = {
      ...columns,
      [source.droppableId]: newSourceColumn,
      [destination.droppableId]: newDestColumn,
    };

    setColumns(newColumns);

    // Kundenstatus in der Datenbank aktualisieren
    try {
      await updateCustomer(draggableId, { qc_final: destination.droppableId });
      toast.success("Kundenstatus aktualisiert");
      onCustomersUpdated();
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Kundenstatus:", error);
      toast.error("Beim Aktualisieren des Kundenstatus ist ein Fehler aufgetreten");

      // Im Fehlerfall zum ursprünglichen Zustand zurückkehren
      setColumns({
        ...columns,
      });
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Object.entries(columns).map(([columnId, columnCustomers]) => (
          <KanbanColumn
            key={columnId}
            id={columnId}
            title={columnId}
            customers={columnCustomers}
            onCustomerUpdated={onCustomersUpdated}
          />
        ))}
      </div>
    </DragDropContext>
  );
}