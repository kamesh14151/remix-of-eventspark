import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Layout, Columns2, Monitor,
  Loader2, Sparkles, MapPin, Video, Globe, Upload, X, PartyPopper, ExternalLink, Eye, Copy, Info, GraduationCap, Plus, MessageCircle
} from "lucide-react";
import { useCreateEvent, useUpdateEvent, useEvent } from "@/hooks/useEvents";
import TemplatePreview from "@/components/TemplatePreview";
import { useBulkInsertFormFields, useFormFields } from "@/hooks/useFormFields";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { studentHackathonFields, standardDefaultFields } from "@/lib/studentFields";

const steps = [
  { number: 1, title: "Event Details", subtitle: "Name, date, location & description" },
  { number: 2, title: "Branding", subtitle: "Template, cover image & style" },
  { number: 3, title: "Registration Form", subtitle: "Fields attendees will fill out" },
];

const imageRecommendations: Record<string, { ratio: string; size: string; tip: string }> = {
  minimal: { ratio: "16:9", size: "1920 × 1080px", tip: "A wide banner works best — it appears at the top of a single-column layout." },
  split: { ratio: "3:4 or 4:5", size: "1200 × 1600px", tip: "Portrait orientation — fills the left half of the screen next to the form." },
  landing: { ratio: "16:9", size: "1920 × 1080px", tip: "Full-width hero banner — use a high-impact photo or branded flyer." },
};

const templates = [
  { id: "minimal", name: "Minimal", icon: Layout, description: "Clean single-column layout with your image as a top banner" },
  { id: "split", name: "Split Screen", icon: Columns2, description: "Image on the left, registration form on the right" },
  { id: "landing", name: "Landing Page", icon: Monitor, description: "Full-width hero image with form embedded below" },
];

const defaultFields = standardDefaultFields;

const popularTimezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "GMT / London" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/Berlin", label: "Central European (CET)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Australia/Sydney", label: "Australia Eastern (AEST)" },
];

