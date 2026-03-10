export interface ExplorerConfig {
  /** DOM element to render into */
  target: HTMLElement;
  /** Proto file contents keyed by relative path */
  protoFiles: Record<string, string>;
  /** Title shown in the sidebar header. Default: "API Explorer" */
  title?: string;
  /** URL to an icon image for the sidebar header */
  iconUrl?: string;
  /** Initial theme. Default: "system" */
  theme?: "light" | "dark" | "system";
  /** Initial server base URL. Default: window.location.origin */
  baseUrl?: string;
}
