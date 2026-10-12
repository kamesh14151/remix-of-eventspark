import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Trash2, UserPlus, UserMinus, Users, GraduationCap, Target, Save, Sparkles, MessageCircle, Mail } from "lucide-react";
import { useEvent, useUpdateEvent, useDeleteEvent } from "@/hooks/useEvents";
import { useFormFields, useAddFormField, useDeleteFormField, useBulkInsertFormFields } from "@/hooks/useFormFields";
import { useEventMembers, useInviteMember, useRemoveMember } from "@/hooks/useEventMembers";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TemplatePreview from "@/components/TemplatePreview";
import EventDetailHeader from "@/components/event-detail/EventDetailHeader";
import EventQuickInfo from "@/components/event-detail/EventQuickInfo";
import EventAttendeesTable from "@/components/event-detail/EventAttendeesTable";
import EventQRCode from "@/components/event-detail/EventQRCode";
import { studentHackathonFields } from "@/lib/studentFields";
import ProblemStatementsManager from "@/components/event-detail/ProblemStatementsManager";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: event, isLoading } = useEvent(id);
  const { data: formFields } = useFormFields(id);
  const { data: members, isLoading: membersLoading } = useEventMembers(id);
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const addField = useAddFormField();
  const deleteField = useDeleteFormField();
  const bulkInsertFields = useBulkInsertFormFields();
  const inviteMember = useInviteMember();
  const removeMember = useRemoveMember();
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [inviteEmail, setInviteEmail] = useState("");

  const [maxTeamSize, setMaxTeamSize] = useState<string>("1");
  const [minTeamSize, setMinTeamSize] = useState<string>("1");
  const [teamPricing, setTeamPricing] = useState<string>("per_member");
  const [whatsappUrl, setWhatsappUrl] = useState<string>("");
  const [emailFromName, setEmailFromName] = useState<string>("");
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  useEffect(() => {
    if (event) {
      setMaxTeamSize(event.max_team_size ? String(event.max_team_size) : "1");
      setMinTeamSize((event as any).min_team_size ? String((event as any).min_team_size) : "1");
      setTeamPricing(event.team_pricing || "per_member");
      setWhatsappUrl(event.whatsapp_group_url || "");
      setEmailFromName((event as any).email_from_name || "");
    }
  }, [event]);

  const isOwner = event?.user_id === user?.id;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!event) {
    return <div className="text-center py-20"><p className="text-muted-foreground">Event not found.</p></div>;
  }

  const handleStatusChange = async (status: "draft" | "live" | "past") => {
    await updateEvent.mutateAsync({ id: event.id, status });
    toast.success(`Event is now ${status}`);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    await deleteEvent.mutateAsync(event.id);
    toast.success("Event deleted");
    navigate("/dashboard/events");
  };

  const handleUpdate = async (fields: any) => {
    await updateEvent.mutateAsync({ id: event.id, ...fields });
  };

  const handleLoadStudentFields = async () => {
    const existingLabels = new Set(formFields?.map(f => f.label.toLowerCase()) || []);
    const toAdd = studentHackathonFields
      .filter(f => !existingLabels.has(f.label.toLowerCase()))
      .map((f, idx) => ({
        event_id: event.id,
        label: f.label,
        field_type: f.field_type,
        required: f.required,
        position: (formFields?.length || 0) + idx,
        placeholder: f.placeholder,
      }));
    if (toAdd.length === 0) {
      toast.info("All student hackathon fields are already present!");
      return;
    }
    await bulkInsertFields.mutateAsync(toAdd);
    toast.success(`Added ${toAdd.length} student hackathon registration fields!`);
  };

  const handleAddField = async () => {
    if (!newFieldLabel.trim()) return;
    await addField.mutateAsync({
      event_id: event.id,
      label: newFieldLabel,
      field_type: newFieldType,
      required: false,
      position: (formFields?.length ?? 0),
    });
    setNewFieldLabel("");
    toast.success("Field added");
  };

  const handleSaveTeamSettings = async () => {
    const maxVal = parseInt(maxTeamSize) || 1;
    const minVal = Math.min(parseInt(minTeamSize) || 1, maxVal);
    await handleUpdate({
      max_team_size: maxVal,
      min_team_size: minVal,
      team_pricing: teamPricing,
    });
    toast.success("Team size settings updated!");
  };

  const handleSaveWhatsapp = async () => {
    if (!event) return;
    setIsSavingWhatsapp(true);
    try {
      await handleUpdate({ whatsapp_group_url: whatsappUrl.trim() || null });
      toast.success("WhatsApp group joining link updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update WhatsApp group link");
    } finally {
      setIsSavingWhatsapp(false);
    }
  };

  const handleSaveEmailFrom = async () => {
    if (!event) return;
    setIsSavingEmail(true);
    try {
      await handleUpdate({ email_from_name: emailFromName.trim() || null });
      toast.success("Email sender name updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update email sender name");
    } finally {
      setIsSavingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <EventDetailHeader event={event} onStatusChange={handleStatusChange} onDelete={handleDelete} />
      <EventQuickInfo event={event} onUpdate={handleUpdate} />

      <Tabs defaultValue="branding">
        <TabsList className="bg-muted rounded-full p-1 w-full sm:w-auto">
          <TabsTrigger value="branding" className="flex-1 sm:flex-initial rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">Branding</TabsTrigger>
          <TabsTrigger value="form" className="flex-1 sm:flex-initial rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">Reg. form</TabsTrigger>
          <TabsTrigger value="hackathon" className="flex-1 sm:flex-initial rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-primary" /> Hackathon & Team
          </TabsTrigger>
          <TabsTrigger value="team" className="flex-1 sm:flex-initial rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">Co-hosts</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 sm:flex-initial rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="mt-5 space-y-5">
          <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4">
            <h3 className="font-display font-semibold">Brand customization</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary color</Label>
                <div className="flex gap-2">
                  <input type="color" defaultValue={event.primary_color || "#7C3AED"} className="w-10 h-10 rounded-xl border border-border cursor-pointer" onChange={e => handleUpdate({ primary_color: e.target.value })} />
                  <Input defaultValue={event.primary_color || "#7C3AED"} readOnly className="rounded-full" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <div className="flex items-center gap-2 h-10 px-4 rounded-full border border-border bg-muted/40 text-xs font-medium text-foreground">
                  <span>🔒 Split screen</span>
                  <Badge variant="outline" className="ml-auto text-[10px] bg-primary/10 text-primary border-primary/20">Standard (Locked)</Badge>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color mode</Label>
              <div className="flex gap-2">
                {(["light", "dark"] as const).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={(event as any).color_mode === mode || (!((event as any).color_mode) && mode === "light") ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => handleUpdate({ color_mode: mode })}
                  >
                    {mode === "light" ? "☀️ Light" : "🌙 Dark"}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-card rounded-xl p-5 sm:p-6">
              <Label className="mb-3 block">Live preview</Label>
              <div className="flex justify-center">
                <TemplatePreview
                  template={event.template || "split"}
                  eventName={event.name}
                  description={event.description || ""}
                  startDate={event.event_date ? new Date(event.event_date).toISOString().split("T")[0] : ""}
                  startTime={event.event_date ? new Date(event.event_date).toTimeString().slice(0, 5) : ""}
                  locationType={(event.location_type as "virtual" | "physical" | "hybrid") || "virtual"}
                  locationValue={event.location_value || ""}
                  locationAddress=""
                  flyerUrl={event.background_image_url}
                />
              </div>
            </div>
            <EventQRCode
              registrationUrl={`${window.location.origin}/register/${event.slug}`}
              eventName={event.name}
            />
          </div>
        </TabsContent>

        <TabsContent value="form" className="mt-5">
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-display font-semibold">Form fields</h3>
                  <p className="text-xs text-muted-foreground">Fields attendees fill out when registering.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs shrink-0"
                  onClick={handleLoadStudentFields}
                  disabled={bulkInsertFields.isPending}
                >
                  <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Load Student Hackathon Fields
                </Button>
              </div>
              {formFields?.map((field) => (
                <div key={field.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div>
                    <span className="text-sm font-medium">{field.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">({field.field_type})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs rounded-full">{field.required ? "Required" : "Optional"}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteField.mutate({ id: field.id, eventId: event.id })}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex flex-col sm:flex-row gap-2">
                <Input placeholder="Field label" value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} className="flex-1 rounded-full" />
                <Select value={newFieldType} onValueChange={setNewFieldType}>
                  <SelectTrigger className="w-full sm:w-28 rounded-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="tel">Phone</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleAddField} className="rounded-full">Add</Button>
              </div>
            </div>
            <div className="bg-muted/30 rounded-xl p-5 sm:p-6">
              <h3 className="font-display font-semibold mb-4">Live preview</h3>
              <div className="bg-card rounded-xl p-4 sm:p-6 space-y-4">
                <h4 className="text-lg font-semibold">{event.name}</h4>
                <p className="text-sm text-muted-foreground">{event.description || "No description"}</p>
                {formFields?.map((f) => (
                  <div key={f.id} className="space-y-1">
                    <Label className="text-xs">{f.label}{f.required && " *"}</Label>
                    <Input placeholder={f.placeholder || f.label} disabled className="bg-muted/50 rounded-full" />
                  </div>
                ))}
                <Button className="w-full rounded-full" disabled>Register now</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hackathon" className="mt-5 space-y-5">
          {/* Team Registration & Size Card */}
          <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4 border border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Attendee Team Size Configuration
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set whether attendees can register as a team and fix the exact or maximum team size.
                </p>
              </div>
              <Badge variant={parseInt(maxTeamSize) > 1 ? "default" : "secondary"} className="text-xs w-fit">
                {parseInt(maxTeamSize) > 1
                  ? parseInt(minTeamSize) === parseInt(maxTeamSize)
                    ? `Fixed: Exactly ${maxTeamSize} Members`
                    : `Team: ${minTeamSize} to ${maxTeamSize} Members`
                  : "Solo Only (1 Person)"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Maximum Team Size</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={maxTeamSize}
                  onChange={(e) => setMaxTeamSize(e.target.value)}
                  placeholder="e.g. 4 for a team of 4"
                  className="rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  Set to 1 for solo registration. Set to 2, 3, 4, etc. for team registration.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Minimum Required Team Size</Label>
                <Input
                  type="number"
                  min="1"
                  max={maxTeamSize}
                  value={minTeamSize}
                  onChange={(e) => setMinTeamSize(e.target.value)}
                  placeholder="e.g. 2 or 4"
                  className="rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  If set equal to Max, teams must register with exactly this fixed size.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Team Pricing Model</Label>
                <Select value={teamPricing} onValueChange={setTeamPricing}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_member">Per Member (Ticket Price × Members)</SelectItem>
                    <SelectItem value="flat_fee">Flat Fee (One Ticket for Whole Team)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Used if your event has a paid ticket price.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                size="sm"
                onClick={handleSaveTeamSettings}
                className="rounded-full text-xs font-medium"
                disabled={updateEvent.isPending}
              >
                {updateEvent.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                Save Team Size Settings
              </Button>
            </div>
          </div>

          {/* Problem Statements Manager */}
          <ProblemStatementsManager event={event} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent value="team" className="mt-5">
          <div className="bg-card rounded-xl p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="font-display font-semibold">Team members</h3>
              <p className="text-sm text-muted-foreground mt-1">Invite other accounts to co-manage this event and view its attendees.</p>
            </div>

            {/* Owner badge */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                {user?.email?.[0]?.toUpperCase() ?? "O"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Owner</p>
              </div>
              <Badge variant="outline" className="rounded-full text-xs shrink-0">Owner</Badge>
            </div>

            {/* Current members */}
            {membersLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : members && members.length > 0 ? (
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-foreground font-semibold text-sm shrink-0">
                      {(m.email?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.email}</p>
                      <p className="text-xs text-muted-foreground">Member</p>
                    </div>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                        disabled={removeMember.isPending}
                        onClick={async () => {
                          try {
                            await removeMember.mutateAsync({ eventId: event.id, userId: m.user_id });
                            toast.success("Member removed");
                          } catch (err: any) {
                            toast.error(err.message || "Failed to remove member");
                          }
                        }}
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No team members yet.
              </div>
            )}

            {/* Invite form — only owner can invite */}
            {isOwner && (
              <div className="border-t border-border pt-4 space-y-3">
                <Label className="text-sm font-medium">Invite by email</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="flex-1 rounded-full"
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (!inviteEmail.trim()) return;
                        try {
                          await inviteMember.mutateAsync({ eventId: event.id, email: inviteEmail.trim() });
                          toast.success(`${inviteEmail} added as team member`);
                          setInviteEmail("");
                        } catch (err: any) {
                          toast.error(err.message || "Invite failed");
                        }
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    className="rounded-full shrink-0"
                    disabled={inviteMember.isPending || !inviteEmail.trim()}
                    onClick={async () => {
                      if (!inviteEmail.trim()) return;
                      try {
                        await inviteMember.mutateAsync({ eventId: event.id, email: inviteEmail.trim() });
                        toast.success(`${inviteEmail} added as team member`);
                        setInviteEmail("");
                      } catch (err: any) {
                        toast.error(err.message || "Invite failed");
                      }
                    }}
                  >
                    {inviteMember.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-1" /> Invite</>}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">The person must already have an account. They'll instantly see this event on their dashboard.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-5 space-y-5">
          {/* WhatsApp Group Auto-Join Link */}
          <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-base">WhatsApp Group Joining Link</h3>
                <p className="text-xs text-muted-foreground">
                  Attendees will be prompted to auto-join this WhatsApp group immediately after successfully completing registration.
                </p>
              </div>
            </div>

            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="https://chat.whatsapp.com/..."
                  value={whatsappUrl}
                  onChange={(e) => setWhatsappUrl(e.target.value)}
                  className="rounded-full flex-1"
                />
                <Button
                  onClick={handleSaveWhatsapp}
                  disabled={isSavingWhatsapp}
                  className="rounded-full shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSavingWhatsapp ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Save WhatsApp Link</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Example: <code>https://chat.whatsapp.com/L1234567890abcdef</code>
              </p>
            </div>
          </div>

          {/* Email Sender Name */}
          <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-base">Email Sender Name (From:)</h3>
                <p className="text-xs text-muted-foreground">
                  Display name shown in attendees' inbox for registration tickets and announcements.
                </p>
              </div>
            </div>

            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="e.g. Sona College Hackathon Team"
                  value={emailFromName}
                  onChange={(e) => setEmailFromName(e.target.value)}
                  className="rounded-full flex-1"
                />
                <Button
                  onClick={handleSaveEmailFrom}
                  disabled={isSavingEmail}
                  className="rounded-full shrink-0"
                >
                  {isSavingEmail ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Save Sender Name</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Inbox preview: <strong>{emailFromName.trim() || event.name}</strong> &lt;eventspark@ajstudioz.co.in&gt;
              </p>
            </div>
          </div>

          {/* Registration Limits & Deadlines */}
          <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4 border border-border">
            <h3 className="font-display font-semibold">Registration limits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Registration limit</Label>
                <Input type="number" placeholder="Unlimited" defaultValue={event.registration_limit ?? ""} onBlur={e => handleUpdate({ registration_limit: e.target.value ? parseInt(e.target.value) : null })} className="rounded-full" />
              </div>
              <div className="space-y-2">
                <Label>Registration deadline</Label>
                <Input type="date" defaultValue={event.registration_deadline?.split("T")[0] || ""} onBlur={e => handleUpdate({ registration_deadline: e.target.value || null })} className="rounded-full" />
              </div>
            </div>
            {isOwner && (
              <Button variant="destructive" size="sm" className="mt-4 rounded-full" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete event
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <EventAttendeesTable eventId={event.id} event={event} />
    </div>
  );
};

export default EventDetail;
