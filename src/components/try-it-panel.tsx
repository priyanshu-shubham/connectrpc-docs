import { useState, useCallback, useRef, useEffect } from "react";
import type { MethodInfo } from "@/lib/proto-parser";
import { generateTemplate } from "@/lib/proto-parser";
import {
  sendConnectRequest,
  type ConnectResponse,
} from "@/lib/connect-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { JsonEditor } from "@/components/json-editor";
import {
  Send,
  Copy,
  Check,
  Clock,
  X,
  Plus,
  Trash2,
  RotateCcw,
  Loader2,
} from "lucide-react";

interface TryItPanelProps {
  method: MethodInfo;
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
  headers: { key: string; value: string }[];
  onHeadersChange: (headers: { key: string; value: string }[]) => void;
  onClose: () => void;
}

export function TryItPanel({
  method,
  baseUrl,
  onBaseUrlChange,
  headers,
  onHeadersChange,
  onClose,
}: TryItPanelProps) {
  const [body, setBody] = useState(() =>
    JSON.stringify(generateTemplate(method.requestType), null, 2)
  );
  const [response, setResponse] = useState<ConnectResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const sendRef = useRef<() => void>(undefined);

  const resetBody = useCallback(() => {
    setBody(JSON.stringify(generateTemplate(method.requestType), null, 2));
  }, [method]);

  const handleSend = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const parsed = JSON.parse(body);
      const extraHeaders: Record<string, string> = {};
      for (const h of headers) {
        if (h.key.trim()) extraHeaders[h.key.trim()] = h.value;
      }
      const res = await sendConnectRequest(
        baseUrl,
        method.path,
        parsed,
        extraHeaders
      );
      setResponse(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [body, headers, baseUrl, method.path]);

  sendRef.current = handleSend;

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleCopy() {
    if (!response) return;
    await navigator.clipboard.writeText(
      JSON.stringify(response.data, null, 2)
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex h-full w-[480px] shrink-0 flex-col border-l border-border bg-background animate-in slide-in-from-right duration-200">
      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h2 className="flex-1 truncate text-sm font-semibold">
          {method.name}
        </h2>
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          <X className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-4">
          {/* Server URL */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Server URL
            </label>
            <Input
              value={baseUrl}
              onChange={(e) =>
                onBaseUrlChange((e.target as HTMLInputElement).value)
              }
              placeholder="http://localhost:8080"
              className="font-mono text-xs"
            />
          </div>

          {/* Request tabs */}
          <Tabs defaultValue="body">
            <TabsList>
              <TabsTrigger value="body">Body</TabsTrigger>
              <TabsTrigger value="headers">
                Headers
                {headers.some((h) => h.key.trim()) && (
                  <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-medium text-primary">
                    {headers.filter((h) => h.key.trim()).length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="body" className="mt-3">
              <div className="relative">
                <JsonEditor
                  value={body}
                  onChange={setBody}
                  onSend={() => sendRef.current?.()}
                  minHeight="160px"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-2 top-2 z-10"
                  onClick={resetBody}
                  title="Reset to template"
                >
                  <RotateCcw className="size-3" />
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                  Ctrl+Enter
                </kbd>{" "}
                to send
              </p>
            </TabsContent>

            <TabsContent value="headers" className="mt-3">
              <HeadersEditor headers={headers} onChange={onHeadersChange} />
            </TabsContent>
          </Tabs>

          {/* Send */}
          <Button
            onClick={handleSend}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <Send className="size-4" data-icon="inline-start" />
            )}
            {loading ? "Sending..." : "Send Request"}
          </Button>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Response */}
          {response && (
            <>
              <Separator />
              <div className="animate-in fade-in duration-150">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Response
                  </h3>
                  <StatusBadge status={response.status} />
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="size-3" />
                    {response.duration}ms
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleCopy}
                    className="ml-auto"
                  >
                    {copied ? (
                      <Check className="size-3" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-3">
                  <pre className="font-mono text-xs whitespace-pre-wrap break-all leading-relaxed">
                    <JsonHighlight data={response.data} />
                  </pre>
                </div>

                {/* Response headers */}
                {Object.keys(response.headers).length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] text-muted-foreground transition-colors hover:text-foreground">
                      Headers ({Object.keys(response.headers).length})
                    </summary>
                    <div className="mt-1.5 space-y-0.5 rounded-lg border border-border bg-muted/20 p-2">
                      {Object.entries(response.headers).map(([k, v]) => (
                        <div key={k} className="font-mono text-[11px]">
                          <span className="text-primary">{k}</span>
                          <span className="text-muted-foreground">: </span>
                          <span>{v}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function HeadersEditor({
  headers,
  onChange,
}: {
  headers: { key: string; value: string }[];
  onChange: (headers: { key: string; value: string }[]) => void;
}) {
  const update = (i: number, field: "key" | "value", val: string) => {
    const next = headers.map((h, j) => (j === i ? { ...h, [field]: val } : h));
    onChange(next);
  };

  const add = () => onChange([...headers, { key: "", value: "" }]);

  const remove = (i: number) => {
    const next = headers.filter((_, j) => j !== i);
    onChange(next.length ? next : [{ key: "", value: "" }]);
  };

  const filledCount = headers.filter((h) => h.key.trim()).length;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_28px] gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>Name</span>
        <span>Value</span>
        <span />
      </div>
      {headers.map((h, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_28px] gap-1.5">
          <Input
            value={h.key}
            onChange={(e) =>
              update(i, "key", (e.target as HTMLInputElement).value)
            }
            placeholder="Header name"
            className="font-mono text-xs"
          />
          <Input
            value={h.value}
            onChange={(e) =>
              update(i, "value", (e.target as HTMLInputElement).value)
            }
            placeholder="Value"
            className="font-mono text-xs"
          />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => remove(i)}
            className="mt-1 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={add} className="h-7 text-xs">
          <Plus className="size-3" data-icon="inline-start" />
          Add header
        </Button>
        {filledCount > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {filledCount} header{filledCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: number }) {
  const isOk = status >= 200 && status < 300;
  return (
    <Badge
      variant={isOk ? "default" : "destructive"}
      className="font-mono text-[10px]"
    >
      {status} {isOk ? "OK" : "Error"}
    </Badge>
  );
}

function JsonHighlight({ data }: { data: unknown }) {
  const json = JSON.stringify(data, null, 2);
  if (!json) return <span className="text-muted-foreground">null</span>;

  const parts = json.split(
    /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g
  );

  return (
    <>
      {parts.map((part, i) => {
        if (part === undefined || part === "") return null;
        if (i % 5 === 1 && part)
          return (
            <span key={i} className="text-primary">
              {part}
            </span>
          );
        if (i % 5 === 2 && part)
          return (
            <span key={i} className="text-chart-2">
              {part}
            </span>
          );
        if (i % 5 === 3 && part)
          return (
            <span key={i} className="text-chart-4">
              {part}
            </span>
          );
        if (i % 5 === 4 && part)
          return (
            <span key={i} className="text-chart-1">
              {part}
            </span>
          );
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
