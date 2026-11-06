import { ScrollArea } from "@/components/ui/scroll-area";

export default function ScrollProbe() {
  return (
    <div
      style={{
        width: 380,
        marginTop: 40,
        marginLeft: 40,
        border: "1px solid #ccc",
        padding: 16,
        background: "#fff",
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Scroll probe</h3>
      <ScrollArea className="max-h-[55vh] pr-2">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 13,
                whiteSpace: "nowrap",
              }}
            >
              variant {i + 1} — RWF 35,000 — Stock 3 — SKU DN-GEN-005-X-{i}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div style={{ borderTop: "1px solid #ddd", paddingTop: 8, fontSize: 13 }}>footer</div>
    </div>
  );
}
