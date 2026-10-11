import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Loader2, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Mail, Eye, GraduationCap, Building2, Github } from "lucide-react";
import { useRegistrations, Registration } from "@/hooks/useRegistrations";
import { useRegistrationStats } from "@/hooks/useRegistrations";
import { format } from "date-fns";
import SendEmailDialog from "@/components/email/SendEmailDialog";
import { extractStudentInfo } from "@/lib/studentFields";

const statusStyle: Record<string, string> = {
  registered: "bg-primary/10 text-primary border-0",
  checked_in: "bg-success/10 text-success border-0",
  cancelled: "bg-destructive/10 text-destructive border-0",
};

type SortColumn = "name" | "email" | "event" | "status" | "date" | "college";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 15;

const Attendees = () => {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<Array<{ name: string; email: string }>>([]);
  const [emailModalTitle, setEmailModalTitle] = useState("");
  const [emailEvent, setEmailEvent] = useState<any>({ name: "Event" });

  const { data: registrations, isLoading } = useRegistrations();
  const { data: stats } = useRegistrationStats();

  const eventOptions = useMemo(() => {
    const map = new Map<string, string>();
    registrations?.forEach(r => {
      if (r.events?.name && r.event_id) map.set(r.event_id, r.events.name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [registrations]);

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDir("asc");
    }
    setPage(0);
  };

  const SortIcon = ({ col }: { col: SortColumn }) => {
    if (sortColumn !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const getValue = (r: any, col: SortColumn): string => {
    const data = (r.data || {}) as Record<string, string>;
    const student = extractStudentInfo(data);
    switch (col) {
      case "name": return (student.name || data["Full Name"] || data["Name"] || "").toLowerCase();
      case "email": return (student.email || data["Email Address"] || data["Email"] || "").toLowerCase();
      case "college": return (student.college || data["Company"] || "").toLowerCase();
      case "event": return ((r as any).events?.name || "").toLowerCase();
      case "status": return r.status;
      case "date": return r.created_at;
    }
  };

  const filtered = useMemo(() => {
    let items = registrations?.filter(r => {
      if (eventFilter !== "all" && r.event_id !== eventFilter) return false;
      if (!search) return true;
      const data = (r.data || {}) as Record<string, string>;
      const searchLower = search.toLowerCase();
      return (
        Object.values(data).some(v => typeof v === "string" && v.toLowerCase().includes(searchLower)) ||
        (r.events?.name || "").toLowerCase().includes(searchLower)
      );
    }) || [];

    items.sort((a, b) => {
      const va = getValue(a, sortColumn);
      const vb = getValue(b, sortColumn);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return items;
  }, [registrations, search, eventFilter, sortColumn, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Trigger email to single attendee
  const handleOpenSingleEmail = (r: Registration, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const data = (r.data || {}) as Record<string, string>;
    const student = extractStudentInfo(data);
    const email = student.email || data["Email Address"] || data["Email"] || "";
    const name = student.name || data["Full Name"] || data["Name"] || "Attendee";

    if (!email) return;

    setEmailRecipients([{ name, email }]);
    setEmailEvent({ id: r.event_id, name: r.events?.name || "Event" });
    setEmailModalTitle(`Send Email to ${name}`);
    setEmailModalOpen(true);
  };

  // Trigger email broadcast to filtered attendees
  const handleOpenBroadcastEmail = () => {
    const recipients = filtered.map(r => {
      const data = (r.data || {}) as Record<string, string>;
      const student = extractStudentInfo(data);
      const email = student.email || data["Email Address"] || data["Email"] || "";
      const name = student.name || data["Full Name"] || data["Name"] || "Attendee";
      return { name, email };
    }).filter(r => !!r.email);

    if (recipients.length === 0) return;

    const eventName = eventFilter !== "all" 
      ? eventOptions.find(([id]) => id === eventFilter)?.[1] || "Event"
      : "Filtered Events";

    setEmailRecipients(recipients);
    setEmailEvent({ id: eventFilter, name: eventName });
    setEmailModalTitle(`Trigger Email to ${recipients.length} Attendees`);
    setEmailModalOpen(true);
  };

  const handleExportCSV = () => {
    if (!filtered?.length) return;
    const headers = ["Name", "Email", "Event", "College / Institution", "Department", "Year of Study", "Roll No", "Phone", "Status", "Date"];
    const rows = filtered.map(r => {
      const data = (r.data || {}) as Record<string, string>;
      const student = extractStudentInfo(data);
      return [
        student.name || data["Full Name"] || data["Name"] || "",
        student.email || data["Email Address"] || data["Email"] || "",
        (r as any).events?.name || "",
        student.college || data["Company"] || "",
        student.department || data["Job Title"] || "",
        student.year || "",
        student.rollNo || "",
        student.phone || "",
        r.status,
        format(new Date(r.created_at), "MMM d, yyyy"),
      ];
    });
    const escapeCSV = (val: string): string => {
      const str = String(val ?? "");
      const safe = str.replace(/^([=+\-@])/, "'$1");
      if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
        return `"${safe.replace(/"/g, '""')}"`;
      }
      return safe;
    };
    const csv = [headers, ...rows].map(r => r.map(escapeCSV).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendees${eventFilter !== "all" ? "-filtered" : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRegData = (r: Registration) => (r.data || {}) as Record<string, string>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Attendees</h1>
          <p className="text-muted-foreground">Manage attendee registrations, view academic details, and manually trigger emails.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Manual Trigger Email Button */}
          <Button
            variant="default"
            size="sm"
            className="w-full sm:w-auto rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            onClick={handleOpenBroadcastEmail}
            disabled={filtered.length === 0}
          >
            <Mail className="w-4 h-4 mr-2" /> Trigger Email ({filtered.length})
          </Button>

          <Button variant="outline" size="sm" className="w-full sm:w-auto rounded-full bg-card" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total registrations", value: stats.total ?? 0 },
            { label: "Checked in", value: stats.registrations?.filter(r => r.status === "checked_in").length ?? 0 },
            { label: "Active events", value: stats.activeEvents ?? 0 },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-xl p-5 border border-border/60">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-display font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search attendees, college, email…" className="pl-10 rounded-full bg-card" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <Select value={eventFilter} onValueChange={v => { setEventFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-56 rounded-full bg-card">
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {eventOptions.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : paged.length > 0 ? (
        <>
          <div className="bg-card rounded-xl overflow-x-auto border border-border/80 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/40">
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                    <span className="flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name <SortIcon col="name" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort("college")}>
                    <span className="flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Academic / Org <SortIcon col="college" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hidden sm:table-cell" onClick={() => handleSort("email")}>
                    <span className="flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email <SortIcon col="email" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort("event")}>
                    <span className="flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Event <SortIcon col="event" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                    <span className="flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status <SortIcon col="status" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hidden lg:table-cell" onClick={() => handleSort("date")}>
                    <span className="flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date <SortIcon col="date" /></span>
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((r) => {
                  const data = getRegData(r);
                  const student = extractStudentInfo(data);
                  const attendeeName = student.name || data["Full Name"] || data["Name"] || "—";
                  const attendeeEmail = student.email || data["Email Address"] || data["Email"] || "—";

                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors border-0"
                      onClick={() => setSelectedRegistration(r)}
                    >
                      <TableCell className="font-medium">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-sm text-foreground">{attendeeName}</p>
                          {student.isStudent && student.college ? (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 md:hidden truncate">
                              <GraduationCap className="w-3 h-3 text-primary shrink-0" />
                              <span className="truncate">{student.college}</span>
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground sm:hidden truncate">{attendeeEmail}</p>
                          )}
                        </div>
                      </TableCell>

                      {/* College / Organization */}
                      <TableCell className="hidden md:table-cell">
                        {student.college ? (
                          <div className="space-y-0.5 max-w-[220px]">
                            <p className="text-xs font-medium text-foreground flex items-center gap-1 truncate">
                              <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="truncate">{student.college}</span>
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {student.department || ""}{student.year ? ` · ${student.year}` : ""}
                            </p>
                          </div>
                        ) : data["Company"] ? (
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-foreground flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-muted-foreground" />
                              {data["Company"]}
                            </p>
                            {data["Job Title"] && <p className="text-[11px] text-muted-foreground">{data["Job Title"]}</p>}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-muted-foreground hidden sm:table-cell text-xs truncate max-w-[180px]">
                        {attendeeEmail}
                      </TableCell>

                      <TableCell className="hidden md:table-cell text-xs font-medium">
                        {r.events?.name || "—"}
                      </TableCell>

                      <TableCell>
                        <Badge className={`${statusStyle[r.status] || ""} capitalize text-xs`}>{r.status.replace("_", " ")}</Badge>
                      </TableCell>

                      <TableCell className="text-muted-foreground hidden lg:table-cell text-xs">
                        {format(new Date(r.created_at), "MMM d, yyyy")}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 rounded-full"
                            title="Trigger email to attendee"
                            onClick={(e) => handleOpenSingleEmail(r, e)}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
                            title="View attendee details"
                            onClick={() => setSelectedRegistration(r)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">{page + 1} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 border border-dashed rounded-xl p-8">
          <p className="text-muted-foreground">{search || eventFilter !== "all" ? "No matching attendees found." : "No registrations yet."}</p>
        </div>
      )}

      {/* Attendee Details Modal */}
      <Dialog open={!!selectedRegistration} onOpenChange={(open) => !open && setSelectedRegistration(null)}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display text-xl">Attendee Details</DialogTitle>
              {selectedRegistration && (
                <Badge className={`${statusStyle[selectedRegistration.status] || ""} capitalize text-xs`}>
                  {selectedRegistration.status.replace("_", " ")}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Submitted details for {selectedRegistration?.events?.name || "event"}
            </DialogDescription>
          </DialogHeader>

          {selectedRegistration && (() => {
            const data = getRegData(selectedRegistration);
            const student = extractStudentInfo(data);
            const teamMembers = (data as any).team_members || [];

            return (
              <div className="space-y-4 pt-2">
                {/* Academic details card if student fields are present */}
                {student.isStudent && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                    <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
                      <GraduationCap className="w-4 h-4" />
                      Student & Academic Information
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {student.college && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground block text-[11px]">College / University</span>
                          <span className="font-medium text-sm text-foreground">{student.college}</span>
                        </div>
                      )}
                      {student.department && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Department / Branch</span>
                          <span className="font-medium text-foreground">{student.department}</span>
                        </div>
                      )}
                      {student.year && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Year of Study</span>
                          <span className="font-medium text-foreground">{student.year}</span>
                        </div>
                      )}
                      {student.rollNo && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Roll No / Student ID</span>
                          <span className="font-medium text-foreground">{student.rollNo}</span>
                        </div>
                      )}
                      {student.degree && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Degree / Program</span>
                          <span className="font-medium text-foreground">{student.degree}</span>
                        </div>
                      )}
                      {student.github && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground block text-[11px]">GitHub / Portfolio</span>
                          <a href={student.github.startsWith("http") ? student.github : `https://${student.github}`} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium flex items-center gap-1">
                            <Github className="w-3.5 h-3.5" /> {student.github}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* All Form Fields */}
                <div className="space-y-2 border-t border-border pt-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">All Fields</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {Object.entries(data).map(([key, val]) => {
                      if (key === "team_members" || key === "razorpay_payment_id" || key === "razorpay_order_id") return null;
                      return (
                        <div key={key} className="flex flex-col text-xs bg-muted/40 p-2 rounded-lg">
                          <span className="text-muted-foreground font-medium">{key}</span>
                          <span className="text-foreground mt-0.5">{typeof val === "string" ? val : JSON.stringify(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Event & Registration Metadata */}
                <div className="border-t border-border pt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Event</span>
                    <span className="font-medium">{selectedRegistration.events?.name || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Registered At</span>
                    <span className="font-medium">{format(new Date(selectedRegistration.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                </div>

                {/* Trigger Email Button */}
                <div className="border-t border-border pt-4 flex items-center justify-end">
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={() => {
                      const r = selectedRegistration;
                      setSelectedRegistration(null);
                      handleOpenSingleEmail(r);
                    }}
                  >
                    <Mail className="w-3.5 h-3.5 mr-1.5" /> Trigger Email to Attendee
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Manual Trigger Email Dialog */}
      <SendEmailDialog
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        event={emailEvent}
        recipients={emailRecipients}
        title={emailModalTitle}
      />
    </div>
  );
};

export default Attendees;
