"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BlockCard } from "./BlockCard";
import { InventoryBlockWithData } from "@/types/inventory";
import { UNIVERSE_CONFIG_PATH } from "@/lib/constants";

interface InventoryProps {
  blocks: InventoryBlockWithData[];
  selectedBlockKey: string | null;
  onBlockSelect: (block: InventoryBlockWithData) => void;
}

interface UniverseConfig {
  backgroundColor: string;
  worldImageScale: number;
  blockSize: number;
  worldImages: { path: string; distance: number }[];
}

export function Inventory({
  blocks,
  selectedBlockKey,
  onBlockSelect,
}: InventoryProps) {
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [timeRemaining, setTimeRemaining] = useState<string>("--:--:--");

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch(UNIVERSE_CONFIG_PATH);
        const config: UniverseConfig = await response.json();
        setBackgroundColor(config.backgroundColor);
      } catch (error) {
        console.error("Failed to load universe config:", error);
      }
    };

    loadConfig();
  }, []);

  // Calculate time remaining until next midnight UTC
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const tomorrow = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 1,
          0,
          0,
          0,
        ),
      );

      const diff = tomorrow.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      );
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, []);

  const totalBlocks = blocks.reduce((sum, b) => sum + b.quantity, 0);

  return (
    <div
      className="w-64 h-full bg-card border-r border-border flex flex-col"
      style={{ pointerEvents: "auto" }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Inventory</h2>
        <p className="text-sm text-muted-foreground">
          {totalBlocks} {totalBlocks === 1 ? "block" : "blocks"}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 grid grid-cols-2 gap-3">
          {blocks.length === 0 && (
            <div className="col-span-2 text-center text-muted-foreground text-sm py-8">
              No blocks available
            </div>
          )}
          {blocks.map((block) => (
            <BlockCard
              key={block.blockCatalogKey}
              imagePath={block.blockData.imagePath}
              quantity={block.quantity}
              blockKey={block.blockCatalogKey}
              blockData={block.blockData}
              isSelected={selectedBlockKey === block.blockCatalogKey}
              onClick={() => onBlockSelect(block)}
              backgroundColor={backgroundColor}
            />
          ))}
        </div>
      </ScrollArea>
      <div className="mt-3 p-3 border-t border-border">
        <p className="text-xs text-muted-foreground mb-1">New blocks in:</p>
        <p className="text-md font-mono font-semibold">{timeRemaining}</p>
      </div>
    </div>
  );
}
