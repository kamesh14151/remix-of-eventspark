import { useState, useMemo } from "react";
import { useAdminOverview, useIsAdmin, AdminHost, AdminEvent, AdminAttendee } from "@/hooks/useAdminOverview";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShieldCheck,
  Users,
  CalendarDays,
  UserCheck,
  DollarSign,
  Search,
  ExternalLink,
  Copy,
  Check,
  Mail,
  Building2,
  Download,
  RefreshCw,
  Eye,
  Crown,
  Sparkles,
  Layers,
  GraduationCap,
  Phone,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  draft: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  past: "bg-muted text-muted-foreground border-border",
};

export default function AdminOverview() {
  const { data: isAdmin, isLoading: isCheckingAdmin } = useIsAdmin();
  const { data, isLoading, refetch, isRefetching, error } = useAdminOverview();

  const [activeTab, setActiveTab] = useState("hosts");
  const [hostSearch, setHostSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [eventStatusFilter, setEventStatusFilter] = useState("all");
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [attendeeEventFilter, setAttendeeEventFilter] = useState("all");
  const [selectedAttendee, setSelectedAttendee] = useState<AdminAttendee | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string, label: string = "Copied") => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Hosts
  const filteredHosts = useMemo(() => {
    if (!data?.hosts) return [];
    if (!hostSearch) return data.hosts;
    const q = hostSearch.toLowerCase();
    return data.hosts.filter(
      (h) =>
        h.email.toLowerCase().includes(q) ||
        h.fullName.toLowerCase().includes(q) ||
        h.company.toLowerCase().includes(q)
    );
  }, [data?.hosts, hostSearch]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    if (!data?.events) return [];
    return data.events.filter((e) => {
      if (eventStatusFilter !== "all" && e.status !== eventStatusFilter) return false;
      if (!eventSearch) return true;
      const q = eventSearch.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.slug.toLowerCase().includes(q) ||
        e.hostEmail.toLowerCase().includes(q) ||
        e.hostName.toLowerCase().includes(q) ||
        e.hostCompany.toLowerCase().includes(q)
      );
    });
  }, [data?.events, eventSearch, eventStatusFilter]);

  // Filtered Attendees
  const filteredAttendees = useMemo(() => {
    if (!data?.attendees) return [];
    return data.attendees.filter((a) => {
      if (attendeeEventFilter !== "all" && a.eventId !== attendeeEventFilter) return false;
      if (!attendeeSearch) return true;
      const q = attendeeSearch.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.college.toLowerCase().includes(q) ||
        a.eventName.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q) ||
        a.hostEmail.toLowerCase().includes(q)
      );
    });
  }, [data?.attendees, attendeeSearch, attendeeEventFilter]);

  // Export Attendees to CSV
  const handleExportAttendees = () => {
    if (!filteredAttendees || filteredAttendees.length === 0) {
      toast.error("No attendee data to export");
      return;
    }

    const headers = [
      "Attendee Name",
      "Attendee Email",
      "Phone",
      "College",
      "Department",
      "Event Name",
      "Host Email",
      "Host Name",
      "Registered At",
      "Status",
    ];

    const rows = filteredAttendees.map((a) => [
      `"${(a.name || "").replace(/"/g, '""')}"`,
      `"${(a.email || "").replace(/"/g, '""')}"`,
      `"${(a.phone || "").replace(/"/g, '""')}"`,
      `"${(a.college || "").replace(/"/g, '""')}"`,
      `"${(a.department || "").replace(/"/g, '""')}"`,
      `"${(a.eventName || "").replace(/"/g, '""')}"`,
      `"${(a.hostEmail || "").replace(/"/g, '""')}"`,
      `"${(a.hostName || "").replace(/"/g, '""')}"`,
      `"${a.createdAt ? format(new Date(a.createdAt), "yyyy-MM-dd HH:mm") : ""}"`,
      `"${(a.status || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `platform_attendees_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredAttendees.length} attendees to CSV`);
  };

  if (isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying administrator permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center mt-12">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold font-display text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          This portal is reserved strictly for site owners and platform administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground">
                  Owner Admin Portal
                </h1>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs px-2.5 py-0.5 font-semibold">
                  SUPER ADMIN
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Global platform analytics, host directory, all published events & attendees
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="gap-2 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExportAttendees}
            disabled={!data?.attendees || data.attendees.length === 0}
            className="gap-2 rounded-xl"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="rounded-2xl border-border bg-gradient-to-br from-background via-background to-muted/40 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Registered Hosts
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold font-display text-foreground">
                {isLoading ? "..." : data?.summary.totalHosts || 0}
              </span>
              <p className="text-xs text-muted-foreground mt-1">Organizers on platform</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-gradient-to-br from-background via-background to-muted/40 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Events
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <CalendarDays className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-display text-foreground">
                {isLoading ? "..." : data?.summary.totalEvents || 0}
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {data?.summary.liveEvents || 0} Live
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.summary.draftEvents || 0} draft · {data?.summary.pastEvents || 0} past
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-gradient-to-br from-background via-background to-muted/40 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Attendees
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold font-display text-foreground">
                {isLoading ? "..." : data?.summary.totalAttendees || 0}
              </span>
              <p className="text-xs text-muted-foreground mt-1">Registrations across all events</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-gradient-to-br from-background via-background to-muted/40 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Platform Volume
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold font-display text-foreground">
                ₹{isLoading ? "..." : (data?.summary.totalRevenue || 0).toLocaleString()}
              </span>
              <p className="text-xs text-muted-foreground mt-1">Processed event registrations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Tabbed Section ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-3 flex-wrap gap-3">
          <TabsList className="bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="hosts" className="rounded-lg text-xs sm:text-sm gap-2">
              <Users className="w-4 h-4" />
              <span>Hosts ({data?.hosts?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="rounded-lg text-xs sm:text-sm gap-2">
              <CalendarDays className="w-4 h-4" />
              <span>Events ({data?.events?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="attendees" className="rounded-lg text-xs sm:text-sm gap-2">
              <UserCheck className="w-4 h-4" />
              <span>Global Attendees ({data?.attendees?.length || 0})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ════════════════════════════════════════════════════
            TAB 1: HOSTS DIRECTORY
           ════════════════════════════════════════════════════ */}
        <TabsContent value="hosts" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search hosts by email, company or name..."
                value={hostSearch}
                onChange={(e) => setHostSearch(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Showing {filteredHosts.length} of {data?.hosts?.length || 0} hosts
            </span>
          </div>

          <Card className="rounded-2xl border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[280px]">Host / Organizer</TableHead>
                    <TableHead>Email Address</TableHead>
                    <TableHead>Company / Organization</TableHead>
                    <TableHead className="text-center">Events</TableHead>
                    <TableHead className="text-center">Total Attendees</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHosts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No hosts found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHosts.map((host) => (
                      <TableRow key={host.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                              {host.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">{host.fullName}</p>
                              <span className="text-xs text-muted-foreground font-mono truncate block">
                                {host.id.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{host.email}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-md hover:bg-muted"
                              onClick={() => handleCopy(host.email, host.id, "Host email")}
                            >
                              {copiedId === host.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-medium text-foreground">{host.company}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-semibold">
                            {host.eventsCount}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="font-semibold text-sm text-foreground">
                            {host.attendeesCount}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {host.createdAt ? format(new Date(host.createdAt), "MMM d, yyyy") : "—"}
                        </TableCell>

                        <TableCell className="text-right">
                          <a
                            href={`mailto:${host.email}`}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2.5 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Contact</span>
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════
            TAB 2: ALL EVENTS PLATFORM-WIDE
           ════════════════════════════════════════════════════ */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search events by title, slug, or host..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>

              <Select value={eventStatusFilter} onValueChange={setEventStatusFilter}>
                <SelectTrigger className="w-[130px] rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="live">Live Only</SelectItem>
                  <SelectItem value="draft">Draft Only</SelectItem>
                  <SelectItem value="past">Past Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="text-xs text-muted-foreground">
              Showing {filteredEvents.length} of {data?.events?.length || 0} events
            </span>
          </div>

          <Card className="rounded-2xl border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[260px]">Event Name</TableHead>
                    <TableHead>Host / Organizer</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Attendees</TableHead>
                    <TableHead className="text-center">Price</TableHead>
                    <TableHead className="text-right">Direct Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No events found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.map((ev) => (
                      <TableRow key={ev.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {ev.imageUrl ? (
                              <img
                                src={ev.imageUrl}
                                alt={ev.name}
                                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-border"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                <CalendarDays className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">{ev.name}</p>
                              <p className="text-xs text-muted-foreground font-mono truncate">/{ev.slug}</p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div>
                            <p className="font-medium text-sm text-foreground">{ev.hostName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{ev.hostEmail}</p>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {ev.eventDate ? format(new Date(ev.eventDate), "MMM d, yyyy · h:mm a") : "Not scheduled"}
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge variant="outline" className={`capitalize font-semibold text-xs ${statusColors[ev.status] || ""}`}>
                            {ev.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="font-bold text-sm text-foreground">
                            {ev.attendeeCount}
                          </span>
                          {ev.capacity ? (
                            <span className="text-xs text-muted-foreground"> / {ev.capacity}</span>
                          ) : null}
                        </TableCell>

                        <TableCell className="text-center text-sm font-semibold">
                          {ev.ticketPrice > 0 ? `₹${ev.ticketPrice}` : "Free"}
                        </TableCell>

                        <TableCell className="text-right">
                          <a
                            href={`/register/${ev.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2.5 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
                          >
                            <span>Open Page</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════
            TAB 3: GLOBAL ATTENDEES (PLATFORM-WIDE)
           ════════════════════════════════════════════════════ */}
        <TabsContent value="attendees" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search attendee by name, email, college, phone..."
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>

              <Select value={attendeeEventFilter} onValueChange={setAttendeeEventFilter}>
                <SelectTrigger className="w-[180px] rounded-xl">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events ({data?.events?.length || 0})</SelectItem>
                  {data?.events?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Showing {filteredAttendees.length} of {data?.attendees?.length || 0} attendees
              </span>
              <Button variant="outline" size="sm" onClick={handleExportAttendees} className="rounded-xl gap-1.5">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </Button>
            </div>
          </div>

          <Card className="rounded-2xl border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[220px]">Attendee Name</TableHead>
                    <TableHead>Email / Phone</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>College / Department</TableHead>
                    <TableHead>Registered At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No attendees found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAttendees.map((att) => (
                      <TableRow key={att.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-semibold text-sm text-foreground">{att.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{att.id.slice(0, 8)}...</div>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs font-mono text-foreground">{att.email || "No email"}</div>
                          {att.phone ? (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{att.phone}</span>
                            </div>
                          ) : null}
                        </TableCell>

                        <TableCell>
                          <span className="font-medium text-sm text-foreground">{att.eventName}</span>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs">
                            <span className="font-medium text-foreground">{att.hostName}</span>
                            <span className="text-muted-foreground block font-mono">{att.hostEmail}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs">
                            <span className="font-medium text-foreground">{att.college || "—"}</span>
                            {att.department ? (
                              <span className="text-muted-foreground block">{att.department}</span>
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {att.createdAt ? format(new Date(att.createdAt), "MMM d, yyyy · h:mm a") : "—"}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAttendee(att)}
                            className="h-8 px-2.5 rounded-lg text-xs gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Attendee Details Modal ── */}
      <Dialog open={!!selectedAttendee} onOpenChange={() => setSelectedAttendee(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Attendee Submission Details</DialogTitle>
            <DialogDescription>
              Registration for <strong>{selectedAttendee?.eventName}</strong> (Host: {selectedAttendee?.hostEmail})
            </DialogDescription>
          </DialogHeader>

          {selectedAttendee && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3 text-sm p-3.5 rounded-xl bg-muted/40">
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Attendee Name</span>
                  <span className="font-semibold text-foreground">{selectedAttendee.name}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Email Address</span>
                  <span className="font-mono text-xs text-foreground">{selectedAttendee.email}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Phone</span>
                  <span className="text-foreground">{selectedAttendee.phone || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">College</span>
                  <span className="text-foreground">{selectedAttendee.college || "—"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  All Submitted Form Fields
                </span>
                <div className="space-y-1.5 border border-border rounded-xl p-3 text-xs bg-background">
                  {selectedAttendee.data && Object.keys(selectedAttendee.data).length > 0 ? (
                    Object.entries(selectedAttendee.data).map(([key, val]) => (
                      <div key={key} className="flex items-start justify-between py-1 border-b border-border/40 last:border-0 gap-2">
                        <span className="font-medium text-muted-foreground shrink-0">{key}:</span>
                        <span className="font-mono text-foreground text-right break-all">
                          {typeof val === "object" ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No custom fields submitted.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
