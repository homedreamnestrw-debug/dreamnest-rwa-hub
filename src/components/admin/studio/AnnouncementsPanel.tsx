import { useMemo, useRef, useState } from "react";
import Konva from "konva";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  ANNOUNCEMENT_TEMPLATES,
  AnnouncementTemplate,
} from "./templates/announcementRenderers";
import { AnnouncementPreview } from "./AnnouncementPreview";
import { PlatformFormatTabs } from "./PlatformFormatTabs";
import { ExportBar } from "./ExportBar";
import { FORMATS, PlatformFormat } from "./templates/brandTokens";
import { useBrandAssets } from "@/hooks/useBrandAssets";
import { useCreativeHistory } from "@/hooks/useCreativeHistory";

export function AnnouncementsPanel() {
  const [tplKey, setTplKey] = useState<string>(ANNOUNCEMENT_TEMPLATES[0].key);
  const [values, setValues] = useState<Record<string, string>>({});
  const [format, setFormat] = useState<PlatformFormat>("ig_post");
  const stageRef = useRef<Konva.Stage>(null);
  const { logo } = useBrandAssets();
  const { log } = useCreativeHistory();

  const tpl = useMemo(
    () =>
      ANNOUNCEMENT_TEMPLATES.find((t) => t.key === tplKey) ??
      ANNOUNCEMENT_TEMPLATES[0],
    [tplKey],
  );

  const dim = FORMATS[format];
  const previewW = 480;
  const previewScale = previewW / dim.w;

  const grouped = useMemo(() => {
    const g: Record<string, AnnouncementTemplate[]> = {
      business: [],
      seasonal: [],
      engagement: [],
    };
    ANNOUNCEMENT_TEMPLATES.forEach((t) => g[t.category].push(t));
    return g;
  }, []);

  const onPickTemplate = (k: string) => {
    setTplKey(k);
    setValues({});
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px,1fr]">
      <Card>
        <CardContent className="space-y-3 p-3">
          <div className="text-xs font-medium text-muted-foreground">
            Choose a template
          </div>
          <Tabs defaultValue="business">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="business" className="text-xs">Business</TabsTrigger>
              <TabsTrigger value="seasonal" className="text-xs">Seasonal</TabsTrigger>
              <TabsTrigger value="engagement" className="text-xs">Engage</TabsTrigger>
            </TabsList>
            {(["business", "seasonal", "engagement"] as const).map((cat) => (
              <TabsContent key={cat} value={cat}>
                <ScrollArea className="h-[280px] rounded-md border">
                  <div className="grid grid-cols-2 gap-2 p-2">
                    {grouped[cat].map((t) => (
                      <button
                        key={t.key}
                        onClick={() => onPickTemplate(t.key)}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-md border p-2 text-left text-xs hover:border-primary",
                          tplKey === t.key && "border-primary ring-2 ring-primary/40",
                        )}
                      >
                        <span className="text-base">{t.emoji}</span>
                        <span className="font-medium">{t.title}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>

          {tpl.fields.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <div className="text-xs font-medium text-muted-foreground">
                Fill in details
              </div>
              {tpl.fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      rows={3}
                      placeholder={f.placeholder}
                      value={values[f.key] ?? ""}
                      onChange={(e) =>
                        setValues({ ...values, [f.key]: e.target.value })
                      }
                    />
                  ) : (
                    <Input
                      type={f.type === "number" || f.type === "rating" ? "number" : "text"}
                      placeholder={f.placeholder}
                      value={values[f.key] ?? ""}
                      onChange={(e) =>
                        setValues({ ...values, [f.key]: e.target.value })
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium">{tpl.title}</div>
              <div className="text-xs text-muted-foreground">
                {dim.label} · {dim.w}×{dim.h}
              </div>
            </div>
            <div className="w-[260px]">
              <PlatformFormatTabs value={format} onChange={setFormat} />
            </div>
          </div>

          <div className="flex justify-center rounded-md border bg-muted/30 p-3">
            <div
              className="overflow-hidden rounded-sm shadow"
              style={{ width: previewW, height: previewW * (dim.h / dim.w) }}
            >
              <AnnouncementPreview
                ref={stageRef}
                template={tpl}
                values={values}
                format={format}
                logo={logo}
                scale={previewScale}
              />
            </div>
          </div>

          <ExportBar
            stageRef={stageRef}
            filenameBase={`dreamnest-${tpl.key}-${format}`}
            caption={`${tpl.buildHeadline?.(values) ?? tpl.defaultHeadline}\n${tpl.buildSubline?.(values) ?? tpl.defaultSubline ?? ""}\ndreamnestrw.com`}
            onLogged={() =>
              log.mutate({
                asset_type: "announcement",
                template_key: tpl.key,
                platform_format: format,
                config: { values },
                caption: `${tpl.buildHeadline?.(values) ?? tpl.defaultHeadline}`,
              })
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
