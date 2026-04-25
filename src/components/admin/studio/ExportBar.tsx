import { RefObject } from "react";
import Konva from "konva";
import { Button } from "@/components/ui/button";
import { Download, Image as ImageIcon, Copy, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { saveAs } from "file-saver";
import { SITE_URL } from "./templates/brandTokens";

interface Props {
  stageRef: RefObject<Konva.Stage>;
  filenameBase: string;
  caption: string;
  onLogged?: () => void;
}

function dataURLtoBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function ExportBar({ stageRef, filenameBase, caption, onLogged }: Props) {
  const downloadAt = (mime: "image/png" | "image/jpeg") => {
    const stage = stageRef.current;
    if (!stage) return;
    const ratio = 1 / (stage.scaleX() || 1);
    const dataUrl = stage.toDataURL({
      mimeType: mime,
      quality: mime === "image/jpeg" ? 0.92 : 1,
      pixelRatio: ratio,
    });
    const blob = dataURLtoBlob(dataUrl);
    const ext = mime === "image/jpeg" ? "jpg" : "png";
    saveAs(blob, `${filenameBase}.${ext}`);
    onLogged?.();
  };

  const copyClipboard = async () => {
    const stage = stageRef.current;
    if (!stage) return;
    try {
      const ratio = 1 / (stage.scaleX() || 1);
      const dataUrl = stage.toDataURL({ mimeType: "image/png", pixelRatio: ratio });
      const blob = dataURLtoBlob(dataUrl);
      const ClipboardItemCtor = (window as any).ClipboardItem;
      await (navigator.clipboard as any).write([
        new ClipboardItemCtor({ "image/png": blob }),
      ]);
      toast({ title: "Image copied to clipboard" });
    } catch (e) {
      toast({
        title: "Copy failed",
        description: "Your browser blocked clipboard image copy.",
        variant: "destructive",
      });
    }
  };

  const shareWhatsApp = () => {
    const text = caption ? `${caption}\n${SITE_URL}` : SITE_URL;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onLogged?.();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => downloadAt("image/png")}>
        <Download className="h-4 w-4" /> PNG
      </Button>
      <Button size="sm" variant="outline" onClick={() => downloadAt("image/jpeg")}>
        <ImageIcon className="h-4 w-4" /> JPG
      </Button>
      <Button size="sm" variant="outline" onClick={copyClipboard}>
        <Copy className="h-4 w-4" /> Copy
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={shareWhatsApp}
      >
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </Button>
    </div>
  );
}