const allTimezones = [
  ...popularTimezones,
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
  { value: "America/Anchorage", label: "Alaska (AKST)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Toronto", label: "Toronto (ET)" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Moscow", label: "Moscow (MSK)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Seoul", label: "Seoul (KST)" },
  { value: "Pacific/Auckland", label: "New Zealand (NZST)" },
];

const CreateEvent = () => {
  const { id: editId } = useParams<{ id?: string }>();
  const isEditMode = !!editId;
  const { data: existingEvent, isLoading: eventLoading } = useEvent(isEditMode ? editId : undefined);
  const { data: existingFields, isLoading: fieldsLoading } = useFormFields(isEditMode ? editId : undefined);

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [eventType, setEventType] = useState("webinar");
  const [description, setDescription] = useState("");
  const [locationType, setLocationType] = useState<"virtual" | "physical" | "hybrid">("virtual");
  const [locationValue, setLocationValue] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [ticketPrice, setTicketPrice] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [maxTeamSize, setMaxTeamSize] = useState("1");
  const [minTeamSize, setMinTeamSize] = useState("1");
  const [teamPricing, setTeamPricing] = useState("per_member");
  const [selectedTemplate, setSelectedTemplate] = useState("split");
  const [fields, setFields] = useState(defaultFields);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "email" | "tel" | "url">("text");
  const [enhancing, setEnhancing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const handleEventTypeChange = (newType: string) => {
    setEventType(newType);
    if (newType === "hackathon") {
      setFields(studentHackathonFields.map((f, i) => ({ label: f.label, field_type: f.field_type, required: f.required, position: i })));
      toast.info("Applied Student Hackathon registration template (College, Department, Year...)");
    } else if (eventType === "hackathon" && newType !== "hackathon") {
      setFields(standardDefaultFields.map((f, i) => ({ label: f.label, field_type: f.field_type, required: f.required, position: i })));
    }
  };

  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) return;
    setFields(prev => [...prev, {
      label: newFieldLabel.trim(),
      field_type: newFieldType,
      required: false,
      position: prev.length,
    }]);
    setNewFieldLabel("");
    toast.success("Field added");
  };

  const handleRemoveField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleRequired = (index: number) => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, required: !f.required } : f));
  };
  const [flyerUrl, setFlyerUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [emailFromName, setEmailFromName] = useState("");
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState("");
  const [colorMode, setColorMode] = useState<"light" | "dark">("light");
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const navigate = useNavigate();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const bulkInsertFields = useBulkInsertFormFields();
  const { data: profile } = useProfile();

  // Pre-populate form in edit mode
  useEffect(() => {
    if (isEditMode && existingEvent && !initialized) {
      setName(existingEvent.name);
      setDescription(existingEvent.description || "");
      setEventType(existingEvent.event_type || "webinar");
      setTimezone(existingEvent.timezone || "America/New_York");
      setSelectedTemplate(existingEvent.template || "split");
      setColorMode((existingEvent as any).color_mode === "light" ? "light" : "dark");
      setRequiresApproval(existingEvent.requires_approval || false);
      setCapacity(existingEvent.capacity ? String(existingEvent.capacity) : "");
      setMaxTeamSize(existingEvent.max_team_size ? String(existingEvent.max_team_size) : "1");
      setMinTeamSize((existingEvent as any).min_team_size ? String((existingEvent as any).min_team_size) : "1");
      setTeamPricing(existingEvent.team_pricing || "per_member");

      if (existingEvent.ticket_price && Number(existingEvent.ticket_price) > 0) {
        setIsPaid(true);
        setTicketPrice(String(existingEvent.ticket_price));
      }

      if (existingEvent.event_date) {
        const d = new Date(existingEvent.event_date);
        setStartDate(d.toISOString().split("T")[0]);
        setStartTime(d.toTimeString().slice(0, 5));
      }
      if (existingEvent.event_end_date) {
        const d = new Date(existingEvent.event_end_date);
        setEndDate(d.toISOString().split("T")[0]);
        setEndTime(d.toTimeString().slice(0, 5));
      }

      const lt = (existingEvent.location_type as "virtual" | "physical" | "hybrid") || "virtual";
      setLocationType(lt);
      if (lt === "virtual") {
        setLocationValue(existingEvent.location_value || "");
      } else if (lt === "physical") {
        setLocationAddress(existingEvent.location_value || "");
      } else if (lt === "hybrid" && existingEvent.location_value) {
        const parts = existingEvent.location_value.split(" | ");
        setLocationValue(parts[0] || "");
        setLocationAddress(parts[1] || "");
      }

      setFlyerUrl(existingEvent.background_image_url || null);
      setLogoUrl(existingEvent.logo_url || null);
      setEmailFromName((existingEvent as any).email_from_name || "");
      setWhatsappGroupUrl((existingEvent as any).whatsapp_group_url || "");
      setInitialized(true);
    }
  }, [isEditMode, existingEvent, initialized]);

  useEffect(() => {
    if (isEditMode && existingFields && existingFields.length > 0 && initialized) {
      setFields(existingFields.map(f => ({
        label: f.label,
        field_type: f.field_type,
        required: f.required,
        position: f.position,
      })));
    }
  }, [isEditMode, existingFields, initialized]);

  const handleFlyerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `flyers/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("event-assets").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("event-assets").getPublicUrl(path);
      setFlyerUrl(urlData.publicUrl);
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logos/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("event-assets").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("event-assets").getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
      toast.success("Host logo uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleEnhance = async () => {
    if (!description.trim()) {
      toast.error("Write a description first, then enhance it");
      return;
    }
    setEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-description", {
        body: { description, event_name: name, event_type: eventType },
      });
      if (error) throw error;
      if (data?.enhanced) {
        setDescription(data.enhanced);
        toast.success("Description enhanced!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to enhance description");
    } finally {
      setEnhancing(false);
    }
  };

  const buildEventDate = (date: string, time: string) => {
    if (!date) return undefined;
    return time ? `${date}T${time}:00` : `${date}T00:00:00`;
  };

  const getLocationValue = () => {
    if (locationType === "virtual") return locationValue || undefined;
    if (locationType === "physical") return locationAddress || undefined;
    if (locationType === "hybrid") {
      const parts = [locationValue, locationAddress].filter(Boolean);
      return parts.length ? parts.join(" | ") : undefined;
    }
    return undefined;
  };

  const handlePublish = async () => {
    if (!name.trim()) {
      toast.error("Event name is required");
      return;
    }
    try {
      const eventData = {
        name,
        description: description || undefined,
        event_date: buildEventDate(startDate, startTime),
        event_end_date: buildEventDate(endDate, endTime),
        timezone,
        event_type: eventType,
        template: selectedTemplate,
        location_type: locationType,
        location_value: getLocationValue(),
        ticket_price: isPaid && ticketPrice ? parseFloat(ticketPrice) : undefined,
        requires_approval: requiresApproval,
        capacity: capacity ? parseInt(capacity) : undefined,
        max_team_size: parseInt(maxTeamSize) || 1,
        min_team_size: Math.min(parseInt(minTeamSize) || 1, parseInt(maxTeamSize) || 1),
        team_pricing: teamPricing,
        background_image_url: flyerUrl || undefined,
        logo_url: logoUrl || undefined,
        email_from_name: emailFromName.trim() || undefined,
        whatsapp_group_url: whatsappGroupUrl.trim() || null,
        color_mode: colorMode,
        status: "live",
      } as any;

      if (isEditMode && editId) {
        await updateEvent.mutateAsync({ id: editId, ...eventData } as any);
        const { data: oldFields } = await supabase.from("form_fields").select("id").eq("event_id", editId);
        if (oldFields && oldFields.length > 0) {
          await supabase.from("form_fields").delete().eq("event_id", editId);
        }
        if (fields.length > 0) {
          await bulkInsertFields.mutateAsync(fields.map(f => ({ ...f, event_id: editId })));
        }
        toast.success("Event updated!");
        navigate(`/dashboard/events/${editId}`);
      } else {
        const event = await createEvent.mutateAsync(eventData);
        await bulkInsertFields.mutateAsync(fields.map(f => ({ ...f, event_id: event.id })));
        setCreatedEventId(event.id);
        setCreatedSlug(event.slug);
        setShowSuccess(true);
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to ${isEditMode ? "update" : "create"} event`);
    }
  };

  const isPublishing = createEvent.isPending || updateEvent.isPending || bulkInsertFields.isPending;

  if (isEditMode && (eventLoading || fieldsLoading)) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  // ─── Success Screen ───
  if (showSuccess) {
    const regUrl = `${window.location.origin}/register/${createdSlug}`;
    return (
      <div className="max-w-xl mx-auto py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center space-y-6"
        >
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto">
            <PartyPopper className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Your event is live! 🎉</h1>
            <p className="text-muted-foreground text-lg">
              <span className="font-semibold text-foreground">{name}</span> is ready to accept registrations.
            </p>
          </div>

          <Card className="text-left">
            <CardContent className="p-5 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Registration Link</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input value={regUrl} readOnly className="text-sm bg-muted/50" />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => { navigator.clipboard.writeText(regUrl); toast.success("Link copied!"); }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <p className="text-muted-foreground text-xs mb-0.5">Template</p>
                  <p className="font-medium capitalize">{selectedTemplate}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <p className="text-muted-foreground text-xs mb-0.5">Form Fields</p>
                  <p className="font-medium">{fields.length} fields</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <p className="text-muted-foreground text-xs mb-0.5">Location</p>
                  <p className="font-medium capitalize">{locationType}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <p className="text-muted-foreground text-xs mb-0.5">Capacity</p>
                  <p className="font-medium">{capacity || "Unlimited"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button className="bg-primary" onClick={() => navigate(`/dashboard/events/${createdEventId}`)}>
              <Eye className="w-4 h-4 mr-2" /> View Event Dashboard
            </Button>
            <Button variant="outline" asChild>
              <a href={regUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" /> Preview Registration Page
              </a>
            </Button>
          </div>

          <Button variant="ghost" className="text-muted-foreground" onClick={() => navigate("/dashboard/events")}>
            ← Back to all events
          </Button>
        </motion.div>
      </div>
    );
  }

  // ─── Completeness helpers ───
  const step1Complete = name.trim().length > 0;
  const step2Complete = !!selectedTemplate;

  const progressPercent = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Button variant="ghost" className="mb-0" onClick={() => navigate(isEditMode ? `/dashboard/events/${editId}` : "/dashboard/events")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> {isEditMode ? "Back to Event" : "Back to Events"}
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold">{isEditMode ? "Edit Event" : "Create Your Event"}</h1>
        <p className="text-muted-foreground mt-1">
          {isEditMode ? "Update your event details, template, and form fields." : "Three quick steps and you're live. Let's get started."}
        </p>
      </div>

      {/* ─── Progress Bar ─── */}
      <div className="space-y-3">
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Step pills */}
        <div className="flex items-center gap-1 sm:gap-2">
          {steps.map((s) => {
            const isActive = s.number === step;
            const isDone = s.number < step;
            return (
              <button
                key={s.number}
                onClick={() => {
                  if (isDone) { setStep(s.number); window.scrollTo(0, 0); }
                }}
                disabled={!isDone && !isActive}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all flex-1 min-w-0 ${
                  isActive
                    ? "bg-primary/10 border border-primary/30"
                    : isDone
                    ? "bg-muted/50 border border-border cursor-pointer hover:bg-muted"
                    : "bg-transparent border border-transparent opacity-50"
                }`}
              >
                <div className={`w-7 h-7 min-w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isDone
                    ? "bg-green-500/20 text-green-400"
                    : isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : s.number}
                </div>
                <div className="hidden sm:block min-w-0">
                  <p className={`text-xs font-semibold truncate ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{s.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Step Content ─── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {/* Step 1: Event Details */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Section: Basic Info */}
              <Card>
                <CardContent className="p-6 space-y-5">
                  <div>
                    <h3 className="font-display font-semibold text-base mb-0.5">Basic Info</h3>
                    <p className="text-xs text-muted-foreground">What's your event called and what type is it?</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-name">Event Name <span className="text-destructive">*</span></Label>
                    <Input id="event-name" placeholder="e.g., Product Launch 2026" value={name} onChange={e => setName(e.target.value)} className="text-base" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Event Type</Label>
                      <Select value={eventType} onValueChange={handleEventTypeChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="webinar">Webinar</SelectItem>
                          <SelectItem value="conference">Conference</SelectItem>
                          <SelectItem value="workshop">Workshop</SelectItem>
                          <SelectItem value="hackathon">🎓 Hackathon (Students)</SelectItem>
                          <SelectItem value="meetup">Meetup</SelectItem>
                          <SelectItem value="launch">Product Launch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Organization</Label>
                      <Input value={profile?.company || ""} disabled className="bg-muted/50" placeholder="Set in Settings" />
                    </div>
                  </div>
                  {eventType === "hackathon" && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary">
                      <GraduationCap className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Student Hackathon Mode Active</span>
                        <span className="text-muted-foreground">The registration form will collect College/University, Department/Branch, Year of Study, and Student Roll Number.</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section: Date & Time */}
              <Card>
                <CardContent className="p-6 space-y-5">
                  <div>
                    <h3 className="font-display font-semibold text-base mb-0.5">Date & Time</h3>
                    <p className="text-xs text-muted-foreground">When does your event start and end?</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__popular_header" disabled className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Popular</SelectItem>
                        {popularTimezones.map(tz => (
                          <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                        ))}
                        <SelectItem value="__all_header" disabled className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">All Timezones</SelectItem>
                        {allTimezones.filter(tz => !popularTimezones.find(p => p.value === tz.value)).map(tz => (
                          <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Section: Location */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h3 className="font-display font-semibold text-base mb-0.5">Location</h3>
                    <p className="text-xs text-muted-foreground">Where will your event take place?</p>
                  </div>
                   <div className="flex flex-wrap gap-2">
                    {([
                      { value: "virtual", label: "Virtual", icon: Video },
                      { value: "physical", label: "In-Person", icon: MapPin },
                      { value: "hybrid", label: "Hybrid", icon: Globe },
                    ] as const).map(opt => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={locationType === opt.value ? "default" : "outline"}
                        size="sm"
                        className={locationType === opt.value ? "bg-primary" : ""}
                        onClick={() => setLocationType(opt.value)}
                      >
                        <opt.icon className="w-4 h-4 mr-1" /> {opt.label}
                      </Button>
                    ))}
                  </div>
                  {(locationType === "virtual" || locationType === "hybrid") && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Meeting Link (Zoom, Google Meet, etc.)</Label>
                      <Input placeholder="https://zoom.us/j/..." value={locationValue} onChange={e => setLocationValue(e.target.value)} />
                    </div>
                  )}
                  {(locationType === "physical" || locationType === "hybrid") && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Address</Label>
                      <Input placeholder="123 Main St, City, State" value={locationAddress} onChange={e => setLocationAddress(e.target.value)} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section: Description */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-semibold text-base mb-0.5">Description</h3>
                      <p className="text-xs text-muted-foreground">Tell attendees what to expect. Use AI to polish it up.</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-primary h-7 text-xs"
                      onClick={handleEnhance}
                      disabled={enhancing || !description.trim()}
                    >
                      {enhancing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                      Enhance with AI
                    </Button>
                  </div>
                  <Textarea placeholder="Briefly describe your event — what will attendees learn, do, or experience?" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
                </CardContent>
              </Card>

              {/* Section: Advanced Options */}
              <Card>
                <CardContent className="p-6 space-y-5">
                  <div>
                    <h3 className="font-display font-semibold text-base mb-0.5">Options</h3>
                    <p className="text-xs text-muted-foreground">Ticketing, approvals, and capacity. All optional.</p>
                  </div>

                  {/* Company Info */}
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-semibold">Company Info</Label>
                      <Link to="/dashboard/settings" className="text-xs text-primary hover:underline">Edit in Settings</Link>
                    </div>
                    {profile?.company ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{profile.company}</p>
                        {(profile as any).company_description && (
                          <p className="text-xs text-muted-foreground">{(profile as any).company_description}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No company info set. Add it in Settings.</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Paid Event?</Label>
                    <Switch checked={isPaid} onCheckedChange={setIsPaid} />
                  </div>
                  {isPaid && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Ticket Price (₹)</Label>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {["0", "100", "500", "1000"].map((price) => (
                            <Button
                              key={price}
                              type="button"
                              variant={ticketPrice === price ? "default" : "outline"}
                              size="sm"
                              className={ticketPrice === price ? "bg-primary" : ""}
                              onClick={() => setTicketPrice(price)}
                            >
                              {price === "0" ? "Free" : `₹${price}`}
                            </Button>
                          ))}
                          <Button
                            type="button"
                            variant={!["0", "100", "500", "1000"].includes(ticketPrice) && ticketPrice !== "" ? "default" : "outline"}
                            size="sm"
                            className={!["0", "100", "500", "1000"].includes(ticketPrice) && ticketPrice !== "" ? "bg-primary" : ""}
                            onClick={() => {
                              if (["0", "100", "500", "1000"].includes(ticketPrice)) {
                                setTicketPrice("");
                              }
                            }}
                          >
                            Custom
                          </Button>
                        </div>
                        {!["0", "100", "500", "1000"].includes(ticketPrice) && (
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            className="h-10 text-sm rounded-lg mt-2"
                            placeholder="Enter custom amount (e.g. 250)"
                            value={ticketPrice}
                            onChange={(e) => setTicketPrice(e.target.value)}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Approval</Label>
                      <p className="text-xs text-muted-foreground">Manually approve each registration</p>
                    </div>
                    <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Capacity</Label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="unlimited-capacity-create" 
                          checked={capacity === ""}
                          onChange={(e) => setCapacity(e.target.checked ? "" : "100")}
                          className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <Label htmlFor="unlimited-capacity-create" className="text-xs font-medium text-muted-foreground cursor-pointer">Unlimited</Label>
                      </div>
                    </div>
                    <Input 
                      type="number" 
                      min="1" 
                      placeholder="Enter capacity or check unlimited" 
                      value={capacity} 
                      onChange={e => setCapacity(e.target.value)} 
                      disabled={capacity === ""}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="font-medium text-sm mb-1 text-foreground">Team Registration</h3>
                    <p className="text-xs text-muted-foreground">Allow visitors to register as a team.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Maximum Team Size</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        placeholder="e.g. 1 for solo, 4 for a team of up to 4" 
                        value={maxTeamSize} 
                        onChange={e => setMaxTeamSize(e.target.value)} 
                      />
                      <p className="text-[10px] text-muted-foreground">Set to 1 to disable team registrations.</p>
                    </div>

                    {parseInt(maxTeamSize) > 1 && (
                      <>
                        <div className="space-y-2">
                          <Label>Minimum Required Team Size</Label>
                          <Input 
                            type="number" 
                            min="1" 
                            max={maxTeamSize}
                            placeholder="e.g. 2 or 4" 
                            value={minTeamSize} 
                            onChange={e => setMinTeamSize(e.target.value)} 
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Set equal to Max Team Size to enforce a fixed team size.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Team Pricing Model</Label>
                          <select
                            value={teamPricing}
                            onChange={(e) => setTeamPricing(e.target.value)}
                            className="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="per_member">Per Member (Ticket Price × Number of Members)</option>
                            <option value="flat_fee">Flat Fee (One Ticket Price for the whole team)</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Branding */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Section: Host / Event Logo */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h3 className="font-display font-semibold text-base mb-0.5">Host / Brand Logo</h3>
                    <p className="text-xs text-muted-foreground">This logo appears at the very top of attendee confirmation emails and tickets.</p>
                  </div>

                  {logoUrl ? (
                    <div className="relative inline-block">
                      <div className="h-24 w-24 rounded-2xl border border-border flex items-center justify-center p-2 bg-background shadow-sm">
                        <img src={logoUrl} alt="Host Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                      <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => setLogoUrl(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                      {uploadingLogo ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : (
                        <>
                          <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                          <span className="text-sm font-medium text-muted-foreground">Click to upload Host Logo</span>
                          <span className="text-xs text-muted-foreground/60">Square PNG / JPG recommended</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                    </label>
                  )}
                </CardContent>
              </Card>

              {/* Section: Email Sender Configuration */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h3 className="font-display font-semibold text-base mb-0.5">Email Sender Name (From:)</h3>
                    <p className="text-xs text-muted-foreground">The display name attendees see in their inbox for registration emails and announcements.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Custom From Name</Label>
                    <Input
                      placeholder={profile?.company || name || "e.g. Sona College Hackathon Team"}
                      value={emailFromName}
                      onChange={(e) => setEmailFromName(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Inbox preview: <strong>{emailFromName.trim() || profile?.company || name || "Crack"}</strong> &lt;eventspark@ajstudioz.co.in&gt;
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Section: WhatsApp Group Auto-Join Link */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-base mb-0.5">WhatsApp Group / Community Link</h3>
                      <p className="text-xs text-muted-foreground">Attendees are prompted to auto-join this WhatsApp group immediately upon registering.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-url">WhatsApp Group Invite URL</Label>
                    <Input
                      id="whatsapp-url"
                      placeholder="https://chat.whatsapp.com/..."
                      value={whatsappGroupUrl}
                      onChange={(e) => setWhatsappGroupUrl(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Paste your WhatsApp group or community invite URL (e.g. <code>https://chat.whatsapp.com/AbCdEf12345</code>). If left empty, default community link will be used.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h3 className="font-display font-semibold text-base mb-0.5">Cover Image</h3>
                    <p className="text-xs text-muted-foreground">Upload a flyer or banner for your event page.</p>
                  </div>

                  {/* Image size recommendation */}
                  {imageRecommendations[selectedTemplate] && (
                    <div className="flex gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-medium text-foreground">
                          Recommended for {templates.find(t => t.id === selectedTemplate)?.name}:
                          <span className="text-primary ml-1">{imageRecommendations[selectedTemplate].size}</span>
                          <span className="text-muted-foreground ml-1">({imageRecommendations[selectedTemplate].ratio})</span>
                        </p>
                        <p className="text-muted-foreground">{imageRecommendations[selectedTemplate].tip}</p>
                      </div>
                    </div>
                  )}

                  {flyerUrl ? (
                    <div className="relative inline-block">
                      <img src={flyerUrl} alt="Flyer" className="max-h-40 rounded-lg border border-border object-cover" />
                      <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => setFlyerUrl(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                      {uploading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                          <span className="text-sm text-muted-foreground">Click to upload image</span>
                          <span className="text-xs text-muted-foreground/60">PNG, JPG up to 5MB</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleFlyerUpload} disabled={uploading} />
                    </label>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h3 className="font-display font-semibold text-base mb-0.5">Live Preview</h3>
                    <p className="text-xs text-muted-foreground">This is how your registration page will look.</p>
                  </div>
                  <div className="flex justify-center">
                    <TemplatePreview
                      template={selectedTemplate}
                      eventName={name}
                      description={description}
                      startDate={startDate}
                      startTime={startTime}
                      locationType={locationType}
                      locationValue={locationValue}
                      locationAddress={locationAddress}
                      flyerUrl={flyerUrl}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h3 className="font-display font-semibold text-base mb-0.5">Choose a Template</h3>
                    <p className="text-xs text-muted-foreground">Pick the layout for your public registration page.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((t) => (
                      <div
                        key={t.id}
                        className={`cursor-pointer rounded-xl p-4 text-center transition-all hover:shadow-md border-2 ${
                          selectedTemplate === t.id
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-muted-foreground/30"
                        }`}
                        onClick={() => setSelectedTemplate(t.id)}
                      >
                        <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                          selectedTemplate === t.id ? "bg-primary" : "bg-muted"
                        }`}>
                          <t.icon className={`w-6 h-6 ${selectedTemplate === t.id ? "text-primary-foreground" : "text-muted-foreground"}`} />
                        </div>
                        <h3 className="font-semibold text-sm mb-0.5">{t.name}</h3>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h3 className="font-display font-semibold text-base mb-0.5">Color Mode</h3>
                    <p className="text-xs text-muted-foreground">Light or dark theme for your registration page.</p>
                  </div>
                  <div className="flex gap-2">
                    {(["light", "dark"] as const).map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        variant={colorMode === mode ? "default" : "outline"}
                        size="sm"
                        className={colorMode === mode ? "bg-primary" : ""}
                        onClick={() => setColorMode(mode)}
                      >
                        {mode === "light" ? "☀️ Light" : "🌙 Dark"}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Form Fields */}
          {step === 3 && (
            <div className="space-y-5">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display font-semibold text-base mb-0.5">Registration Form Fields</h3>
                      <p className="text-xs text-muted-foreground">Fields attendees will complete when they register.</p>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`rounded-full text-xs ${eventType === "hackathon" ? "border-primary text-primary bg-primary/5" : ""}`}
                        onClick={() => {
                          setFields(studentHackathonFields.map((f, i) => ({ label: f.label, field_type: f.field_type, required: f.required, position: i })));
                          toast.success("Applied Student Hackathon fields!");
                        }}
                      >
                        <GraduationCap className="w-3.5 h-3.5 mr-1" /> Student Hackathon Template
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full text-xs"
                        onClick={() => {
                          setFields(standardDefaultFields.map((f, i) => ({ label: f.label, field_type: f.field_type, required: f.required, position: i })));
                          toast.success("Applied Standard fields!");
                        }}
                      >
                        💼 Standard Template
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {fields.map((field, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-8 rounded-full bg-primary/50" />
                          <div>
                            <p className="text-sm font-medium">{field.label}</p>
                            <p className="text-xs text-muted-foreground capitalize">{field.field_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`cursor-pointer select-none transition-all ${
                              field.required ? "bg-primary text-primary-foreground text-xs" : "bg-muted text-muted-foreground border border-border text-xs"
                            }`}
                            onClick={() => handleToggleRequired(i)}
                            title="Click to toggle required/optional"
                          >
                            {field.required ? "Required" : "Optional"}
                          </Badge>
                          {i >= 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-full"
                              onClick={() => handleRemoveField(i)}
                              title="Remove field"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Field */}
                  <div className="border-t border-border pt-4 mt-2">
                    <Label className="text-xs text-muted-foreground mb-2 block">Add Another Field</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        placeholder="Field label (e.g. Discord Username, Portfolio)"
                        value={newFieldLabel}
                        onChange={e => setNewFieldLabel(e.target.value)}
                        className="flex-1 rounded-full text-xs"
                      />
                      <Select value={newFieldType} onValueChange={(v: any) => setNewFieldType(v)}>
                        <SelectTrigger className="w-full sm:w-28 rounded-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="tel">Phone</SelectItem>
                          <SelectItem value="url">URL</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full text-xs"
                        onClick={handleAddCustomField}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Review summary */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6 space-y-3">
                  <h3 className="font-display font-semibold text-base">Ready to publish?</h3>
                  <p className="text-sm text-muted-foreground">Here's a quick summary of your event:</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Event</p>
                      <p className="font-medium truncate">{name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Type</p>
                      <p className="font-medium capitalize">{eventType}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p className="font-medium">{startDate || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Location</p>
                      <p className="font-medium capitalize">{locationType}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Template</p>
                      <p className="font-medium capitalize">{selectedTemplate}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Fields</p>
                      <p className="font-medium">{fields.length} fields ({fields.filter(f => f.required).length} required)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ─── Navigation Footer ─── */}
      <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2 pb-8">
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => { if (step > 1) { setStep(step - 1); window.scrollTo(0, 0); } }} disabled={step === 1}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="flex items-center gap-3">
          {step < 3 ? (
            <Button className="bg-primary w-full sm:w-auto" onClick={() => { setStep(step + 1); window.scrollTo(0, 0); }} disabled={step === 1 && !step1Complete}>
              Next: {steps[step]?.title} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button className="bg-primary px-6 w-full sm:w-auto" onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isEditMode ? "Saving…" : "Publishing…"}</>
              ) : (
                <>{isEditMode ? "Save Changes" : "Publish Event"} <Check className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
