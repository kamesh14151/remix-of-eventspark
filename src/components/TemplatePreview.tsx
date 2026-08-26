import { Calendar, MapPin, Video, Globe } from "lucide-react";

interface TemplatePreviewProps {
  template: string;
  eventName: string;
  description: string;
  startDate: string;
  startTime: string;
  locationType: "virtual" | "physical" | "hybrid";
  locationValue: string;
  locationAddress: string;
  flyerUrl: string | null;
}

const FormFieldsMock = () => (
  <div className="space-y-1.5">
    <div className="h-1.5 w-10 rounded bg-muted-foreground/20 text-[6px]" />
    <div className="h-4 rounded border border-border bg-background" />
    <div className="h-1.5 w-12 rounded bg-muted-foreground/20" />
    <div className="h-4 rounded border border-border bg-background" />
    <div className="h-1.5 w-8 rounded bg-muted-foreground/20" />
    <div className="h-4 rounded border border-border bg-background" />
    <div className="h-5 rounded bg-primary mt-2" />
  </div>
);

const EventInfo = ({ eventName, description, startDate, startTime, locationType }: Partial<TemplatePreviewProps>) => (
  <div className="space-y-1">
    <p className="font-bold text-[8px] leading-tight truncate">{eventName || "Event Name"}</p>
    {startDate && (
      <div className="flex items-center gap-0.5 text-muted-foreground">
        <Calendar className="w-2 h-2" />
        <span className="text-[5px]">{startDate} {startTime}</span>
      </div>
    )}
    {locationType && (
      <div className="flex items-center gap-0.5 text-muted-foreground">
        {locationType === "virtual" ? <Video className="w-2 h-2" /> : locationType === "physical" ? <MapPin className="w-2 h-2" /> : <Globe className="w-2 h-2" />}
        <span className="text-[5px] capitalize">{locationType}</span>
      </div>
    )}
    {description && <p className="text-[5px] text-muted-foreground line-clamp-2">{description}</p>}
  </div>
);

const ImagePlaceholder = ({ flyerUrl, className = "" }: { flyerUrl: string | null; className?: string }) => (
  flyerUrl ? (
    <div className={`flex items-center justify-center overflow-hidden rounded-xl border border-border/50 shadow-sm shrink-0 bg-background ${className}`}>
      <img src={flyerUrl} alt="Flyer" className="w-full h-full object-cover" />
    </div>
  ) : (
    <div className={`flex items-center justify-center overflow-hidden rounded-xl border border-border/50 shadow-sm shrink-0 bg-muted ${className}`}>
      <div className="text-[6px] text-muted-foreground font-medium">No Image</div>
    </div>
  )
);

const TemplatePreview = (props: TemplatePreviewProps) => {
  const { template, flyerUrl } = props;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background" style={{ width: 360, height: 240 }}>
      {template === "minimal" && (
        <div className="flex flex-col items-center justify-center h-full p-4 space-y-3">
          <ImagePlaceholder flyerUrl={flyerUrl} className="w-12 h-12" />
          <div className="w-full max-w-[160px] space-y-2">
            <EventInfo {...props} />
            <FormFieldsMock />
          </div>
        </div>
      )}

      {template === "split" && (
        <div className="flex h-full">
          <div className="w-1/2 flex items-center justify-center bg-muted/20">
            <ImagePlaceholder flyerUrl={flyerUrl} className="w-20 h-20" />
          </div>
          <div className="w-1/2 p-2 flex flex-col justify-center space-y-2 border-l border-border/30">
            <EventInfo {...props} />
            <FormFieldsMock />
          </div>
        </div>
      )}

      {template === "stacked" && (
        <div className="flex flex-col h-full bg-muted/10">
          <div className="flex items-center justify-center py-4 bg-muted/30">
            <ImagePlaceholder flyerUrl={flyerUrl} className="w-12 h-12" />
          </div>
          <div className="flex-1 p-3 space-y-2 overflow-hidden bg-background">
            <EventInfo {...props} />
            <FormFieldsMock />
          </div>
        </div>
      )}

      {template === "landing" && (
        <div className="flex flex-col h-full relative">
          <div className="absolute inset-0 bg-primary/10" />
          <div className="relative z-10 flex flex-col items-center pt-6 space-y-2">
            <ImagePlaceholder flyerUrl={flyerUrl} className="w-16 h-16 shadow-lg border-white/20" />
            <p className="text-[10px] font-bold text-foreground px-2 text-center leading-tight">
              {props.eventName || "Event Name"}
            </p>
          </div>
          <div className="relative z-10 flex-1 px-4 pb-2 mt-auto">
            <div className="bg-background rounded-md p-2 shadow-sm border border-border/50">
              <FormFieldsMock />
            </div>
          </div>
        </div>
      )}

      {template === "cards" && (
        <div className="p-2 h-full flex flex-col items-center bg-muted/10">
          <ImagePlaceholder flyerUrl={flyerUrl} className="w-10 h-10 mb-2" />
          <EventInfo {...props} className="text-center w-full" />
          <div className="grid grid-cols-2 gap-1 mt-2 flex-1 w-full">
            {["Session 1", "Session 2", "Session 3", "Session 4"].map(s => (
              <div key={s} className="border border-border rounded p-1 flex items-center justify-center">
                <span className="text-[5px] text-muted-foreground">{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatePreview;
