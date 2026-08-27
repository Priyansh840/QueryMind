"use client";

import React, { useState } from "react";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MemoryItem } from "@/types/api";
import { apiClient } from "@/lib/api/client";
import {
  Brain,
  Repeat,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface MemoryCardProps {
  memory: MemoryItem;
  spaceId: string;
  onReinforced?: (updatedMemory: MemoryItem) => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  spaceId,
  onReinforced,
}) => {
  const [isReinforcing, setIsReinforcing] = useState(false);
  const [currentMemory, setCurrentMemory] = useState<MemoryItem>(memory);

  const handleReinforce = async () => {
    setIsReinforcing(true);
    try {
      const updated = await apiClient<MemoryItem>(`/api/v1/memories/${currentMemory.id}/reinforce`, {
        method: "POST",
      });
      setCurrentMemory(updated);
      if (onReinforced) onReinforced(updated);
    } catch (err) {
      console.error("Failed to reinforce memory:", err);
    } finally {
      setIsReinforcing(false);
    }
  };

  const confidencePercent = Math.round(currentMemory.confidence * 100);

  return (
    <Surface
      variant="primary"
      className="p-4 border-l-4 border-l-[var(--accent-primary)] hover:border-[var(--border-strong)] transition-mynd flex flex-col gap-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 rounded-[var(--radius-xs)] bg-[var(--surface-secondary)] text-[var(--accent-text)] shrink-0">
            <Brain className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            {currentMemory.memory_type}
          </span>
          <Badge variant="outline" size="sm">
            {currentMemory.importance} priority
          </Badge>
          <Badge variant={confidencePercent >= 80 ? "default" : "outline"} size="sm">
            {confidencePercent}% confidence
          </Badge>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReinforce}
            disabled={isReinforcing}
            leftIcon={<Repeat className={`w-3.5 h-3.5 ${isReinforcing ? "animate-spin" : ""}`} />}
          >
            Reinforce
          </Button>
        </div>
      </div>

      <p className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
        {currentMemory.content}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Repeat className="w-3 h-3 text-[var(--accent-text)]" />
            <span>Reinforced {currentMemory.reinforcement_count}x</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-[var(--text-muted)]" />
            <span>{currentMemory.source_count} source reference(s)</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
          <Clock className="w-3 h-3" />
          <span>Observed {formatRelativeTime(currentMemory.last_reinforced_at || currentMemory.created_at)}</span>
        </div>
      </div>
    </Surface>
  );
};
