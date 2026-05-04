import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Search, Check } from "lucide-react";
import { createPortal } from "react-dom";
import { useStore } from "../../store/useStore";
import { getDisplayName, makeModelKey } from "../../lib/api";
import type { Model } from "../../types";
import { fetchModels } from "../../lib/api";

interface ModelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  direction?: "up" | "down";
}

interface MenuPosition {
  left: number;
  top?: number;
  bottom?: number;
  maxHeight?: number;
}

export function ModelPicker({
  isOpen,
  onClose,
  triggerRef,
  direction = "down",
}: ModelPickerProps) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    left: 0,
    top: 0,
  });
  const {
    providers,
    enabledModelIds,
    selectedModelId,
    setSelectedModelId,
    setProviderModels,
  } = useStore();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      providers.forEach((p) => {
        if (p.models.length === 0) {
          setLoading(true);
          fetchModels(p)
            .then((models) => {
              setProviderModels(p.id, models);
              setLoading(false);
            })
            .catch(() => setLoading(false));
        }
      });
      // Focus search input when opening
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Position dropdown relative to trigger button
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef?.current) return;

    const updatePosition = () => {
      const rect = triggerRef!.current!.getBoundingClientRect();
      const spacing = 6;
      const viewportPadding = 16;
      // Height of the search-input header row inside the dropdown
      const SEARCH_HEADER_HEIGHT = 45;
      // Max height for the scrollable model list — enough for ~4 model rows
      const MAX_LIST_HEIGHT = 220;

      const spaceBelow =
        window.innerHeight - rect.bottom - spacing - viewportPadding;
      const spaceAbove = rect.top - spacing - viewportPadding;

      let maxHeight: number;
      let position: MenuPosition;

      if (direction === "up") {
        const available = Math.min(
          spaceAbove,
          SEARCH_HEADER_HEIGHT + MAX_LIST_HEIGHT,
        );
        maxHeight = Math.max(available - SEARCH_HEADER_HEIGHT, 80);
        maxHeight = Math.min(maxHeight, MAX_LIST_HEIGHT);
        position = {
          bottom: window.innerHeight - rect.top + spacing,
          left: rect.left,
          top: undefined,
          maxHeight,
        };
      } else {
        const available = Math.min(
          spaceBelow,
          SEARCH_HEADER_HEIGHT + MAX_LIST_HEIGHT,
        );
        maxHeight = Math.max(available - SEARCH_HEADER_HEIGHT, 80);
        maxHeight = Math.min(maxHeight, MAX_LIST_HEIGHT);
        position = {
          top: rect.bottom + spacing,
          left: rect.left,
          bottom: undefined,
          maxHeight,
        };
      }

      setMenuPosition(position);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [isOpen, triggerRef, direction]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isOutsideDropdown =
        dropdownRef.current && !dropdownRef.current.contains(target);
      const isOutsideTrigger =
        triggerRef?.current && !triggerRef.current.contains(target);

      if (isOutsideDropdown && isOutsideTrigger) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Only show enabled models
  const allModels = providers.flatMap((p) =>
    p.models
      .filter((m) => enabledModelIds.includes(makeModelKey(m.providerId, m.id)))
      .map((m) => ({ ...m, provider: p })),
  );

  const filteredModels = search
    ? allModels.filter((m) =>
        getDisplayName(m.id).toLowerCase().includes(search.toLowerCase()),
      )
    : allModels;

  const grouped = filteredModels.reduce(
    (acc, m) => {
      const provider = providers.find((p) => p.id === m.providerId);
      const name = provider?.name || m.providerId;
      if (!acc[name]) acc[name] = [];
      acc[name].push(m);
      return acc;
    },
    {} as Record<string, Model[]>,
  );

  const dropdown = (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        ...(menuPosition.top !== undefined ? { top: menuPosition.top } : {}),
        ...(menuPosition.bottom !== undefined
          ? { bottom: menuPosition.bottom }
          : {}),
        left: menuPosition.left,
        width: 360,
        background: "var(--sf)",
        border: "1px solid var(--bd2)",
        borderRadius: "var(--r)",
        overflow: "hidden",
        boxShadow: "0 6px 24px rgba(0,0,0,.14), 0 1px 4px rgba(0,0,0,.08)",
        animation: "dropDown 0.12s ease",
        zIndex: 950,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderBottom: "1px solid var(--bd)",
        }}
      >
        <Search size={16} style={{ color: "var(--tx3)", flexShrink: 0 }} />
        <input
          ref={searchInputRef}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: "13px",
            color: "var(--tx)",
          }}
          placeholder="Search models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div
        style={{ maxHeight: menuPosition.maxHeight || 360, overflowY: "auto" }}
      >
        {loading && (
          <div
            style={{
              padding: "12px 14px",
              fontSize: "12px",
              color: "var(--tx3)",
            }}
          >
            Loading...
          </div>
        )}
        {Object.entries(grouped).map(([providerName, models]) => (
          <div key={providerName}>
            <div
              style={{
                padding: "8px 14px 4px",
                fontSize: "calc(var(--fs) - 3.5px)",
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "var(--tx4)",
              }}
            >
              {providerName}
            </div>
            {models.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedModelId(makeModelKey(m.providerId, m.id));
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "9px 14px",
                  border: "none",
                  background:
                    selectedModelId === makeModelKey(m.providerId, m.id)
                      ? "rgba(var(--acc-r),var(--acc-g),var(--acc-b),.1)"
                      : "transparent",
                  cursor: "pointer",
                  transition: "background var(--ease)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "rgba(var(--acc-r),var(--acc-g),var(--acc-b),.07)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    selectedModelId === makeModelKey(m.providerId, m.id)
                      ? "rgba(var(--acc-r),var(--acc-g),var(--acc-b),.1)"
                      : "transparent";
                }}
              >
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div
                    style={{
                      fontSize: "calc(var(--fs) - .5px)",
                      color: "var(--tx)",
                      marginBottom: "2px",
                    }}
                  >
                    {getDisplayName(m.id)}
                  </div>
                  <div
                    style={{
                      fontSize: "calc(var(--fs) - 2.5px)",
                      color: "var(--tx3)",
                    }}
                  >
                    {formatContext(m.contextWindow)} ctx
                  </div>
                </div>
                {selectedModelId === makeModelKey(m.providerId, m.id) && (
                  <Check
                    size={16}
                    style={{
                      color: "rgba(var(--acc-r),var(--acc-g),var(--acc-b),1)",
                      marginLeft: 8,
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        ))}
        {filteredModels.length === 0 && !loading && (
          <div
            style={{
              padding: "12px 14px",
              fontSize: "12px",
              color: "var(--tx3)",
            }}
          >
            No models found
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(dropdown, document.body);
}

function formatContext(ctx: number): string {
  if (ctx >= 1000000) return `${Math.round(ctx / 1000000)}M`;
  if (ctx >= 1000) return `${Math.round(ctx / 1000)}K`;
  return ctx.toString();
}
