import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useParams } from "react-router-dom";
import { CalendarDays, MapPin, Video, Globe, Loader2, CheckCircle2, Zap, Plus, Trash2, Users, GraduationCap, School, Copy, Target, Sparkles, AlertCircle, Info, ExternalLink, Check } from "lucide-react";
import { useEventBySlug, Event, ProblemStatement } from "@/hooks/useEvents";
import { useFormFields } from "@/hooks/useFormFields";
import { useCreateRegistration } from "@/hooks/useRegistrations";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Tables } from "@/integrations/supabase/types";
import { studentHackathonFields, yearOfStudyOptions, popularDepartments, popularColleges } from "@/lib/studentFields";
import { CollegeSelect, DepartmentSelect } from "@/components/registration/CollegeAndDeptSelectors";

type FormField = Tables<"form_fields">;

export type TeamMember = {
  name: string;
  email: string;
  college?: string;
  department?: string;
};

// ─── Helper: format event date/time with timezone ───
function formatEventDateTime(event: Event) {
  try {
    const tz = event.timezone || "America/New_York";
    const parts: string[] = [];

    if (event.event_date) {
      const start = new Date(event.event_date);
      if (isNaN(start.getTime())) return "";

      const dateStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: tz });
      const timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });

      let line = `${dateStr} · ${timeStr}`;

      if (event.event_end_date) {
        const end = new Date(event.event_end_date);
        if (!isNaN(end.getTime())) {
          const endDateStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: tz });
          const endTimeStr = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });

          if (endDateStr === dateStr) {
            line += ` – ${endTimeStr}`;
          } else {
            line += ` – ${endDateStr} · ${endTimeStr}`;
          }
        }
      }

      try {
        const tzAbbr = start.toLocaleTimeString("en-US", { timeZone: tz, timeZoneName: "short" }).split(" ").pop() || tz;
        line += ` ${tzAbbr}`;
      } catch {
        line += ` ${tz}`;
      }

      parts.push(line);
    }

    return parts.join("");
  } catch (err) {
    console.warn("formatEventDateTime error:", err);
    return event.event_date ? new Date(event.event_date).toLocaleDateString() : "";
  }
}

// ─── Extracted stable components ───

const DEFAULT_WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/HHkiFng9E0KHsTBuT3qPcK?s=sw&p=a&mlu=4&ilr=4&iam=2";

const WhatsAppIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.529 1.777.813 2.796.813 3.179 0 5.767-2.587 5.767-5.766.001-3.182-2.585-5.8-5.767-5.8zm3.364 8.167c-.14.391-.715.717-1.02.756-.298.038-.592.052-.909-.036-.317-.089-.908-.293-1.76-.669-1.704-.753-2.848-2.506-2.933-2.622-.085-.116-.685-.913-.685-1.741 0-.829.434-1.238.588-1.406.154-.168.337-.21.45-.21.113 0 .225.002.321.006.103.005.24-.038.374.285.138.331.47 1.146.511 1.231.041.084.068.183.013.292-.055.109-.084.178-.167.275-.084.098-.176.219-.251.294-.084.084-.171.176-.074.343.097.167.434.716.931 1.158.64.57 1.179.746 1.346.83.168.084.267.07.364-.042.098-.112.42-.49.532-.658.112-.168.224-.14.378-.083.154.056.978.461 1.146.545.168.084.28.126.322.196.042.07.042.406-.098.797zm-3.364-10.339c6.627 0 12 5.373 12 12 0 6.627-5.373 12-12 12-2.079 0-4.041-.53-5.766-1.465l-6.234 1.635 1.666-6.087c-1.055-1.802-1.666-3.896-1.666-6.083 0-6.627 5.373-12 12-12z" />
  </svg>
);

