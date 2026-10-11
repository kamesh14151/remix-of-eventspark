import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Event, ProblemStatement } from "@/hooks/useEvents";
import { toast } from "sonner";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Target, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Save, 
  Loader2,
  FolderPlus
} from "lucide-react";

interface Props {
  event: Event;
  onUpdate: (fields: any) => Promise<void>;
}

export const sampleProblemStatements: ProblemStatement[] = [
  {
    id: "ps-1",
    code: "PS01",
    title: "AI-Powered Smart Campus & Resource Management",
    category: "AI & Machine Learning",
    description: "Build an intelligent solution utilizing computer vision or predictive ML to automate attendance, energy usage, classroom scheduling, or student facility navigation.",
    published: true,
  },
  {
    id: "ps-2",
    code: "PS02",
    title: "Predictive Healthcare & Remote Telemedicine Assistant",
    category: "MedTech & IoT",
    description: "Develop a secure digital health companion for early symptom prediction, vital monitoring via IoT, or verified prescription management for rural and urban patients.",
    published: true,
  },
  {
    id: "ps-3",
    code: "PS03",
    title: "Transparent Supply Chain & Counterfeit Detection",
    category: "Web3 & Security",
    description: "Design a decentralized ledger or cryptographic verification platform to ensure transparency and prevent counterfeit goods in pharmaceuticals or agriculture.",
    published: true,
  },
  {
    id: "ps-4",
    code: "PS04",
    title: "Smart Waste Segregation & Carbon Footprint Tracker",
    category: "GreenTech & Sustainability",
    description: "Create a computer-vision enabled smart bin or community dashboard that tracks carbon emissions, incentivizes recycling, and optimizes municipal pickup routes.",
    published: true,
  },
  {
    id: "ps-5",
    code: "PS05",
    title: "Open Innovation – Next-Gen Student Problem Solver",
    category: "Open Innovation",
    description: "Address any critical real-world problem with an innovative full-stack, mobile, or AI application that creates high social or economic impact.",
    published: true,
  },
];

