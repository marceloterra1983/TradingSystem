/**
 * GatewayFilters - Filters for messages
 * Extracted from TelegramGatewayFinal.tsx
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import type { Channel } from "../types";

interface GatewayFiltersProps {
  channels: Channel[];
  filterChannel: string;
  onFilterChannelChange: (value: string) => void;
  filterDateFrom: string;
  onFilterDateFromChange: (value: string) => void;
  filterDateTo: string;
  onFilterDateToChange: (value: string) => void;
  filterLimit: string;
  onFilterLimitChange: (value: string) => void;
}

export function GatewayFilters({
  channels,
  filterChannel,
  onFilterChannelChange,
  filterDateFrom,
  onFilterDateFromChange,
  filterDateTo,
  onFilterDateToChange,
  filterLimit,
  onFilterLimitChange,
}: GatewayFiltersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <div>
        <Label htmlFor="filter-channel" className="text-sm font-medium">
          Canal
        </Label>
        <Select value={filterChannel} onValueChange={onFilterChannelChange}>
          <SelectTrigger id="filter-channel">
            <SelectValue placeholder="Todos os canais" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            {channels.map((ch) => (
              <SelectItem key={ch.id} value={ch.channelId}>
                {ch.label || ch.channelId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-date-from" className="text-sm font-medium">
          Data Início
        </Label>
        <Input
          id="filter-date-from"
          type="date"
          value={filterDateFrom}
          onChange={(e) => onFilterDateFromChange(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="filter-date-to" className="text-sm font-medium">
          Data Fim
        </Label>
        <Input
          id="filter-date-to"
          type="date"
          value={filterDateTo}
          onChange={(e) => onFilterDateToChange(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="filter-limit" className="text-sm font-medium">
          Limite
        </Label>
        <Select value={filterLimit} onValueChange={onFilterLimitChange}>
          <SelectTrigger id="filter-limit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="200">200</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
