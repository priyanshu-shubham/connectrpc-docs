import type { ServiceInfo, MethodInfo } from "@/lib/proto-parser";
import { SchemaView } from "@/components/schema-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, FlaskConical } from "lucide-react";

interface MethodDocsProps {
  service: ServiceInfo;
  method: MethodInfo;
  onOpenTryIt: () => void;
  tryItOpen: boolean;
}

export function MethodDocs({
  service,
  method,
  onOpenTryIt,
  tryItOpen,
}: MethodDocsProps) {
  return (
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl p-6 pb-24">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{service.name}</span>
            <ChevronRight className="size-3" />
            <span className="font-medium text-foreground">{method.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <Badge className="font-mono text-xs">POST</Badge>
            <code className="rounded-md bg-muted px-2.5 py-1 font-mono text-sm text-foreground">
              {method.path}
            </code>
            {!tryItOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenTryIt}
                className="ml-auto"
              >
                <FlaskConical className="size-3.5" data-icon="inline-start" />
                Try it out
              </Button>
            )}
          </div>

          {method.comment && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {method.comment}
            </p>
          )}
        </div>

        <Separator className="mb-8" />

        {/* Request schema */}
        <section className="mb-8">
          <SchemaView label="Request" message={method.requestType} />
        </section>

        {/* Response schema */}
        <section>
          <SchemaView label="Response" message={method.responseType} />
        </section>
      </div>
    </ScrollArea>
  );
}