const SuccessCard = ({
  brandColor,
  event,
  teamMembers,
  selectedProblemStatement,
}: {
  brandColor: string;
  event: Event;
  teamMembers: TeamMember[];
  selectedProblemStatement?: ProblemStatement | null;
}) => {
  const whatsappUrl = (event as any).whatsapp_group_url || (event as any).whatsapp_url || DEFAULT_WHATSAPP_GROUP_URL;
  const [countdown, setCountdown] = useState<number>(3);
  const [copied, setCopied] = useState<boolean>(false);
  const [hasOpened, setHasOpened] = useState<boolean>(false);

  useEffect(() => {
    let fired = false;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!fired) {
            fired = true;
            try {
              window.open(whatsappUrl, "_blank", "noopener,noreferrer");
              setHasOpened(true);
            } catch {
              setHasOpened(false);
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [whatsappUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(whatsappUrl);
    setCopied(true);
    toast.success("WhatsApp group link copied!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenLink = () => {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setHasOpened(true);
  };

  return (
    <div key="success" className="w-full max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-300">
      <Card className="border-border shadow-2xl">
        <CardContent className="p-8 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: brandColor }} />
          </motion.div>
          <h2 className="text-2xl font-display font-bold mb-2">You're Registered!</h2>
          <p className="text-muted-foreground">Thank you for registering for <strong>{event.name}</strong>. You'll receive a confirmation email shortly.</p>

          {/* ── WhatsApp Group Auto-Join Callout ── */}
          <div className="mt-6 p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/30 dark:border-emerald-500/40 text-left shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#25D366]/30">
                <WhatsAppIcon className="w-6 h-6 fill-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-sm sm:text-base text-emerald-900 dark:text-emerald-300">
                    Join Official WhatsApp Group
                  </span>
                  {countdown > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Auto-joining in {countdown}s
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      ✓ Join Link Ready
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-300/80 mt-1">
                  Follow this link to join my WhatsApp group for urgent event announcements, rules & coordination:
                </p>
              </div>
            </div>

            <div className="mt-3.5 flex flex-col sm:flex-row gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleOpenLink}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:shadow-[#25D366]/25 active:scale-[0.98]"
              >
                <WhatsAppIcon className="w-4 h-4 fill-white" />
                <span>Follow this link to join my WhatsApp group</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </a>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/10 h-10 px-3.5 rounded-xl"
              >
                {copied ? <Check className="w-4 h-4 mr-1 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
            </div>

            <div className="mt-2.5 pt-2 border-t border-emerald-500/15 flex items-center justify-between text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
              <span className="truncate mr-2 font-mono">{whatsappUrl}</span>
              <span className="shrink-0 text-muted-foreground font-medium">Auto-join enabled</span>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-5 text-left space-y-4">
            {selectedProblemStatement && (
              <div className="flex items-start gap-3 text-sm p-3.5 rounded-xl bg-primary/10 border border-primary/20">
                <Target className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-primary text-xs uppercase tracking-wider">Problem Statement Track</p>
                  <p className="font-medium text-foreground mt-0.5">
                    {selectedProblemStatement.code ? `${selectedProblemStatement.code} · ` : ""}{selectedProblemStatement.title}
                  </p>
                  {selectedProblemStatement.category && (
                    <p className="text-xs text-muted-foreground mt-0.5">Domain: {selectedProblemStatement.category}</p>
                  )}
                </div>
              </div>
            )}
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
                <div className="min-w-0">
                  <p className="font-medium">Team members ({teamMembers.length})</p>
                  <ul className="mt-1 space-y-1 text-muted-foreground">
                    {teamMembers.map((member, index) => (
                      <li key={`${member.email}-${index}`} className="break-words">
                        {member.name} ({member.email}){member.college ? ` · ${member.college}` : ""}{member.department ? ` (${member.department})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const CompactLogo = ({ flyerUrl, eventName, className = "" }: { flyerUrl: string | null; eventName: string; className?: string }) => (
  flyerUrl ? (
    <div className={`w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] overflow-hidden border border-border/50 shadow-xl shrink-0 bg-background ${className}`}>
      <img src={flyerUrl} alt={eventName} className="w-full h-full object-cover" />
    </div>
  ) : null
);

const ProblemStatementsShowcase = ({
  statements,
  selectedId,
  onSelect,
}: {
  statements: ProblemStatement[];
  selectedId?: string;
  onSelect?: (ps: ProblemStatement) => void;
}) => {
  const published = statements.filter((s) => s.published !== false);
  if (published.length === 0) return null;

  return (
    <div className="mt-6 pt-5 border-t border-border/60 space-y-3 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary shrink-0" />
          <h3 className="font-display font-semibold text-sm sm:text-base text-foreground">
            Hackathon Problem Statements
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {published.length} Tracks
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          Tap card to select for registration
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {published.map((ps, idx) => {
          const isSelected = selectedId === ps.id;
          return (
            <div
              key={ps.id || idx}
              onClick={() => onSelect?.(ps)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative group ${
                isSelected
                  ? "bg-primary/10 border-primary ring-2 ring-primary/30 shadow-sm"
                  : "bg-muted/40 hover:bg-muted/70 border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold bg-primary text-primary-foreground">
                    {ps.code || `PS0${idx + 1}`}
                  </span>
                  {ps.category && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      {ps.category}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <span className="text-[10px] font-medium text-primary flex items-center gap-1 bg-primary/15 px-1.5 py-0.5 rounded">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Selected
                  </span>
                )}
              </div>

              <h4 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors leading-snug">
                {ps.title}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                {ps.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const EventInfo = ({
  event,
  className = "",
  selectedProblemStatementId,
  onSelectProblemStatement,
}: {
  event: Event;
  className?: string;
  selectedProblemStatementId?: string;
  onSelectProblemStatement?: (ps: ProblemStatement) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const locationIcon = event.location_type === "physical" ? <MapPin className="w-4 h-4" /> : event.location_type === "hybrid" ? <Globe className="w-4 h-4" /> : <Video className="w-4 h-4" />;
  const locationLabel = event.location_type === "physical" ? "In-Person" : event.location_type === "hybrid" ? "Hybrid" : "Virtual";
  const dateTimeStr = formatEventDateTime(event);

  const problemStatements: ProblemStatement[] = Array.isArray((event as any)?.problem_statements)
    ? (event as any).problem_statements
    : [];

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

      {/* Problem statements showcase tiles under hackathon name */}
      {problemStatements.length > 0 && (
        <ProblemStatementsShowcase
          statements={problemStatements}
          selectedId={selectedProblemStatementId}
          onSelect={onSelectProblemStatement}
        />
      )}
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
  minTeamSize = 1,
  isHackathon = false,
  problemStatements = [],
  selectedProblemStatement,
  onSelectProblemStatement,
  emailConflictError,
  onClearEmailConflict,
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
  minTeamSize?: number;
  isHackathon?: boolean;
  problemStatements?: ProblemStatement[];
  selectedProblemStatement?: ProblemStatement | null;
  onSelectProblemStatement?: (ps: ProblemStatement) => void;
  emailConflictError?: { email: string; eventName: string; message: string } | null;
  onClearEmailConflict?: () => void;
}) => {
  const leadCollege = Object.entries(formData).find(([k]) => /college|university|clg|institution/i.test(k))?.[1] || "";
  const leadDept = Object.entries(formData).find(([k]) => /department|dept|branch|stream/i.test(k))?.[1] || "";
  const showCollegeDeptForTeam = isHackathon || formFields?.some(f => /college|university|clg|institution|department|dept|branch/i.test(f.label));

  const addTeamMember = () => {
    if (onTeamMembersChange && teamMembers && maxTeamSize && teamMembers.length < maxTeamSize - 1) {
      onTeamMembersChange([
        ...teamMembers,
        { name: "", email: "", college: leadCollege, department: leadDept },
      ]);
      if (leadCollege || leadDept) {
        toast.info("Auto-filled teammate with Team Lead's college & department");
      }
    }
  };

  const copyLeadDetails = (index: number) => {
    if (onTeamMembersChange && teamMembers) {
      const updated = [...teamMembers];
      updated[index] = {
        ...updated[index],
        college: leadCollege || updated[index].college,
        department: leadDept || updated[index].department,
      };
      onTeamMembersChange(updated);
      toast.success(`Applied Team Lead's college & department to Member ${index + 2}`);
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
    <form onSubmit={onSubmit} className={`space-y-3.5 ${className}`}>
      {/* Student Hackathon Banner */}
      {isHackathon && (
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary">
          <GraduationCap className="w-4 h-4 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold block text-xs">Student Hackathon Registration</span>
            <span className="text-muted-foreground text-[11px] leading-tight block">
              Enter your college, department, and academic details below.
            </span>
          </div>
        </div>
      )}

      {/* Problem Statement Track Selector */}
      {problemStatements && problemStatements.length > 0 && (
        <div className="space-y-1.5 p-2.5 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-semibold flex items-center gap-1.5 text-foreground">
              <Target className="w-3.5 h-3.5 text-primary" /> Choose Problem Statement Track <span className="text-destructive">*</span>
            </Label>
            <span className="text-[10px] text-muted-foreground font-mono">{problemStatements.length} Tracks</span>
          </div>
          <select
            value={selectedProblemStatement?.id || ""}
            onChange={(e) => {
              const found = problemStatements.find((p) => p.id === e.target.value);
              if (found && onSelectProblemStatement) {
                onSelectProblemStatement(found);
              }
            }}
            className="h-9 text-xs rounded-lg w-full border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
            required
          >
            <option value="" disabled>-- Select Your Problem Statement Track --</option>
            {problemStatements.map((ps, i) => (
              <option key={ps.id || i} value={ps.id}>
                {ps.code || `PS0${i + 1}`}: {ps.title} {ps.category ? `(${ps.category})` : ""}
              </option>
            ))}
          </select>

          {selectedProblemStatement && (
            <div className="p-2 rounded-lg bg-background/80 border border-primary/20 text-xs space-y-0.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] px-1 py-0.5 rounded bg-primary text-primary-foreground font-semibold">
                  {selectedProblemStatement.code || "PS"}
                </span>
                <span className="font-semibold text-foreground text-xs truncate">
                  {selectedProblemStatement.title}
                </span>
              </div>
              {selectedProblemStatement.description && (
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {selectedProblemStatement.description}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Responsive 2-Column Inputs Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {formFields?.map((field) => {
          const isYearField = /year of study|academic year/i.test(field.label);
          const isDeptField = /department|branch|stream/i.test(field.label);
          const isCollegeField = /college|university|clg|institution/i.test(field.label);
          const isRollNoField = /roll number|student id|roll no|reg no/i.test(field.label);
          const isGithubField = /github|portfolio/i.test(field.label);
          const isFullWidth = isCollegeField || field.field_type === "textarea" || (field.label && field.label.length > 30);

          return (
            <div key={field.id} className={`space-y-1 ${isFullWidth ? "sm:col-span-2" : "sm:col-span-1"}`}>
              <Label className="text-[11px] font-medium flex items-center gap-1 text-foreground/90">
                {isCollegeField && <School className="w-3 h-3 text-primary shrink-0" />}
                {isYearField && <GraduationCap className="w-3 h-3 text-primary shrink-0" />}
                <span>{field.label}</span>
                {field.required && <span className="text-destructive">*</span>}
              </Label>

              {/* Quick-select pills for Year of Study */}
              {isYearField && (
                <div className="flex flex-wrap gap-1 pb-0.5">
                  {yearOfStudyOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onFieldChange(field.label, opt)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                        formData[field.label] === opt
                          ? "bg-primary text-primary-foreground border-primary font-medium shadow-xs"
                          : "bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {isCollegeField ? (
                <CollegeSelect
                  value={formData[field.label] || ""}
                  onChange={(val) => onFieldChange(field.label, val)}
                  required={field.required}
                  placeholder={field.placeholder || "Select College / University"}
                  size="sm"
                />
              ) : isDeptField ? (
                <DepartmentSelect
                  value={formData[field.label] || ""}
                  onChange={(val) => onFieldChange(field.label, val)}
                  required={field.required}
                  placeholder={field.placeholder || "Select Department / Branch"}
                  size="sm"
                />
              ) : (
                <div className="space-y-0.5">
                  <Input
                    type={field.field_type === "email" ? "email" : field.field_type === "tel" ? "tel" : "text"}
                    placeholder={field.placeholder || field.label}
                    required={field.required}
                    value={formData[field.label] || ""}
                    onChange={(e) => onFieldChange(field.label, e.target.value)}
                    className={`h-9 text-xs rounded-lg ${
                      emailConflictError && field.field_type === "email"
                        ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5"
                        : ""
                    }`}
                  />
                  {emailConflictError && field.field_type === "email" && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium pt-0.5">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Already registered for this event. Please use a different email address.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {maxTeamSize && maxTeamSize > 1 && teamMembers && onTeamMembersChange && (
        <div className="pt-4 mt-4 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Team Members ({teamMembers.length + 1} of {maxTeamSize})
            </h3>
            <span className="text-xs text-muted-foreground font-medium">
              {minTeamSize && minTeamSize === maxTeamSize
                ? `Fixed: Exactly ${maxTeamSize} members required`
                : minTeamSize && minTeamSize > 1
                ? `Min ${minTeamSize}, Max ${maxTeamSize} members`
                : `Up to ${maxTeamSize} members`}
            </span>
          </div>

          {teamMembers.length > 0 ? (
            <div className="space-y-4 mb-4">
              {teamMembers.map((member, idx) => (
                <div key={idx} className="p-4 bg-muted/40 rounded-xl relative space-y-3 border border-border">
                  <div className="flex items-center justify-between pb-1 border-b border-border/50">
                    <span className="text-xs font-semibold text-primary">Member {idx + 2}</span>
                    <div className="flex items-center gap-2">
                      {showCollegeDeptForTeam && (leadCollege || leadDept) && (
                        <button
                          type="button"
                          onClick={() => copyLeadDetails(idx)}
                          className="text-[11px] font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                          title="Auto-fill with Team Lead's College & Department"
                        >
                          <Copy className="w-3 h-3" /> Same as Team Lead
                        </button>
                      )}
                      <button type="button" onClick={() => removeTeamMember(idx)} className="text-muted-foreground hover:text-destructive text-xs flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Full Name *</Label>
                      <Input required value={member.name} onChange={e => updateTeamMember(idx, "name", e.target.value)} placeholder="Member Name" className="h-9 text-xs rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Email Address *</Label>
                      <Input required type="email" value={member.email} onChange={e => updateTeamMember(idx, "email", e.target.value)} placeholder="member@college.edu" className="h-9 text-xs rounded-lg" />
                    </div>
                    {showCollegeDeptForTeam && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <School className="w-3 h-3 text-primary" /> College / University
                          </Label>
                          <CollegeSelect
                            value={member.college || ""}
                            onChange={(val) => updateTeamMember(idx, "college", val)}
                            size="sm"
                            placeholder="Select College"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-primary" /> Department / Branch
                          </Label>
                          <DepartmentSelect
                            value={member.department || ""}
                            onChange={(val) => updateTeamMember(idx, "department", val)}
                            size="sm"
                            placeholder="Select Department"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mb-4">Registering with team members? Add teammates below.</p>
          )}

          {teamMembers.length < maxTeamSize - 1 && (
            <Button type="button" variant="outline" onClick={addTeamMember} className="w-full text-xs rounded-xl border-dashed">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Team Member
            </Button>
          )}
        </div>
      )}

      {emailConflictError && (
        <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-foreground space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="space-y-1.5 text-xs flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-sm">Email Already Registered for This Event</span>
                {onClearEmailConflict && (
                  <button
                    type="button"
                    onClick={onClearEmailConflict}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-medium"
                  >
                    Dismiss
                  </button>
                )}
              </div>
              <p className="text-muted-foreground leading-relaxed">
                The email <strong className="text-foreground">{emailConflictError.email}</strong> is already registered for <strong>{emailConflictError.eventName}</strong>.
              </p>
              <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2 leading-relaxed">
                <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span>
                  <strong>Used this email for another event?</strong> Crack allows using the same email across different events without restriction. However, each event keeps its registrations independent. To register another team member or participant for <em>{emailConflictError.eventName}</em>, please provide their unique email address.
                </span>
              </div>
              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.querySelector<HTMLInputElement>('input[type="email"]');
                    if (el) {
                      el.focus();
                      el.select();
                    }
                    onClearEmailConflict?.();
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors shadow-sm"
                >
                  Change Email Address
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 pt-2">
        <Checkbox id="gdpr" checked={consent} onCheckedChange={(c) => onConsentChange(!!c)} />
        <Label htmlFor="gdpr" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
          I agree to receive communications about this event and consent to the processing of my academic details in accordance with the Privacy Policy.
        </Label>
      </div>
      <Button
        type="submit"
        className="w-full h-11 text-base border-0 text-white rounded-xl shadow-md font-semibold transition-all hover:opacity-95"
        style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}CC)` }}
        disabled={isPending}
      >
        {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering…</> : "Complete Registration"}
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
  <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px] text-muted-foreground flex-wrap select-none">
    <span>Powered by</span>
    <img
      src="/Crack.png"
      alt="Crack"
      className="h-3.5 w-auto object-contain inline-block shrink-0"
      style={{ height: "14px", width: "auto", maxHeight: "14px" }}
    />
    <span className="text-[9px] font-bold tracking-wider text-muted-foreground/60 uppercase">BY</span>
    <img
      src="/aj-logo.png"
      alt="AJ STUDIOZ"
      className="h-3.5 w-3.5 rounded-full object-contain inline-block shrink-0"
      style={{ height: "14px", width: "14px", maxWidth: "14px", maxHeight: "14px" }}
    />
  </div>
);

// ─── Main component ───

const Register = () => {
  const { slug } = useParams();
  const { data: event, isLoading: eventLoading, isError: eventError } = useEventBySlug(slug);
  const { data: formFields, isLoading: fieldsLoading } = useFormFields(event?.id);
  const createReg = useCreateRegistration();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [emailConflictError, setEmailConflictError] = useState<{
    email: string;
    eventName: string;
    message: string;
  } | null>(null);

  const [selectedProblemStatement, setSelectedProblemStatement] = useState<ProblemStatement | null>(null);

  const problemStatements: ProblemStatement[] = useMemo(() => {
    return Array.isArray((event as any)?.problem_statements)
      ? (event as any).problem_statements
      : [];
  }, [event]);

  const publishedProblemStatements = useMemo(() => {
    return problemStatements.filter(s => s.published !== false);
  }, [problemStatements]);

  useEffect(() => {
    if (publishedProblemStatements.length > 0 && !selectedProblemStatement) {
      setSelectedProblemStatement(publishedProblemStatements[0]);
    }
  }, [publishedProblemStatements, selectedProblemStatement]);

  const handleFieldChange = useCallback((label: string, value: string) => {
    setFormData(prev => ({ ...prev, [label]: value }));
    setEmailConflictError(null);
  }, []);

  const [loadTimedOut, setLoadTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadTimedOut(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const isHackathon = event?.event_type === "hackathon";

  const effectiveFormFields = useMemo(() => {
    if (!event) return formFields;
    if (!isHackathon) return formFields;

    if (!formFields || formFields.length <= 2) {
      return studentHackathonFields.map((f, i) => ({
        id: `student-field-${i}`,
        event_id: event.id,
        label: f.label,
        field_type: f.field_type,
        required: f.required,
        position: i,
        placeholder: f.placeholder || null,
      })) as FormField[];
    }

    const hasCollege = formFields.some(f => /college|university|clg|institution/i.test(f.label));
    const hasDept = formFields.some(f => /department|dept|branch/i.test(f.label));
    const hasYear = formFields.some(f => /year of study|academic year/i.test(f.label));

    if (!hasCollege || !hasDept || !hasYear) {
      const extra: FormField[] = [];
      if (!hasCollege) {
        extra.push({
          id: "student-college-injected",
          event_id: event.id,
          label: "College / University",
          field_type: "text",
          required: true,
          position: formFields.length,
          placeholder: "e.g. Stanford University / IIT Madras",
        } as FormField);
      }
      if (!hasDept) {
        extra.push({
          id: "student-dept-injected",
          event_id: event.id,
          label: "Department / Branch",
          field_type: "text",
          required: true,
          position: formFields.length + 1,
          placeholder: "e.g. Computer Science, AI & DS, ECE",
        } as FormField);
      }
      if (!hasYear) {
        extra.push({
          id: "student-year-injected",
          event_id: event.id,
          label: "Year of Study",
          field_type: "text",
          required: true,
          position: formFields.length + 2,
          placeholder: "e.g. 1st Year, 2nd Year, 3rd Year, 4th Year, Post Graduate",
        } as FormField);
      }
      return [...formFields, ...extra];
    }

    return formFields;
  }, [event, formFields, isHackathon]);

  // Show spinner while the EVENT is loading, but never hang indefinitely
  if (eventLoading && !loadTimedOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading event...</p>
      </div>
    );
  }

  // Event not found, errored, or timed out
  if (!event || eventError || (eventLoading && loadTimedOut)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-display font-bold mb-2">Event Not Found</h1>
            <p className="text-muted-foreground mb-6">
              This event may have ended, is not yet published, or the link is invalid.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                Reload Page
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <a href="/">Go to Home</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completeRegistration = async (finalData: any) => {
    try {
      const payload = {
        ...finalData,
        ...(selectedProblemStatement ? {
          "Problem Statement": `${selectedProblemStatement.code ? selectedProblemStatement.code + " - " : ""}${selectedProblemStatement.title}`,
          problem_statement_id: selectedProblemStatement.id,
          problem_statement_code: selectedProblemStatement.code,
          problem_statement_title: selectedProblemStatement.title,
          problem_statement_category: selectedProblemStatement.category,
        } : {}),
      };

      const registrationId = await createReg.mutateAsync({ event_id: event.id, data: payload });
      
      // Fire and forget email notification
      const emailField = effectiveFormFields?.find(f => f.field_type === "email")?.label || "Email";
      const lowerLabel = (field: FormField) => field.label.toLowerCase().trim();
      const fullNameField = effectiveFormFields?.find(field => /^(full name|attendee name|name)$/.test(lowerLabel(field)));
      const firstNameField = effectiveFormFields?.find(field => /first name|^first$/.test(lowerLabel(field)));
      const lastNameField = effectiveFormFields?.find(field => /last name|surname|^last$/.test(lowerLabel(field)));
      const email = (formData[emailField] || formData["email"] || formData["Email"] || Object.values(formData).find((value) => typeof value === "string" && value.includes("@")) || "").toString().trim();
      const firstAndLastName = [firstNameField && formData[firstNameField.label], lastNameField && formData[lastNameField.label]].filter(Boolean).join(" ").trim();
      const name = (fullNameField && formData[fullNameField.label] || firstAndLastName || formData["name"] || formData["Name"] || Object.values(formData).find((value) => typeof value === "string" && value.trim().length > 2 && !value.includes("@")) || "Attendee").toString().trim();
      
      if (email) {
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
            hostName: (event as any).profiles?.company || (event as any).profiles?.full_name || event.name || "Crack",
            emailFromName: (event as any).email_from_name || (event as any).profiles?.email_from_name,
            hostLogoUrl: event.logo_url || (event as any).profiles?.avatar_url || event.background_image_url,
            amount: finalData.razorpay_payment_id ? Number(finalData.razorpay_amount || 0) : undefined,
            paymentId: finalData.razorpay_payment_id,
            registrationId,
            ticketPrice: event.ticket_price || 0,
            teamPricing: event.team_pricing || "",
            teamMembers: teamMembers.length > 0 ? teamMembers : undefined,
            flyerUrl: event.background_image_url,
            whatsappGroupUrl: (event as any).whatsapp_group_url || (event as any).whatsapp_url || DEFAULT_WHATSAPP_GROUP_URL,
          })
        }).catch(e => console.error("Failed to send registration email:", e));
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

    if (publishedProblemStatements.length > 0 && !selectedProblemStatement) {
      toast.error("Please select a problem statement track for your registration.");
      return;
    }

    const minTeamSize = (event as any)?.min_team_size || 1;
    const maxTeamSize = event?.max_team_size || 1;

    if (maxTeamSize > 1 && minTeamSize > 1 && teamMembers.length + 1 < minTeamSize) {
      toast.error(`This hackathon requires a team of at least ${minTeamSize} members. Please add ${minTeamSize - 1 - teamMembers.length} more teammate(s).`);
      return;
    }

    for (let i = 0; i < teamMembers.length; i++) {
      if (!teamMembers[i].name.trim() || !teamMembers[i].email.trim()) {
        toast.error(`Please provide name and email for Member ${i + 2}`);
        return;
      }
    }

    const missing = effectiveFormFields?.filter(f => f.required && !formData[f.label]?.trim());
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
                  razorpay_amount: orderData.amount,
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
    formFields: effectiveFormFields,
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
    minTeamSize: (event as any).min_team_size || 1,
    isHackathon,
    problemStatements: publishedProblemStatements,
    selectedProblemStatement,
    onSelectProblemStatement: setSelectedProblemStatement,
  };

  const wrapDark = (content: React.ReactNode) => (
    <div className={isDark ? "dark" : ""}>
      {content}
    </div>
  );

  if (submitted) {
    return wrapDark(
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-foreground" style={{ background: isDark ? undefined : `linear-gradient(135deg, ${brandColor}15, ${brandColor}05)` }}>
        <SuccessCard brandColor={brandColor} event={event} teamMembers={teamMembers} selectedProblemStatement={selectedProblemStatement} />
      </div>
    );
  }

  // ─── MINIMAL ───
  if (template === "minimal") {
    return wrapDark(
      <div className="min-h-screen relative bg-background text-foreground">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${brandColor}12, ${brandColor}03)` }} />
        <div className="relative min-h-screen flex items-center justify-center px-4 py-8 sm:py-12">
          <div className="w-full max-w-xl animate-in fade-in duration-300">
            <Card className="border-border shadow-xl rounded-2xl">
              <CardContent className="p-5 sm:p-7">
                <div className="text-center mb-5">
                  <CompactLogo flyerUrl={flyerUrl} eventName={event.name} className="mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-md" />
                  {!flyerUrl && (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}CC)` }}>
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <EventInfo
                    event={event}
                    selectedProblemStatementId={selectedProblemStatement?.id}
                    onSelectProblemStatement={setSelectedProblemStatement}
                  />
                </div>
                <RegistrationForm {...formProps} />
                <PoweredBy />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ─── SPLIT SCREEN ───
  if (template === "split") {
    return wrapDark(
      <div className="min-h-screen flex flex-col lg:flex-row bg-background text-foreground">
        {/* Left: Event Details & Overview */}
        <div
          className="lg:w-5/12 bg-muted/20 border-b lg:border-b-0 lg:border-r border-border/60 flex flex-col justify-between p-6 sm:p-8 lg:p-10 relative overflow-y-auto"
          style={{ background: isDark ? undefined : `linear-gradient(145deg, ${brandColor}0F, ${brandColor}03)` }}
        >
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <CompactLogo
                flyerUrl={flyerUrl}
                eventName={event.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-md border border-border/40 shrink-0"
              />
              <div>
                <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider text-primary border-primary/30">
                  {isHackathon ? "Hackathon" : "Event"}
                </Badge>
                {event.event_date && (
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatEventDateTime(event)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
                {event.name}
              </h1>
              {event.description && (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {event.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border/60 text-muted-foreground">
                {event.location_type === "physical" ? <MapPin className="w-3.5 h-3.5" /> : event.location_type === "hybrid" ? <Globe className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                <span className="capitalize">{event.location_type || "Online"}</span>
                {event.location_value && <span className="font-medium text-foreground">· {event.location_value}</span>}
              </div>

              {event.ticket_price && event.ticket_price > 0 ? (
                <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium">
                  ₹{event.ticket_price}
                </div>
              ) : (
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium">
                  Free
                </div>
              )}
            </div>

            {/* Problem Statements list if published */}
            {publishedProblemStatements.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Problem Statements ({publishedProblemStatements.length})
                </span>
                <ProblemStatementsShowcase
                  statements={publishedProblemStatements}
                  selectedId={selectedProblemStatement?.id}
                  onSelect={setSelectedProblemStatement}
                />
              </div>
            )}
          </div>

          <div className="pt-6 relative z-10 hidden lg:block">
            <PoweredBy />
          </div>
        </div>

        {/* Right: Registration Form Column */}
        <div className="lg:w-7/12 flex-1 px-4 py-6 sm:px-8 sm:py-8 flex flex-col justify-start">
          <div className="w-full max-w-xl mx-auto space-y-4 animate-in fade-in duration-300">
            <div className="pb-2 border-b border-border/50">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground">
                Participant Registration
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fill in your details to secure your spot
              </p>
            </div>

            <RegistrationForm {...formProps} />

            <div className="block lg:hidden pt-2">
              <PoweredBy />
            </div>
          </div>
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
          <div className="animate-in fade-in duration-300">
            <Card className="border-border shadow-2xl">
              <CardContent className="p-8">
                <EventInfo
                  event={event}
                  className="mb-6"
                  selectedProblemStatementId={selectedProblemStatement?.id}
                  onSelectProblemStatement={setSelectedProblemStatement}
                />
                <RegistrationForm {...formProps} />
                <PoweredBy />
              </CardContent>
            </Card>
          </div>
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
          <div className="animate-in fade-in duration-300">
            <Card className="border-border shadow-2xl">
              <CardContent className="p-8">
                <EventInfo
                  event={event}
                  className="mb-6"
                  selectedProblemStatementId={selectedProblemStatement?.id}
                  onSelectProblemStatement={setSelectedProblemStatement}
                />
                <RegistrationForm {...formProps} />
                <PoweredBy />
              </CardContent>
            </Card>
          </div>
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
            <EventInfo
              event={event}
              selectedProblemStatementId={selectedProblemStatement?.id}
              onSelectProblemStatement={setSelectedProblemStatement}
            />
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
      <div className="w-full max-w-lg animate-in fade-in duration-300">
        <Card className="border-border shadow-2xl">
          <CardContent className="p-8">
            <EventInfo
              event={event}
              className="text-center mb-8"
              selectedProblemStatementId={selectedProblemStatement?.id}
              onSelectProblemStatement={setSelectedProblemStatement}
            />
            <RegistrationForm {...formProps} />
            <PoweredBy />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;