export const ProblemStatementsManager: React.FC<Props> = ({ event, onUpdate }) => {
  const existingPS: ProblemStatement[] = Array.isArray((event as any).problem_statements)
    ? (event as any).problem_statements
    : [];

  const [statements, setStatements] = useState<ProblemStatement[]>(existingPS);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProblemStatement | null>(null);

  // Form fields for create/edit
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(true);

  const openAddDialog = () => {
    setEditingItem(null);
    const nextIndex = statements.length + 1;
    setCode(`PS0${nextIndex}`);
    setTitle("");
    setCategory("AI & Data Science");
    setDescription("");
    setPublished(true);
    setDialogOpen(true);
  };

  const openEditDialog = (ps: ProblemStatement) => {
    setEditingItem(ps);
    setCode(ps.code || "");
    setTitle(ps.title);
    setCategory(ps.category || "");
    setDescription(ps.description);
    setPublished(ps.published !== false);
    setDialogOpen(true);
  };

  const handleSaveItem = () => {
    if (!title.trim()) {
      toast.error("Please enter a title for the problem statement");
      return;
    }

    if (editingItem) {
      // Update
      const updated = statements.map((item) =>
        item.id === editingItem.id
          ? { ...item, code, title, category, description, published }
          : item
      );
      setStatements(updated);
      saveToDatabase(updated);
    } else {
      // Create new
      const newItem: ProblemStatement = {
        id: `ps-${Date.now()}`,
        code: code.trim() || `PS0${statements.length + 1}`,
        title: title.trim(),
        category: category.trim() || "General",
        description: description.trim(),
        published,
      };
      const updated = [...statements, newItem];
      setStatements(updated);
      saveToDatabase(updated);
    }

    setDialogOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    const updated = statements.filter((item) => item.id !== id);
    setStatements(updated);
    saveToDatabase(updated);
  };

  const handleTogglePublish = (id: string, currentVal: boolean) => {
    const updated = statements.map((item) =>
      item.id === id ? { ...item, published: !currentVal } : item
    );
    setStatements(updated);
    saveToDatabase(updated);
  };

  const handleLoadSampleStatements = () => {
    if (statements.length > 0 && !confirm("Replace current problem statements with 5 curated hackathon problem statements?")) {
      return;
    }
    setStatements(sampleProblemStatements);
    saveToDatabase(sampleProblemStatements);
    toast.success("Loaded 5 curated hackathon problem statements!");
  };

  const saveToDatabase = async (listToSave: ProblemStatement[]) => {
    setIsSaving(true);
    try {
      await onUpdate({ problem_statements: listToSave });
      toast.success("Problem statements saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save problem statements");
    } finally {
      setIsSaving(false);
    }
  };

  const publishedCount = statements.filter((s) => s.published !== false).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-4 rounded-xl border border-border">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-base">Hackathon Problem Statements</h3>
            <Badge variant="secondary" className="text-xs">
              {publishedCount} of {statements.length} Published
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Publish 3 to 5 problem statements or tracks for participants to view on the registration page and choose from.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {statements.length === 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadSampleStatements}
              className="rounded-full text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Load Sample 5 Tracks
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={openAddDialog}
            className="rounded-full text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Problem Statement
          </Button>
        </div>
      </div>

      {statements.length === 0 ? (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">No Problem Statements Added Yet</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Give your hackathon clear challenges. You can load our 5 curated problem statement templates or write your own.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadSampleStatements}
                className="rounded-full text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
                Load 5 Standard Tracks
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={openAddDialog}
                className="rounded-full text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create First Statement
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {statements.map((ps, idx) => {
            const isPublished = ps.published !== false;
            return (
              <Card
                key={ps.id || idx}
                className={`relative overflow-hidden transition-all border ${
                  isPublished
                    ? "border-primary/30 shadow-sm bg-card"
                    : "border-border/60 bg-muted/20 opacity-75"
                }`}
              >
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="font-mono text-[10px] bg-primary/15 text-primary hover:bg-primary/20 border-0">
                        {ps.code || `PS0${idx + 1}`}
                      </Badge>
                      {ps.category && (
                        <Badge variant="outline" className="text-[10px]">
                          {ps.category}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditDialog(ps)}
                        title="Edit statement"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteItem(ps.id)}
                        title="Delete statement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm leading-snug">{ps.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                      {ps.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`ps-publish-${ps.id}`}
                        checked={isPublished}
                        onCheckedChange={() => handleTogglePublish(ps.id, isPublished)}
                      />
                      <Label
                        htmlFor={`ps-publish-${ps.id}`}
                        className={`text-[11px] cursor-pointer flex items-center gap-1 ${
                          isPublished ? "text-primary font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {isPublished ? (
                          <>
                            <Eye className="w-3 h-3 text-primary" /> Published to attendees
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Hidden (Draft)
                          </>
                        )}
                      </Label>
                    </div>

                    <span className="text-[10px] text-muted-foreground">Track #{idx + 1}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog for adding/editing a problem statement */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-primary" />
              {editingItem ? "Edit Problem Statement" : "Add New Problem Statement"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label className="text-xs">Code / ID *</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. PS01"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Category / Domain</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. AI & ML, Healthcare, Web3"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Problem Statement Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Smart Campus Navigation & IoT Management"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description & Objectives *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the challenge, problem background, requirements, and expected outcome for hackathon teams..."
                rows={4}
                className="text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Publish on Registration Page</Label>
                <p className="text-[11px] text-muted-foreground">
                  When enabled, attendees will see this problem statement tile and can choose it while registering.
                </p>
              </div>
              <Switch checked={published} onCheckedChange={setPublished} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveItem}
              disabled={isSaving}
              className="rounded-full text-xs font-medium"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              {editingItem ? "Update Statement" : "Add Statement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default ProblemStatementsManager;
