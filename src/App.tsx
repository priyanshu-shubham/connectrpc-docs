import { useState, useMemo, useCallback } from "react";
import { parseProtos, type ProtoSchema } from "@/lib/proto-parser";
import { ThemeProvider, type Theme } from "@/lib/theme";
import { Sidebar } from "@/components/sidebar";
import { MethodDocs } from "@/components/method-docs";
import { TryItPanel } from "@/components/try-it-panel";
import { Zap } from "lucide-react";

interface AppProps {
  protoFiles?: Record<string, string>;
  title?: string;
  iconUrl?: string;
  defaultTheme?: Theme;
  defaultBaseUrl?: string;
}

function loadProtoFilesFromDOM(): Record<string, string> {
  const el = document.getElementById("proto-data");
  if (!el?.textContent || el.textContent === "__PROTO_DATA_PLACEHOLDER__") {
    return {};
  }
  try {
    return JSON.parse(el.textContent) as Record<string, string>;
  } catch {
    return {};
  }
}

export default function App({
  protoFiles,
  title = "API Explorer",
  iconUrl,
  defaultTheme = "system",
  defaultBaseUrl,
}: AppProps) {
  const schema = useMemo<ProtoSchema>(() => {
    const files = protoFiles ?? loadProtoFilesFromDOM();
    if (Object.keys(files).length === 0) {
      return { services: [] };
    }
    return parseProtos(files);
  }, [protoFiles]);

  const [selected, setSelected] = useState<{
    service: string;
    method: string;
  } | null>(null);

  const [tryItOpen, setTryItOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState(
    () => defaultBaseUrl ?? window.location.origin
  );
  const [customHeaders, setCustomHeaders] = useState<
    { key: string; value: string }[]
  >([{ key: "", value: "" }]);

  const handleSelect = useCallback(
    (service: string, method: string) => {
      setSelected({ service, method });
      setTryItOpen(false);
    },
    []
  );

  const selectedService = useMemo(
    () => schema.services.find((s) => s.fullName === selected?.service),
    [schema, selected]
  );
  const selectedMethod = useMemo(
    () => selectedService?.methods.find((m) => m.name === selected?.method),
    [selectedService, selected]
  );

  return (
    <ThemeProvider defaultTheme={defaultTheme}>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {schema.services.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <Zap className="mx-auto mb-3 size-10 text-muted-foreground" />
              <h1 className="text-lg font-semibold">No Proto Files Found</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Proto data was not embedded. Check your build configuration.
              </p>
            </div>
          </div>
        ) : (
          <>
            <Sidebar
              title={title}
              iconUrl={iconUrl}
              schema={schema}
              selected={selected}
              onSelect={handleSelect}
            />

            {selectedService && selectedMethod ? (
              <>
                <MethodDocs
                  key={`${selectedService.fullName}.${selectedMethod.name}`}
                  service={selectedService}
                  method={selectedMethod}
                  tryItOpen={tryItOpen}
                  onOpenTryIt={() => setTryItOpen(true)}
                />

                {tryItOpen && (
                  <TryItPanel
                    method={selectedMethod}
                    baseUrl={baseUrl}
                    onBaseUrlChange={setBaseUrl}
                    headers={customHeaders}
                    onHeadersChange={setCustomHeaders}
                    onClose={() => setTryItOpen(false)}
                  />
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <Zap className="mx-auto mb-3 size-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Select a method from the sidebar to get started
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ThemeProvider>
  );
}
