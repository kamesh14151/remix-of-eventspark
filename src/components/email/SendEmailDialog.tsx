import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Loader2, Sparkles, CheckCircle2, Users, Calendar, MapPin, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { sendManualEmail, EmailAttendee } from "@/lib/emailService";

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id?: string;
    name: string;
    event_date?: string | null;
    event_end_date?: string | null;
    timezone?: string | null;
    location_type?: string | null;
    location_value?: string | null;
    background_image_url?: string | null;
    description?: string | null;
    ticket_price?: number | null;
    team_pricing?: string | null;
    profiles?: any;
  };
  recipients: EmailAttendee[];
  title?: string;
}

export default function SendEmailDialog({
  open,
  onOpenChange,
  event,
  recipients,
  title,
}: SendEmailDialogProps) {
  const [activeTab, setActiveTab] = useState<"announcement" | "registration">("announcement");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const isBroadcast = recipients.length > 1;
  const singleRecipient = recipients.length === 1 ? recipients[0] : null;

  // Preset templates
  const applyTemplate = (preset: "reminder" | "hackathon" | "venue" | "custom") => {
    switch (preset) {
      case "reminder":
        setSubject(`Reminder: ${event.name} is starting soon!`);
        setMessage(
          `Hi {name},\n\nThis is a friendly reminder that ${event.name} is coming up soon!\n\nPlease make sure to arrive on time and have your registration details ready.\n\nWe look forward to seeing you there!`
        );
        break;
      case "hackathon":
        setSubject(`Important: Hackathon Schedule, Discord & Guidelines - ${event.name}`);
        setMessage(
          `Hi {name},\n\nWelcome to ${event.name}! Here are crucial details to help you prepare:\n\n1. Join our Discord / Slack community server for problem statements & mentor help.\n2. Team check-in begins 30 minutes prior to kickoff.\n3. Make sure your GitHub repository and student ID / roll number details are ready.\n\nIf you have any questions or team changes, reply directly to this email.\n\nHappy hacking!`
        );
        break;
      case "venue":
        setSubject(`Venue & Check-in Instructions for ${event.name}`);
        setMessage(
          `Hi {name},\n\nHere are the arrival and check-in instructions for ${event.name}:\n\nVenue: ${event.location_value || "Check event page"}\nPlease carry a valid photo/student ID for check-in at the registration desk.\n\nSafe travels, and we can't wait to welcome you!`
        );
        break;
      case "custom":
        setSubject(`Important Update regarding ${event.name}`);
        setMessage(
          `Hi {name},\n\nWe would like to share an important update regarding ${event.name}:\n\n[Add your message details here]\n\nThank you for being a part of this event!`
        );
        break;
    }
  };

  const handleSend = async () => {
    if (activeTab === "announcement") {
      if (!subject.trim()) {
        toast.error("Please enter an email subject");
        return;
      }
      if (!message.trim()) {
        toast.error("Please enter a message for the email");
        return;
      }
    }

    if (recipients.length === 0) {
      toast.error("No recipients found to send to");
      return;
    }

    setIsSending(true);
    try {
      const result = await sendManualEmail({
        type: activeTab,
        recipients,
        subject: activeTab === "announcement" ? subject : undefined,
        message: activeTab === "announcement" ? message : undefined,
        event,
      });

      if (result.success) {
        toast.success(
          isBroadcast
            ? `Emails successfully sent to ${result.sentCount} attendees!`
            : `Email successfully sent to ${recipients[0].name} (${recipients[0].email})!`
        );
        onOpenChange(false);
        // Reset fields
        setSubject("");
        setMessage("");
      } else {
        toast.error("Failed to send email. Please check configuration.");
      }
    } catch (err: any) {
      console.error("Error triggering email:", err);
      toast.error(err.message || "Failed to trigger email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-xl">
                {title || (isBroadcast ? "Broadcast Email to Attendees" : `Send Email to ${singleRecipient?.name}`)}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Send manual updates, reminders, or resend registration confirmation tickets.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Recipients Bar */}
        <div className="bg-muted/50 border border-border/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {isBroadcast ? `${recipients.length} Attendees` : singleRecipient?.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {isBroadcast ? `(${recipients.map(r => r.email).slice(0, 2).join(", ")}${recipients.length > 2 ? `, +${recipients.length - 2} more` : ""})` : `<${singleRecipient?.email}>`}
            </span>
          </div>
          <Badge variant="outline" className="text-xs rounded-full bg-card">
            Event: {event.name}
          </Badge>
        </div>

        {/* Mode Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList className="grid grid-cols-2 bg-muted p-1 rounded-xl">
            <TabsTrigger value="announcement" className="rounded-lg text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Custom Announcement
            </TabsTrigger>
            <TabsTrigger value="registration" className="rounded-lg text-xs font-medium">
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Resend Confirmation & Ticket
            </TabsTrigger>
          </TabsList>

          <TabsContent value="announcement" className="space-y-4 pt-1">
            {/* Quick Templates */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Quick Templates</Label>
              <div className="flex flex-wrap gap-1.5">
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs rounded-full bg-card" onClick={() => applyTemplate("hackathon")}>
                  🚀 Hackathon Discord & Rules
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs rounded-full bg-card" onClick={() => applyTemplate("reminder")}>
                  🗓️ Event Reminder
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs rounded-full bg-card" onClick={() => applyTemplate("venue")}>
                  📍 Venue & Check-in
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs rounded-full bg-card" onClick={() => applyTemplate("custom")}>
                  📢 General Update
                </Button>
              </div>
            </div>

            {/* Subject Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email-subject" className="text-xs font-medium">Subject Line <span className="text-destructive">*</span></Label>
              <Input
                id="email-subject"
                placeholder={`e.g., Important Update for ${event.name}`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="text-sm rounded-xl"
              />
            </div>

            {/* Message Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-message" className="text-xs font-medium">Message Body <span className="text-destructive">*</span></Label>
                <span className="text-[11px] text-muted-foreground">Tip: Use {"{name}"} for personalized recipient name</span>
              </div>
              <Textarea
                id="email-message"
                placeholder="Write your email announcement here..."
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="text-sm rounded-xl font-normal leading-relaxed"
              />
            </div>

            {/* Preview Toggle */}
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-3.5 h-3.5 mr-1" /> {showPreview ? "Hide Preview" : "Preview Email"}
              </Button>

              {showPreview && (
                <div className="mt-2 p-4 rounded-xl border border-border bg-card shadow-inner space-y-3">
                  <div className="border-b border-border/60 pb-2">
                    <p className="text-xs text-muted-foreground">Subject: <span className="font-semibold text-foreground">{subject || "(No subject)"}</span></p>
                  </div>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {message.replace(/\{name\}/g, singleRecipient?.name || "Participant") || "(Message preview will appear here)"}
                  </div>
                  <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground flex items-center gap-4">
                    {event.event_date && <span>📅 {new Date(event.event_date).toLocaleDateString()}</span>}
                    {event.location_value && <span>📍 {event.location_value}</span>}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="registration" className="space-y-4 pt-1">
            <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-foreground">Resend Registration Confirmation</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This triggers the official registration confirmation email containing the event flyer, date, location/link, host branding, and PDF ticket/invoice receipt.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                <div>
                  <span className="text-muted-foreground">Event: </span>
                  <span className="font-medium">{event.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ticket Type: </span>
                  <span className="font-medium">{event.ticket_price ? `Paid (₹${event.ticket_price})` : "Free"}</span>
                </div>
                {event.event_date && (
                  <div>
                    <span className="text-muted-foreground">Date: </span>
                    <span className="font-medium">{new Date(event.event_date).toLocaleDateString()}</span>
                  </div>
                )}
                {event.location_value && (
                  <div className="truncate">
                    <span className="text-muted-foreground">Location: </span>
                    <span className="font-medium">{event.location_value}</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {isBroadcast ? `Sending to all ${recipients.length} attendees.` : `Sending to ${singleRecipient?.email}.`}
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="rounded-full flex-1 sm:flex-initial"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full flex-1 sm:flex-initial"
              onClick={handleSend}
              disabled={isSending || recipients.length === 0}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {activeTab === "registration" ? "Resend Confirmation" : "Send Announcement"}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
