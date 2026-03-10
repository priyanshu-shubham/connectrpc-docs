import { useRef, useEffect } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, lintGutter } from "@codemirror/lint";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { keymap } from "@codemirror/view";
import { useTheme } from "@/lib/theme";

const highlightLight = HighlightStyle.define([
  { tag: tags.propertyName, color: "oklch(0.45 0.15 260)" },
  { tag: tags.string, color: "oklch(0.45 0.18 150)" },
  { tag: tags.number, color: "oklch(0.50 0.15 30)" },
  { tag: tags.bool, color: "oklch(0.50 0.18 300)" },
  { tag: tags.null, color: "oklch(0.55 0 0)" },
  { tag: tags.punctuation, color: "oklch(0.55 0 0)" },
]);

const highlightDark = HighlightStyle.define([
  { tag: tags.propertyName, color: "oklch(0.78 0.12 260)" },
  { tag: tags.string, color: "oklch(0.75 0.16 155)" },
  { tag: tags.number, color: "oklch(0.78 0.14 55)" },
  { tag: tags.bool, color: "oklch(0.78 0.15 300)" },
  { tag: tags.null, color: "oklch(0.65 0 0)" },
  { tag: tags.punctuation, color: "oklch(0.60 0 0)" },
]);

const baseTheme = EditorView.baseTheme({
  "&": {
    fontSize: "13px",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border)",
    overflow: "hidden",
  },
  "&.cm-focused": {
    outline: "none",
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklch, var(--ring) 50%, transparent)",
  },
  ".cm-scroller": {
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    lineHeight: "1.6",
  },
  ".cm-content": {
    padding: "8px 0",
    caretColor: "var(--foreground)",
  },
  ".cm-line": {
    padding: "0 12px",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "var(--muted-foreground)",
    border: "none",
    paddingLeft: "4px",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "var(--foreground)",
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in oklch, var(--muted) 50%, transparent)",
  },
  ".cm-selectionBackground": {
    backgroundColor:
      "color-mix(in oklch, var(--primary) 20%, transparent) !important",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--foreground)",
  },
  ".cm-matchingBracket": {
    backgroundColor: "color-mix(in oklch, var(--primary) 25%, transparent)",
    outline: "none",
  },
  ".cm-foldGutter": {
    color: "var(--muted-foreground)",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--popover)",
    color: "var(--popover-foreground)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  ".cm-diagnostic-error": {
    borderLeftColor: "var(--destructive)",
  },
  ".cm-lintRange-error": {
    backgroundImage: "none",
    textDecoration: "wavy underline var(--destructive)",
    textUnderlineOffset: "3px",
  },
});

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSend?: () => void;
  minHeight?: string;
}

export function JsonEditor({
  value,
  onChange,
  onSend,
  minHeight = "180px",
}: JsonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onSendRef = useRef(onSend);
  const highlightCompartment = useRef(new Compartment());
  const { isDark } = useTheme();

  onChangeRef.current = onChange;
  onSendRef.current = onSend;

  useEffect(() => {
    if (!containerRef.current) return;

    const sendKeymap = keymap.of([
      {
        key: "Ctrl-Enter",
        mac: "Cmd-Enter",
        run: () => {
          onSendRef.current?.();
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        json(),
        lintGutter(),
        linter(jsonParseLinter()),
        baseTheme,
        highlightCompartment.current.of(
          syntaxHighlighting(isDark ? highlightDark : highlightLight)
        ),
        sendKeymap,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          ".cm-scroller": { minHeight },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only create editor once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync dark mode to editor
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: highlightCompartment.current.reconfigure(
        syntaxHighlighting(isDark ? highlightDark : highlightLight)
      ),
    });
  }, [isDark]);

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="w-full" />;
}
