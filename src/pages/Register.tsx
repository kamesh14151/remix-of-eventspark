import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useParams } from "react-router-dom";
import { CalendarDays, MapPin, Video, Globe, Loader2, CheckCircle2, Zap, Plus, Trash2 } from "lucide-react";
import { useEventBySlug, Event } from "@/hooks/useEvents";
import { useFormFields } from "@/hooks/useFormFields";
import { useCreateRegistration } from "@/hooks/useRegistrations";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Tables } from "@/integrations/supabase/types";

type FormField = Tables<"form_fields">;

export type TeamMember = { name: string; email: string };

// ─── Helper: format event date/time with timezone ───
function formatEventDateTime(event: Event) {
  const tz = event.timezone || "America/New_York";
  const parts: string[] = [];

  if (event.event_date) {
    const start = new Date(event.event_date);
    const dateStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: tz });
    const timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });

    let line = `${dateStr} · ${timeStr}`;

    if (event.event_end_date) {
      const end = new Date(event.event_end_date);
      const endDateStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: tz });
      const endTimeStr = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });

      if (endDateStr === dateStr) {
        line += ` – ${endTimeStr}`;
      } else {
        line += ` – ${endDateStr} · ${endTimeStr}`;
      }
    }

    // Timezone abbreviation
    const tzAbbr = start.toLocaleTimeString("en-US", { timeZone: tz, timeZoneName: "short" }).split(" ").pop() || tz;
    line += ` ${tzAbbr}`;

    parts.push(line);
  }

  return parts.join("");
}

// ─── Extracted stable components ───

