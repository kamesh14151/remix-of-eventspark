import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Download, Loader2, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Mail, Eye, GraduationCap, Building2, Phone, Github, Trash2, Target } from "lucide-react";
import { useRegistrationsByEvent, useDeleteRegistration } from "@/hooks/useRegistrations";
import { useEvent } from "@/hooks/useEvents";
import { format } from "date-fns";
import SendEmailDialog from "@/components/email/SendEmailDialog";
import { extractStudentInfo } from "@/lib/studentFields";
import { toast } from "sonner";

const statusStyle: Record<string, string> = {
  registered: "bg-primary/10 text-primary border-0",
  checked_in: "bg-success/10 text-success border-0",
  cancelled: "bg-destructive/10 text-destructive border-0",
};

type SortColumn = "name" | "email" | "status" | "date" | "college";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 15;

export default function EventAttendeesTable({ eventId, event: propEvent }: { eventId: string; event?: any }) {
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [selectedAttendee, setSelectedAttendee] = useState<any | null>(null);

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<Array<{ name: string; email: string }>>([]);
  const [emailModalTitle, setEmailModalTitle] = useState("");

  const { data: registrations, isLoading } = useRegistrationsByEvent(eventId);
  const { data: fetchedEvent } = useEvent(eventId);
  const event = propEvent || fetchedEvent || { id: eventId, name: "Event" };
  const deleteReg = useDeleteRegistration();

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
      case "status": return r.status;
      case "date": return r.created_at;
    }
  };

  const filtered = useMemo(() => {
    let items = registrations?.filter(r => {
      if (!search) return true;
      const data = (r.data || {}) as Record<string, string>;
      const searchLower = search.toLowerCase();
      return Object.values(data).some(v => typeof v === "string" && v.toLowerCase().includes(searchLower));
    }) || [];

    items.sort((a, b) => {
      const va = getValue(a, sortColumn);
      const vb = getValue(b, sortColumn);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return items;
  }, [registrations, search, sortColumn, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Manual Email Trigger for single attendee
  const handleOpenSingleEmail = (r: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const data = (r.data || {}) as Record<string, string>;
    const student = extractStudentInfo(data);
    const email = student.email || data["Email Address"] || data["Email"] || "";
    const name = student.name || data["Full Name"] || data["Name"] || "Attendee";

    if (!email) {
      return;
    }

    setEmailRecipients([{ name, email }]);
    setEmailModalTitle(`Send Email to ${name}`);
    setEmailModalOpen(true);
  };

  // Delete attendee
  const handleDeleteAttendee = async (r: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const data = (r.data || {}) as Record<string, string>;
    const student = extractStudentInfo(data);
    const name = student.name || data["Full Name"] || data["Name"] || "this attendee";
    if (!confirm(`Remove "${name}" from this event? This cannot be undone.`)) return;
    try {
      await deleteReg.mutateAsync(r.id);
      toast.success(`${name} removed from attendees`);
      if (selectedAttendee?.id === r.id) setSelectedAttendee(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete attendee");
    }
  };

  // Manual Email Trigger broadcast to all filtered attendees
  const handleOpenBroadcastEmail = () => {
    const recipients = filtered.map(r => {
      const data = (r.data || {}) as Record<string, string>;
      const student = extractStudentInfo(data);
      const email = student.email || data["Email Address"] || data["Email"] || "";
      const name = student.name || data["Full Name"] || data["Name"] || "Attendee";
      return { name, email };
    }).filter(r => !!r.email);

    if (recipients.length === 0) return;

    setEmailRecipients(recipients);
    setEmailModalTitle(`Trigger Email to Attendees (${recipients.length})`);
    setEmailModalOpen(true);
  };

  const handleExportCSV = () => {
    if (!filtered?.length) return;
    const headers = ["Name", "Email", "Status", "College / Institution", "Department", "Year of Study", "Roll No", "Phone", "Problem Statement Track", "Date"];
    const rows = filtered.map(r => {
      const data = (r.data || {}) as Record<string, string>;
      const student = extractStudentInfo(data);
      return [
        student.name || data["Full Name"] || data["Name"] || "",
        student.email || data["Email Address"] || data["Email"] || "",
        r.status,
        student.college || data["Company"] || "",
        student.department || data["Job Title"] || "",
        student.year || "",
        student.rollNo || "",
        student.phone || "",
        data["Problem Statement"] || (data as any)["problem_statement_title"] || "",
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
    a.download = `attendees-${(event.name || "event").replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-display font-semibold flex items-center gap-2">
            Attendees {filtered.length > 0 && <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>}
          </h3>
          <p className="text-xs text-muted-foreground">Manage attendee registrations, academic details & trigger communications.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search attendees…" className="pl-9 h-8 text-xs rounded-full" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
          
          {/* Manual Trigger Email to All Attendees */}
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs rounded-full shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
            onClick={handleOpenBroadcastEmail}
            disabled={filtered.length === 0}
          >
            <Mail className="w-3.5 h-3.5 mr-1.5" /> Trigger Email
          </Button>

          <Button variant="outline" size="sm" className="h-8 text-xs shrink-0 rounded-full" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : paged.length > 0 ? (
        <>
          <div className="rounded-xl border border-border/80 overflow-x-auto bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                    <span className="flex items-center text-xs font-semibold">Name <SortIcon col="name" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort("college")}>
                    <span className="flex items-center text-xs font-semibold">Academic / College <SortIcon col="college" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hidden sm:table-cell" onClick={() => handleSort("email")}>
                    <span className="flex items-center text-xs font-semibold">Email <SortIcon col="email" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                    <span className="flex items-center text-xs font-semibold">Status <SortIcon col="status" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hidden lg:table-cell" onClick={() => handleSort("date")}>
                    <span className="flex items-center text-xs font-semibold">Date <SortIcon col="date" /></span>
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((r) => {
                  const data = (r.data || {}) as Record<string, string>;
                  const student = extractStudentInfo(data);
                  const attendeeName = student.name || data["Full Name"] || data["Name"] || "—";
                  const attendeeEmail = student.email || data["Email Address"] || data["Email"] || "—";

                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setSelectedAttendee(r)}
                    >
                      {/* Name & Academic Tag */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-sm text-foreground">{attendeeName}</p>
                          {data["Problem Statement"] && (
                            <div className="pt-0.5">
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 flex items-center gap-1 w-fit max-w-[220px] truncate">
                                <Target className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{data["Problem Statement"]}</span>
                              </Badge>
                            </div>
                          )}
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

                      {/* College / Department */}
                      <TableCell className="hidden md:table-cell">
                        {student.college ? (
                          <div className="space-y-0.5 max-w-[240px]">
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

                      {/* Email */}
                      <TableCell className="text-muted-foreground text-xs hidden sm:table-cell truncate max-w-[200px]">
                        {attendeeEmail}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge className={`${statusStyle[r.status] || ""} capitalize text-[11px]`}>
                          {r.status.replace("_", " ")}
                        </Badge>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-muted-foreground text-xs hidden lg:table-cell">
                        {format(new Date(r.created_at), "MMM d, yyyy")}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 rounded-full"
                            title="Send email to this attendee"
                            onClick={(e) => handleOpenSingleEmail(r, e)}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
                            title="View attendee details"
                            onClick={() => setSelectedAttendee(r)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                            title="Delete attendee"
                            disabled={deleteReg.isPending}
                            onClick={(e) => handleDeleteAttendee(r, e)}
                          >
                            <Trash2 className="w-4 h-4" />
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
        <div className="text-center py-12 border border-dashed rounded-xl p-8">
          <p className="text-sm text-muted-foreground">{search ? "No matching attendees found." : "No attendees registered yet."}</p>
        </div>
      )}

      {/* Attendee Details Modal */}
      <Dialog open={!!selectedAttendee} onOpenChange={(open) => !open && setSelectedAttendee(null)}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display text-xl">Attendee Details</DialogTitle>
              {selectedAttendee && (
                <Badge className={`${statusStyle[selectedAttendee.status] || ""} capitalize text-xs`}>
                  {selectedAttendee.status.replace("_", " ")}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Registration details collected during submission.
            </DialogDescription>
          </DialogHeader>

          {selectedAttendee && (() => {
            const data = (selectedAttendee.data || {}) as Record<string, any>;
            const student = extractStudentInfo(data);
            const teamMembers = data.team_members || [];

            return (
              <div className="space-y-4 pt-2">
                {/* Problem Statement Track if present */}
                {(data["Problem Statement"] || data["selected_problem_statement_title"]) && (
                  <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/25 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-primary font-semibold text-xs uppercase tracking-wider">
                      <Target className="w-3.5 h-3.5" />
                      Selected Problem Statement Track
                    </div>
                    <p className="font-semibold text-sm text-foreground">
                      {data["Problem Statement"] || data["selected_problem_statement_title"]}
                    </p>
                    {data["problem_statement_category"] && (
                      <Badge variant="secondary" className="text-[10px]">
                        Domain: {data["problem_statement_category"]}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Academic / Student Section if student details exist */}
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
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">All Registration Fields</h4>
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

                {/* Team Members if any */}
                {Array.isArray(teamMembers) && teamMembers.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Team Members ({teamMembers.length})
                    </h4>
                    <div className="space-y-2">
                      {teamMembers.map((m: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-muted/40 text-xs flex justify-between items-center gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{m.name || `Member ${idx + 2}`}</p>
                            <p className="text-muted-foreground text-[11px] truncate">{m.email}</p>
                          </div>
                          {(m.college || m.department) && (
                            <div className="text-right shrink-0 space-y-0.5">
                              {m.college && (
                                <Badge variant="outline" className="text-[10px] block max-w-[180px] truncate">
                                  {m.college}
                                </Badge>
                              )}
                              {m.department && (
                                <span className="text-[10px] text-muted-foreground block truncate">
                                  {m.department}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phone number */}
                {(() => {
                  const phone = extractStudentInfo(data).phone ||
                    data["Phone Number"] || data["Phone"] || data["Mobile"] || data["Mobile Number"] || "";
                  return phone ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <a href={`tel:${phone}`} className="hover:text-foreground transition-colors">{phone}</a>
                    </div>
                  ) : null;
                })()}

                {/* Bottom actions */}
                <div className="border-t border-border pt-4 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Registered {format(new Date(selectedAttendee.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="rounded-full text-xs"
                      disabled={deleteReg.isPending}
                      onClick={() => handleDeleteAttendee(selectedAttendee)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => {
                        const r = selectedAttendee;
                        setSelectedAttendee(null);
                        handleOpenSingleEmail(r);
                      }}
                    >
                      <Mail className="w-3.5 h-3.5 mr-1.5" /> Trigger Email
                    </Button>
                  </div>
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
        event={event}
        recipients={emailRecipients}
        title={emailModalTitle}
      />
    </div>
  );
}
