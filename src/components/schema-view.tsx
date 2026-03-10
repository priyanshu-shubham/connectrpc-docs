import { useState } from "react";
import type { MessageInfo, FieldInfo } from "@/lib/proto-parser";
import { getTypeLabel } from "@/lib/proto-parser";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SchemaView({
  label,
  message,
}: {
  label: string;
  message: MessageInfo;
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold">{label}</h4>
      <div className="overflow-hidden rounded-lg border border-border">
        {/* Message header */}
        <div className="flex items-baseline gap-2 border-b border-border bg-muted/50 px-4 py-2">
          <span className="font-mono text-sm font-medium text-foreground">
            {message.name}
          </span>
          {message.comment && (
            <span className="text-xs text-muted-foreground">
              {message.comment}
            </span>
          )}
        </div>

        {/* Fields */}
        {message.fields.length === 0 ? (
          <div className="px-4 py-3 text-sm italic text-muted-foreground">
            Empty message — no fields.
          </div>
        ) : (
          <div>
            {message.fields.map((field) => (
              <FieldRow key={field.name} field={field} depth={0} />
            ))}
          </div>
        )}

        {/* Oneofs summary */}
        {message.oneofs.length > 0 && (
          <div className="border-t border-border bg-muted/30 px-4 py-2">
            {message.oneofs.map((o) => (
              <div
                key={o.name}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Badge
                  variant="outline"
                  className="px-1 py-0 text-[9px] font-semibold"
                >
                  oneof
                </Badge>
                <span className="font-mono font-medium text-foreground">
                  {o.name}
                </span>
                <span>— use one of: {o.fieldNames.map((f) => (
                  <code key={f} className="mx-0.5 font-mono text-foreground">{f}</code>
                ))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldRow({ field, depth }: { field: FieldInfo; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasNested =
    !!field.messageType && field.messageType.fields.length > 0;

  return (
    <div className={cn("border-b border-border last:border-b-0")}>
      {/* Field header row */}
      <div
        className={cn(
          "group flex items-start gap-3 px-4 py-2.5",
          hasNested && "cursor-pointer hover:bg-muted/30 transition-colors"
        )}
        style={{ paddingLeft: `${depth * 20 + 16}px` }}
        onClick={hasNested ? () => setExpanded(!expanded) : undefined}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* Name + type row */}
          <div className="flex items-center gap-2">
            {hasNested && (
              <ChevronRight
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
                  expanded && "rotate-90"
                )}
              />
            )}
            <span className="font-mono text-sm font-medium text-foreground">
              {field.name}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {getTypeLabel(field)}
            </span>
            {field.repeated && (
              <Badge variant="secondary" className="px-1 py-0 text-[9px]">
                repeated
              </Badge>
            )}
            {field.oneofName && (
              <Badge variant="outline" className="px-1 py-0 text-[9px]">
                oneof:{field.oneofName}
              </Badge>
            )}
            {field.map && (
              <Badge variant="secondary" className="px-1 py-0 text-[9px]">
                map
              </Badge>
            )}
          </div>

          {/* Field comment */}
          {field.comment && (
            <p
              className="text-xs leading-relaxed text-muted-foreground"
              style={{ paddingLeft: hasNested ? "22px" : "0" }}
            >
              {field.comment}
            </p>
          )}
        </div>
      </div>

      {/* Enum values — always shown */}
      {field.enumValues && field.enumValues.length > 0 && (
        <div
          className="border-t border-dashed border-border bg-muted/15 px-4 py-2"
          style={{ paddingLeft: `${depth * 20 + (hasNested ? 38 : 16)}px` }}
        >
          <div className="space-y-1">
            {field.enumValues.map((ev) => (
              <div key={ev.name} className="flex items-baseline gap-2">
                <code className="font-mono text-xs text-foreground">
                  {ev.name}
                </code>
                <span className="font-mono text-[10px] text-muted-foreground">
                  = {ev.value}
                </span>
                {ev.comment && (
                  <span className="text-xs text-muted-foreground">
                    — {ev.comment}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nested message fields */}
      {hasNested && expanded && field.messageType && (
        <div className="border-t border-dashed border-border">
          {field.messageType.fields.map((sub) => (
            <FieldRow key={sub.name} field={sub} depth={depth + 1} />
          ))}
          {field.messageType.oneofs.length > 0 && (
            <div
              className="bg-muted/20 px-4 py-1.5"
              style={{ paddingLeft: `${(depth + 1) * 20 + 16}px` }}
            >
              {field.messageType.oneofs.map((o) => (
                <div
                  key={o.name}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Badge
                    variant="outline"
                    className="px-1 py-0 text-[9px]"
                  >
                    oneof
                  </Badge>
                  <span className="font-mono font-medium text-foreground">
                    {o.name}
                  </span>
                  <span>: {o.fieldNames.join(" | ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
