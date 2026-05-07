import { useEffect, useRef } from "react";

interface Props {
  value: string;
  rect: { x: number; y: number; w: number; h: number };
  onCommit: (v: string) => void;
  onCancel: () => void;
}

export function InlineTextEditor({ value, rect, onCommit, onCancel }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <textarea
      ref={ref}
      defaultValue={value}
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onCommit((e.target as HTMLTextAreaElement).value);
        }
        if (e.key === "Escape") onCancel();
      }}
      style={{
        position: "fixed",
        left: rect.x,
        top: rect.y,
        width: Math.max(rect.w, 160),
        minHeight: rect.h,
        zIndex: 9999,
        padding: "4px 6px",
        border: "2px solid #C17A5A",
        borderRadius: 4,
        font: "14px Inter, sans-serif",
        background: "white",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    />
  );
}
