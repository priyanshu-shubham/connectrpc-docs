import { useState, useMemo } from "react";
import type { ProtoSchema } from "@/lib/proto-parser";
import { useTheme } from "@/lib/theme";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  Zap,
  Sun,
  Moon,
  Monitor,
  Search,
  X,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  title: string;
  iconUrl?: string;
  schema: ProtoSchema;
  selected: { service: string; method: string } | null;
  onSelect: (service: string, method: string) => void;
}

export function Sidebar({
  title,
  iconUrl,
  schema,
  selected,
  onSelect,
}: SidebarProps) {
  const { theme, cycleTheme } = useTheme();
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(schema.services.map((s) => s.fullName))
  );
  const [query, setQuery] = useState("");

  const filteredServices = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return schema.services;
    return schema.services
      .map((service) => ({
        ...service,
        methods: service.methods.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.comment.toLowerCase().includes(q) ||
            service.name.toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.methods.length > 0);
  }, [schema, query]);

  function toggleService(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  const ThemeIcon =
    theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  const hasQuery = query.trim().length > 0;

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {iconUrl ? (
          <img src={iconUrl} alt="" className="size-5" />
        ) : (
          <Zap className="size-5 text-primary" />
        )}
        <h1 className="flex-1 truncate text-sm font-semibold">{title}</h1>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
        >
          <ThemeIcon className="size-3.5" />
        </Button>
      </div>

      {/* Search */}
      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder="Search methods..."
            className="h-7 pl-7 pr-7 text-xs"
          />
          {hasQuery && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Services list */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <nav className="p-2">
          {filteredServices.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              No methods match &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredServices.map((service) => {
              const isExpanded =
                hasQuery || expanded.has(service.fullName);
              return (
                <div key={service.fullName} className="mb-1">
                  <button
                    onClick={() => toggleService(service.fullName)}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    )}
                    {service.name}
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px]"
                    >
                      {service.methods.length}
                    </Badge>
                  </button>

                  {isExpanded && (
                    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
                      {service.methods.map((method) => {
                        const isSelected =
                          selected?.service === service.fullName &&
                          selected?.method === method.name;
                        return (
                          <button
                            key={method.name}
                            onClick={() =>
                              onSelect(service.fullName, method.name)
                            }
                            className={cn(
                              "flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                              isSelected
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="shrink-0 px-1 py-0 text-[9px] font-mono"
                              >
                                POST
                              </Badge>
                              <span className="truncate">{method.name}</span>
                              {method.auth && (
                                <Lock
                                  className="ml-auto size-3 shrink-0 text-muted-foreground"
                                  aria-label="Authentication required"
                                />
                              )}
                            </div>
                            {method.comment && (
                              <p className="truncate pl-[38px] text-[11px] text-muted-foreground">
                                {method.comment}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>
      </ScrollArea>
    </div>
  );
}
