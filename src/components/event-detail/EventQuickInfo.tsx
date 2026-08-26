import { useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tables } from "@/integrations/supabase/types";
import { CalendarDays, ImageIcon, Upload, Trash2, MapPin, Type, FileText, Globe, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  event: Tables<"events">;
  onUpdate: (fields: Partial<Tables<"events">>) => Promise<void>;
  isUpdating?: boolean;
}

export default function EventQuickInfo({ event, onUpdate, isUpdating }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local state for all fields
  const [formData, setFormData] = useState({
    name: event.name || "",
    description: event.description || "",
    event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : "",
    event_end_date: event.event_end_date ? new Date(event.event_end_date).toISOString().slice(0, 16) : "",
    event_type: event.event_type || "webinar",
    location_type: event.location_type || "virtual",
    location_value: event.location_value || "",
    ticket_price: event.ticket_price ? String(event.ticket_price) : "",
    capacity: event.capacity ? String(event.capacity) : "",
  });

  // Track if changes are made to show the Save button
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Reset local state when event data changes (e.g. initial load)
    setFormData({
      name: event.name || "",
      description: event.description || "",
      event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : "",
      event_end_date: event.event_end_date ? new Date(event.event_end_date).toISOString().slice(0, 16) : "",
      event_type: event.event_type || "webinar",
      location_type: event.location_type || "virtual",
      location_value: event.location_value || "",
      ticket_price: event.ticket_price ? String(event.ticket_price) : "",
      capacity: event.capacity ? String(event.capacity) : "",
    });
    setHasChanges(false);
  }, [event]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Event name is required");
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate({
        name: formData.name.trim(),
        description: formData.description || null,
        event_date: formData.event_date ? new Date(formData.event_date).toISOString() : null,
        event_end_date: formData.event_end_date ? new Date(formData.event_end_date).toISOString() : null,
        event_type: formData.event_type,
        location_type: formData.location_type,
        location_value: formData.location_value || null,
        ticket_price: formData.ticket_price ? parseFloat(formData.ticket_price) : 0,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
      });
      setHasChanges(false);
      toast.success("Event details saved successfully");
    } catch (error) {
      toast.error("Failed to save event details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop();
    const path = `event-images/${event.id}.${ext}`;

    const { error } = await supabase.storage
      .from("event-assets")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error("Failed to upload image");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("event-assets")
      .getPublicUrl(path);

    onUpdate({ background_image_url: urlData.publicUrl });
    toast.success("Image updated!");
  };

  const handleImageDelete = () => {
    onUpdate({ background_image_url: null });
    toast.success("Image removed");
  };

  return (
    <div className="bg-card rounded-xl p-4 sm:p-6 shadow-sm border">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Event Image */}
        <div className="space-y-2 flex flex-col items-center justify-start">
          <Label className="self-start text-sm font-semibold mb-2">Event Image</Label>
          <div className="w-full max-w-[300px] aspect-square rounded-xl overflow-hidden bg-muted flex items-center justify-center relative group border border-border">
            {event.background_image_url ? (
              <>
                <img
                  src={event.background_image_url}
                  alt={event.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button variant="secondary" size="sm" className="h-8 text-xs rounded-full" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5 mr-1" /> Replace
                  </Button>
                  <Button variant="destructive" size="sm" className="h-8 text-xs rounded-full" onClick={handleImageDelete}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                  </Button>
                </div>
              </>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full h-full justify-center"
              >
                <ImageIcon className="w-8 h-8" />
                <span className="text-sm">Upload event image</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Right column: All editable fields */}
        <div className="flex flex-col h-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 content-start flex-1">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
                <Type className="w-3.5 h-3.5" /> Event name
              </Label>
              <Input
                className="h-10 text-sm font-medium rounded-lg"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="E.g. Tech Conference 2026"
              />
            </div>
            
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
                <FileText className="w-3.5 h-3.5" /> Description
              </Label>
              <Textarea
                className="text-sm min-h-[100px] resize-y rounded-lg"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="What is this event about?"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" /> Event date
              </Label>
              <Input
                type="datetime-local"
                className="h-10 text-sm rounded-lg"
                value={formData.event_date}
                onChange={(e) => handleChange("event_date", e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" /> End date
              </Label>
              <Input
                type="datetime-local"
                className="h-10 text-sm rounded-lg"
                value={formData.event_end_date}
                onChange={(e) => handleChange("event_end_date", e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
                <Globe className="w-3.5 h-3.5" /> Event type
              </Label>
              <Select value={formData.event_type} onValueChange={v => handleChange("event_type", v)}>
                <SelectTrigger className="h-10 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="webinar">Webinar</SelectItem>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="hackathon">Hackathon</SelectItem>
                  <SelectItem value="meetup">Meetup</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" /> Location type
              </Label>
              <Select value={formData.location_type} onValueChange={v => handleChange("location_type", v)}>
                <SelectTrigger className="h-10 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5 sm:col-span-2 mb-4">
              <Label className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" /> Location / link
              </Label>
              <Input
                className="h-10 text-sm rounded-lg"
                placeholder="Zoom link, venue address, etc."
                value={formData.location_value}
                onChange={(e) => handleChange("location_value", e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5 sm:col-span-2 mb-4">
              <Label className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
                Ticket Price (Leave 0 for Free)
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="h-10 text-sm rounded-lg"
                placeholder="0.00"
                value={formData.ticket_price}
                onChange={(e) => handleChange("ticket_price", e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5 sm:col-span-2 mb-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
                  Capacity
                </Label>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="unlimited-capacity" 
                    checked={formData.capacity === ""}
                    onChange={(e) => handleChange("capacity", e.target.checked ? "" : "100")}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <Label htmlFor="unlimited-capacity" className="text-xs font-medium text-muted-foreground cursor-pointer">Unlimited</Label>
                </div>
              </div>
              <Input
                type="number"
                min="1"
                className="h-10 text-sm rounded-lg"
                placeholder="Enter capacity or check unlimited"
                value={formData.capacity}
                onChange={(e) => handleChange("capacity", e.target.value)}
                disabled={formData.capacity === ""}
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 pt-4 border-t flex items-center justify-between sm:justify-end">
            {hasChanges && <span className="text-sm text-muted-foreground mr-4 hidden sm:inline-block">Unsaved changes</span>}
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || isSaving || isUpdating}
              className={`rounded-full shadow-sm transition-all ${hasChanges ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted'}`}
            >
              {isSaving || isUpdating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Changes</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
