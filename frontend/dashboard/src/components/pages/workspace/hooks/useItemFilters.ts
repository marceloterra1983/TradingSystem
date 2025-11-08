import { useState, useMemo } from "react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import type { ItemCategory, ItemStatus } from "../types/workspace.types";

export function useItemFilters() {
  const items = useWorkspaceStore((state) => state.items);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | "all">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<ItemStatus | "all">("all");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchTerm === "" ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, categoryFilter, statusFilter]);

  return {
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    filteredItems,
  };
}