const SuccessCard = ({ brandColor, event, teamMembers }: { brandColor: string; event: Event; teamMembers: TeamMember[] }) => (
  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg mx-auto">
    <Card className="border-border shadow-2xl">
      <CardContent className="p-8 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: brandColor }} />
        </motion.div>
        <h2 className="text-2xl font-display font-bold mb-2">You're Registered!</h2>
        <p className="text-muted-foreground">Thank you for registering for <strong>{event.name}</strong>. You'll receive a confirmation email shortly.</p>
        <div className="mt-6 border-t border-border pt-5 text-left space-y-4">
          {formatEventDateTime(event) && (
            <div className="flex items-start gap-3 text-sm">
              <CalendarDays className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div><p className="font-medium">Date and time</p><p className="text-muted-foreground">{formatEventDateTime(event)}</p></div>
            </div>
          )}
          <div className="flex items-start gap-3 text-sm">
            {event.location_type === "physical" ? <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" /> : event.location_type === "hybrid" ? <Globe className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" /> : <Video className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />}
            <div className="min-w-0"><p className="font-medium">{event.location_type === "physical" ? "Venue" : event.location_type === "hybrid" ? "Venue and online" : "Online location"}</p><p className="text-muted-foreground break-words">{event.location_value || (event.location_type === "physical" ? "Location details will be shared by the host." : "Online details will be shared by the host.")}</p></div>
          </div>
          {teamMembers.length > 0 && (
            <div className="flex items-start gap-3 text-sm">
              <Users className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0"><p className="font-medium">Team members ({teamMembers.length})</p><ul className="mt-1 space-y-1 text-muted-foreground">{teamMembers.map((member, index) => <li key={`${member.email}-${index}`} className="break-words">{member.name} · {member.email}</li>)}</ul></div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const CompactLogo = ({ flyerUrl, eventName, className = "" }: { flyerUrl: string | null; eventName: string; className?: string }) => (
  flyerUrl ? (
    <div className={`w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] overflow-hidden border border-border/50 shadow-xl shrink-0 bg-background ${className}`}>
      <img src={flyerUrl} alt={eventName} className="w-full h-full object-cover" />
    </div>
  ) : null
);

const EventInfo = ({ event, className = "" }: { event: Event; className?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const locationIcon = event.location_type === "physical" ? <MapPin className="w-4 h-4" /> : event.location_type === "hybrid" ? <Globe className="w-4 h-4" /> : <Video className="w-4 h-4" />;
  const locationLabel = event.location_type === "physical" ? "In-Person" : event.location_type === "hybrid" ? "Hybrid" : "Virtual";
  const dateTimeStr = formatEventDateTime(event);

  // Truncate to first 2 sentences
  const description = event.description || "";
  const sentences = description.match(/[^.!?]*[.!?]+/g) || [description];
  const isTruncatable = sentences.length > 1;
  const truncated = isTruncatable ? sentences.slice(0, 1).join("").trim() + "…" : description;

  return (
    <div className={`pt-6 md:pt-0 ${className}`}>
      {dateTimeStr && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <CalendarDays className="w-4 h-4 shrink-0" />
          {dateTimeStr}
        </div>
      )}
      <h1 className="text-2xl sm:text-4xl md:text-7xl font-display font-bold">{event.name}</h1>
      {description && (
        <div className="mt-4 mb-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {expanded || !isTruncatable ? description : truncated}
          </p>
          {isTruncatable && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-sm font-medium mt-1 hover:underline"
              style={{ color: "hsl(var(--primary))" }}
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {locationIcon} {locationLabel}
      </div>
    </div>
  );
};

const RegistrationForm = ({
  formFields,
  formData,
  onFieldChange,
  consent,
  onConsentChange,
  onSubmit,
  isPending,
  brandColor,
  className = "",
  teamMembers,
  onTeamMembersChange,
  maxTeamSize,
}: {
  formFields: FormField[] | undefined;
  formData: Record<string, string>;
  onFieldChange: (label: string, value: string) => void;
  consent: boolean;
  onConsentChange: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  brandColor: string;
  className?: string;
  teamMembers?: TeamMember[];
  onTeamMembersChange?: (members: TeamMember[]) => void;
  maxTeamSize?: number;
}) => {
  const addTeamMember = () => {
    if (onTeamMembersChange && teamMembers && maxTeamSize && teamMembers.length < maxTeamSize - 1) {
      onTeamMembersChange([...teamMembers, { name: "", email: "" }]);
    }
  };

  const removeTeamMember = (index: number) => {
    if (onTeamMembersChange && teamMembers) {
      onTeamMembersChange(teamMembers.filter((_, i) => i !== index));
    }
  };

  const updateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
    if (onTeamMembersChange && teamMembers) {
      const updated = [...teamMembers];
      updated[index] = { ...updated[index], [field]: value };
      onTeamMembersChange(updated);
    }
  };

  return (
    <form onSubmit={onSubmit} className={`space-y-4 ${className}`}>
    {formFields?.map((field) => (
      <div key={field.id} className="space-y-2">
        <Label>{field.label}{field.required && " *"}</Label>
        <Input
          type={field.field_type === "email" ? "email" : field.field_type === "tel" ? "tel" : "text"}
          placeholder={field.placeholder || field.label}
          required={field.required}
          value={formData[field.label] || ""}
          onChange={e => onFieldChange(field.label, e.target.value)}
        />
      </div>
    ))}
    {maxTeamSize && maxTeamSize > 1 && teamMembers && onTeamMembersChange && (
      <div className="pt-4 mt-4 border-t border-border">
        <h3 className="font-semibold text-lg mb-4">Team Members</h3>
        {teamMembers.length > 0 ? (
          <div className="space-y-4 mb-4">
            {teamMembers.map((member, idx) => (
              <div key={idx} className="p-4 bg-muted/50 rounded-lg relative space-y-3 border border-border">
                <div className="absolute top-3 right-3">
                  <button type="button" onClick={() => removeTeamMember(idx)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="pr-6 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Member {idx + 2} Name</Label>
                    <Input required value={member.name} onChange={e => updateTeamMember(idx, "name", e.target.value)} placeholder="Full Name" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Member {idx + 2} Email</Label>
                    <Input required type="email" value={member.email} onChange={e => updateTeamMember(idx, "email", e.target.value)} placeholder="Email Address" className="h-9 text-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">Registering as a team? Add your team members below.</p>
        )}
        
        {teamMembers.length < maxTeamSize - 1 && (
          <Button type="button" variant="outline" onClick={addTeamMember} className="w-full text-sm border-dashed">
            <Plus className="w-4 h-4 mr-2" /> Add Team Member
          </Button>
        )}
      </div>
    )}

    <div className="flex items-start gap-2 pt-2">
      <Checkbox id="gdpr" checked={consent} onCheckedChange={(c) => onConsentChange(!!c)} />
      <Label htmlFor="gdpr" className="text-xs text-muted-foreground leading-relaxed">
        I agree to receive communications about this event and consent to the processing of my data in accordance with the Privacy Policy.
      </Label>
    </div>
    <Button
      type="submit"
      className="w-full h-11 text-base border-0 text-white"
      style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}CC)` }}
      disabled={isPending}
    >
      {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering…</> : "Register Now"}
    </Button>
  </form>
  );
};

const FlyerImage = ({ flyerUrl, eventName, className = "" }: { flyerUrl: string | null; eventName: string; className?: string }) => (
  flyerUrl ? (
    <div className={`flex items-start justify-center bg-muted ${className}`}>
      <img src={flyerUrl} alt={eventName} className="w-full h-auto object-contain" />
    </div>
  ) : null
);

const PoweredBy = () => (
  <p className="text-center text-xs text-muted-foreground mt-6">
    Powered by <span className="font-semibold">eventspark</span> — Developed by <span className="font-semibold">AJ STUDIOZ</span>
  </p>
);

// ─── Main component ───

const Register = () => {
  const { slug } = useParams();
  const { data: event, isLoading: eventLoading } = useEventBySlug(slug);
  const { data: formFields, isLoading: fieldsLoading } = useFormFields(event?.id);
  const createReg = useCreateRegistration();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const handleFieldChange = useCallback((label: string, value: string) => {
    setFormData(prev => ({ ...prev, [label]: value }));
  }, []);

  if (eventLoading || (event && fieldsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-display font-bold mb-2">Event Not Found</h1>
            <p className="text-muted-foreground">This event may have ended or the link is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // (moved up to fix rules of hooks)

  const completeRegistration = async (finalData: any) => {
    try {
      const registrationId = await createReg.mutateAsync({ event_id: event.id, data: finalData });
      
      // Fire and forget email notification
      const emailField = formFields?.find(f => f.field_type === "email")?.label || "Email";
      const lowerLabel = (field: FormField) => field.label.toLowerCase().trim();
      const fullNameField = formFields?.find(field => /^(full name|attendee name|name)$/.test(lowerLabel(field)));
      const firstNameField = formFields?.find(field => /first name|^first$/.test(lowerLabel(field)));
      const lastNameField = formFields?.find(field => /last name|surname|^last$/.test(lowerLabel(field)));
      const email = (formData[emailField] || formData["email"] || formData["Email"] || Object.values(formData).find((value) => typeof value === "string" && value.includes("@")) || "").toString().trim();
      const firstAndLastName = [firstNameField && formData[firstNameField.label], lastNameField && formData[lastNameField.label]].filter(Boolean).join(" ").trim();
      const name = (fullNameField && formData[fullNameField.label] || firstAndLastName || formData["name"] || formData["Name"] || Object.values(formData).find((value) => typeof value === "string" && value.trim().length > 2 && !value.includes("@")) || "Attendee").toString().trim();
      
      if (email) {
        if (!import.meta.env.DEV) {
          fetch("/api/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "registration",
              email: email,
              name,
              eventTitle: event.name,
              eventDate: formatEventDateTime(event),
              eventEndDate: event.event_end_date ? new Date(event.event_end_date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: event.timezone || "America/New_York" }) : "",
              eventTimezone: event.timezone || "",
              eventType: event.event_type || "Event",
              eventLocation: event.location_type === "physical" ? "In-Person" : event.location_type === "hybrid" ? "Hybrid" : "Virtual",
              venueDetails: event.location_value || "",
              eventDescription: event.description || "",
              hostName: (event as any).profiles?.company || (event as any).profiles?.full_name || "EventSpark",
              amount: finalData.razorpay_payment_id ? event.ticket_price ? Number(event.ticket_price) * 100 : 0 : undefined,
              paymentId: finalData.razorpay_payment_id,
              registrationId,
              ticketPrice: event.ticket_price || 0,
              teamPricing: event.team_pricing || "",
              teamMembers: teamMembers.length > 0 ? teamMembers : undefined,
              flyerUrl: event.background_image_url
            })
          }).catch(e => console.error("Failed to send registration email:", e));
        } else {
          console.log("[DEV MODE] Skipped sending registration email to:", email);
        }
      }

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast.error("Please accept the privacy policy to register.");
      return;
    }
    const missing = formFields?.filter(f => f.required && !formData[f.label]?.trim());
    if (missing && missing.length > 0) {
      toast.error(`Please fill in: ${missing.map(f => f.label).join(", ")}`);
      return;
    }

    let price = event.ticket_price ? Number(event.ticket_price) : 0;
    if (price > 0 && event.max_team_size && event.max_team_size > 1 && event.team_pricing === "per_member") {
      price = price * (1 + teamMembers.length);
    }

    if (price > 0) {
      setIsProcessingPayment(true);
      try {
        // Load razorpay script if not loaded
        if (!(window as any).Razorpay) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }

        // Create order via backend
        const orderRes = await fetch("/api/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: price * 100 }), // Convert to paise
        });

        if (!orderRes.ok) {
          throw new Error("Failed to initialize payment");
        }

        const orderData = await orderRes.json();
        const emailField = formFields?.find(f => f.field_type === "email")?.label || "Email";
        const nameField = formFields?.find(f => f.label.toLowerCase().includes("name"))?.label || "Name";

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: orderData.amount,
          currency: orderData.currency,
          name: event.name,
          description: "Event Registration",
          order_id: orderData.order_id,
          handler: async function (response: any) {
            try {
              // Verify payment signature
              const verifyRes = await fetch("/api/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                })
              });

              if (verifyRes.ok) {
                // Payment successful, proceed to register
                await completeRegistration({
                  ...formData,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  team_members: teamMembers.length > 0 ? teamMembers : undefined
                });
              } else {
                toast.error("Payment verification failed.");
                setIsProcessingPayment(false);
              }
            } catch (err) {
              console.error(err);
              toast.error("Error verifying payment.");
              setIsProcessingPayment(false);
            }
          },
          prefill: {
            name: formData[nameField] || formData["name"] || formData["Name"] || "",
            email: formData[emailField] || formData["email"] || formData["Email"] || ""
          },
          theme: {
            color: event.primary_color || "#7C3AED"
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", function (response: any) {
          toast.error("Payment failed: " + response.error.description);
          setIsProcessingPayment(false);
        });
        
        // Handle modal close
        options.modal = {
          ondismiss: function() {
            setIsProcessingPayment(false);
          }
        };
        
        rzp.open();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to initiate payment");
        setIsProcessingPayment(false);
      }
    } else {
      // Free event
      await completeRegistration({ ...formData, team_members: teamMembers.length > 0 ? teamMembers : undefined });
    }
  };

  const brandColor = event.primary_color || "#7C3AED";
  const template = event.template || "split";
  const flyerUrl = event.background_image_url;
  const isDark = (event as any).color_mode === "dark";

  const formProps = {
    formFields,
    formData,
    onFieldChange: handleFieldChange,
    consent,
    onConsentChange: setConsent,
    onSubmit: handleSubmit,
    isPending: createReg.isPending || isProcessingPayment,
    brandColor,
    teamMembers,
    onTeamMembersChange: setTeamMembers,
    maxTeamSize: event.max_team_size || 1,
  };

  const wrapDark = (content: React.ReactNode) => (
    <div className={isDark ? "dark" : ""}>
      {content}
    </div>
  );

  if (submitted) {
    return wrapDark(
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-foreground" style={{ background: isDark ? undefined : `linear-gradient(135deg, ${brandColor}15, ${brandColor}05)` }}>
        <SuccessCard brandColor={brandColor} event={event} teamMembers={teamMembers} />
      </div>
    );
  }

  // ─── MINIMAL ───
  if (template === "minimal") {
    return wrapDark(
      <div className="min-h-screen relative bg-background text-foreground">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${brandColor}15, ${brandColor}05)` }} />
        <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
            <Card className="border-border shadow-2xl">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <CompactLogo flyerUrl={flyerUrl} eventName={event.name} className="mx-auto mb-6" />
                  {!flyerUrl && (
                    <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center mx-auto mb-4" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}CC)` }}>
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <EventInfo event={event} />
                </div>
                <RegistrationForm {...formProps} />
                <PoweredBy />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── SPLIT SCREEN ───
  if (template === "split") {
    return wrapDark(
      <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
        {/* Left: flyer image — top-aligned on mobile */}
        <div className="md:w-1/2 bg-muted/20 flex flex-col items-center justify-center p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5" />
          <div className="relative z-10 flex flex-col items-center">
            <CompactLogo flyerUrl={flyerUrl} eventName={event.name} className="w-32 h-32 sm:w-48 sm:h-48 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl mb-8" />
            {!flyerUrl && (
              <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}CC)` }}>
                <Zap className="w-10 h-10 text-white" />
              </div>
            )}
            <h2 className="text-3xl font-display font-bold text-center mt-2">{event.name}</h2>
          </div>
        </div>
        {/* Right: form */}
        <div className="md:w-1/2 flex items-center justify-center px-4 py-8 md:px-8 md:py-12">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md">
            <EventInfo event={event} className="mb-8" />
            <RegistrationForm {...formProps} />
            <PoweredBy />
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── STACKED ───
  if (template === "stacked") {
    return wrapDark(
      <div className="min-h-screen bg-background text-foreground" style={{ background: isDark ? undefined : `linear-gradient(135deg, ${brandColor}15, ${brandColor}05)` }}>
        <div className="w-full py-16 text-center flex flex-col items-center" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}CC)` }}>
          <CompactLogo flyerUrl={flyerUrl} eventName={event.name} className="mb-6 shadow-2xl border-white/20" />
          <h1 className="text-4xl font-display font-bold text-white">{event.name}</h1>
          {event.description && <p className="text-white/80 mt-2 max-w-lg mx-auto">{event.description}</p>}
        </div>
        <div className="max-w-lg mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border shadow-2xl">
              <CardContent className="p-8">
                <EventInfo event={event} className="mb-6" />
                <RegistrationForm {...formProps} />
                <PoweredBy />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── LANDING PAGE ───
  if (template === "landing") {
    return wrapDark(
      <div className="min-h-screen bg-background text-foreground">
        <div className="relative w-full flex items-start justify-center" style={{ minHeight: "40vh" }}>
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}CC)` }} />
          <div className="relative text-center text-white px-4 py-16 z-10 flex flex-col items-center">
            <CompactLogo flyerUrl={flyerUrl} eventName={event.name} className="mb-8 shadow-2xl border-white/20" />
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-bold mb-4 truncate max-w-3xl mx-auto">{event.name}</h1>
            {event.description && <p className="text-white/80 max-w-xl mx-auto text-lg leading-relaxed mt-3">{event.description}</p>}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-white/70">
              {event.event_date && (
                <span className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  {formatEventDateTime(event)}
                </span>
              )}
              <span className="flex items-center gap-2">
                {event.location_type === "physical" ? <MapPin className="w-5 h-5" /> : event.location_type === "hybrid" ? <Globe className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                {event.location_type === "physical" ? "In-Person" : event.location_type === "hybrid" ? "Hybrid" : "Virtual"}
              </span>
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-12 -mt-8 relative z-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border shadow-2xl">
              <CardContent className="p-8">
                <h2 className="text-xl font-display font-bold mb-6 text-center">Register Now</h2>
                <RegistrationForm {...formProps} />
                <PoweredBy />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── CARD GRID ───
  if (template === "cards") {
    return wrapDark(
      <div className="min-h-screen bg-background text-foreground" style={{ background: isDark ? undefined : `linear-gradient(135deg, ${brandColor}15, ${brandColor}05)` }}>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <div className="mb-6 flex justify-center">
              <CompactLogo flyerUrl={flyerUrl} eventName={event.name} />
            </div>
            <EventInfo event={event} />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardContent className="p-6">
                <h3 className="font-display font-semibold mb-3">Event Details</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{event.description || "Join us for this exciting event."}</p>
                {event.event_date && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="w-4 h-4" />
                    {formatEventDateTime(event)}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-border shadow-xl">
              <CardContent className="p-6">
                <h3 className="font-display font-semibold mb-4">Register</h3>
                <RegistrationForm {...formProps} />
              </CardContent>
            </Card>
          </div>
          <PoweredBy />
        </div>
      </div>
    );
  }

  // Fallback
  return wrapDark(
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-foreground" style={{ background: isDark ? undefined : `linear-gradient(135deg, ${brandColor}15, ${brandColor}05)` }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <Card className="border-border shadow-2xl">
          <CardContent className="p-8">
            <EventInfo event={event} className="text-center mb-8" />
            <RegistrationForm {...formProps} />
            <PoweredBy />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Register;
