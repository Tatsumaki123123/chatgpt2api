"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CirclePlus,
  FileText,
  Filter,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Layers3,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  Badge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteContentCase,
  deleteContentCategory,
  deleteContentTemplate,
  fetchContentCategories,
  fetchContentCases,
  fetchContentOverview,
  fetchContentTemplates,
  saveContentCase,
  saveContentCategory,
  saveContentTemplate,
  type ContentCase,
  type ContentCategory,
  type ContentOverview,
  type ContentTemplate,
} from "@/lib/api";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { cn } from "@/lib/utils";

type TabKey = "categories" | "templates" | "cases";

type CategoryForm = {
  value: string;
  zhTitle: string;
  enTitle: string;
  zhDescription: string;
  enDescription: string;
  cover: string;
  anchor: string;
  templateAnchor: string;
  sortOrder: string;
};

type TemplateForm = {
  id: string;
  zhTitle: string;
  enTitle: string;
  zhDescription: string;
  enDescription: string;
  category: string;
  anchor: string;
  cover: string;
  styles: string;
  scenes: string;
  tags: string;
  zhUseWhen: string;
  enUseWhen: string;
  guidanceZh: string;
  guidanceEn: string;
  pitfallsZh: string;
  pitfallsEn: string;
  exampleCases: string;
  prompt: string;
  sortOrder: string;
};

type CaseForm = {
  id: string;
  title: string;
  image: string;
  imageAlt: string;
  sourceLabel: string;
  sourceUrl: string;
  prompt: string;
  promptPreview: string;
  category: string;
  styles: string;
  scenes: string;
  featured: boolean;
  usageCount: string;
  favoriteCount: string;
  githubUrl: string;
  status: ContentCase["status"];
};

const emptyCategoryForm: CategoryForm = {
  value: "",
  zhTitle: "",
  enTitle: "",
  zhDescription: "",
  enDescription: "",
  cover: "",
  anchor: "",
  templateAnchor: "",
  sortOrder: "0",
};

const emptyTemplateForm: TemplateForm = {
  id: "",
  zhTitle: "",
  enTitle: "",
  zhDescription: "",
  enDescription: "",
  category: "",
  anchor: "",
  cover: "",
  styles: "",
  scenes: "",
  tags: "",
  zhUseWhen: "",
  enUseWhen: "",
  guidanceZh: "",
  guidanceEn: "",
  pitfallsZh: "",
  pitfallsEn: "",
  exampleCases: "",
  prompt: "",
  sortOrder: "0",
};

const emptyCaseForm: CaseForm = {
  id: "",
  title: "",
  image: "",
  imageAlt: "",
  sourceLabel: "",
  sourceUrl: "",
  prompt: "",
  promptPreview: "",
  category: "",
  styles: "",
  scenes: "",
  featured: false,
  usageCount: "0",
  favoriteCount: "0",
  githubUrl: "",
  status: "published",
};

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitNumbers(value: string) {
  return splitList(value)
    .map((item) => Number(item))
    .filter((value) => Number.isFinite(value));
}

function localized(zh: string, en: string) {
  return { zh: zh.trim(), en: en.trim() };
}

function displayText(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }
  const item = value as { zh?: string; en?: string };
  return item.zh?.trim() || item.en?.trim() || "";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return value.replace("T", " ").replace("Z", "");
}

function OverviewCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <Card className="rounded-2xl border-white/70 bg-white/90 shadow-sm">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-xs font-medium text-stone-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">{value}</div>
        </div>
        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 text-stone-500">{icon}</div>
      </CardContent>
    </Card>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="mb-1 text-xs font-medium text-stone-500">{children}</div>;
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-sm font-semibold text-stone-950">{title}</div>
        <div className="mt-1 text-xs text-stone-500">{description}</div>
      </div>
      {action}
    </div>
  );
}

function CategoryDialog({
  open,
  value,
  onChange,
  onClose,
  onSave,
  saving,
  originalValue,
}: {
  open: boolean;
  value: CategoryForm;
  onChange: (next: CategoryForm) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  originalValue?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{originalValue ? "编辑分类" : "新增分类"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <FieldLabel>唯一值</FieldLabel>
            <Input value={value.value} onChange={(e) => onChange({ ...value, value: e.target.value })} placeholder="Posters & Typography" />
          </label>
          <label>
            <FieldLabel>中文标题</FieldLabel>
            <Input value={value.zhTitle} onChange={(e) => onChange({ ...value, zhTitle: e.target.value })} />
          </label>
          <label>
            <FieldLabel>英文标题</FieldLabel>
            <Input value={value.enTitle} onChange={(e) => onChange({ ...value, enTitle: e.target.value })} />
          </label>
          <label>
            <FieldLabel>中文描述</FieldLabel>
            <Textarea value={value.zhDescription} onChange={(e) => onChange({ ...value, zhDescription: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>英文描述</FieldLabel>
            <Textarea value={value.enDescription} onChange={(e) => onChange({ ...value, enDescription: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>封面</FieldLabel>
            <Input value={value.cover} onChange={(e) => onChange({ ...value, cover: e.target.value })} placeholder="/images/category-covers/poster.jpg" />
          </label>
          <label>
            <FieldLabel>锚点</FieldLabel>
            <Input value={value.anchor} onChange={(e) => onChange({ ...value, anchor: e.target.value })} />
          </label>
          <label>
            <FieldLabel>模板锚点</FieldLabel>
            <Input value={value.templateAnchor} onChange={(e) => onChange({ ...value, templateAnchor: e.target.value })} />
          </label>
          <label>
            <FieldLabel>排序</FieldLabel>
            <Input type="number" value={value.sortOrder} onChange={(e) => onChange({ ...value, sortOrder: e.target.value })} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateDialog({
  open,
  value,
  onChange,
  onClose,
  onSave,
  saving,
  originalId,
  categories,
}: {
  open: boolean;
  value: TemplateForm;
  onChange: (next: TemplateForm) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  originalId?: string | null;
  categories: ContentCategory[];
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{originalId ? "编辑模板" : "新增模板"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <FieldLabel>ID</FieldLabel>
            <Input value={value.id} onChange={(e) => onChange({ ...value, id: e.target.value })} placeholder="tpl-poster" />
          </label>
          <label>
            <FieldLabel>中文标题</FieldLabel>
            <Input value={value.zhTitle} onChange={(e) => onChange({ ...value, zhTitle: e.target.value })} />
          </label>
          <label>
            <FieldLabel>英文标题</FieldLabel>
            <Input value={value.enTitle} onChange={(e) => onChange({ ...value, enTitle: e.target.value })} />
          </label>
          <label>
            <FieldLabel>中文描述</FieldLabel>
            <Textarea value={value.zhDescription} onChange={(e) => onChange({ ...value, zhDescription: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>英文描述</FieldLabel>
            <Textarea value={value.enDescription} onChange={(e) => onChange({ ...value, enDescription: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>分类</FieldLabel>
            <Select value={value.category} onValueChange={(next) => onChange({ ...value, category: next })}>
              <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
              <SelectContent>
                {categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.value}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label>
            <FieldLabel>锚点</FieldLabel>
            <Input value={value.anchor} onChange={(e) => onChange({ ...value, anchor: e.target.value })} />
          </label>
          <label>
            <FieldLabel>封面</FieldLabel>
            <Input value={value.cover} onChange={(e) => onChange({ ...value, cover: e.target.value })} />
          </label>
          <label>
            <FieldLabel>排序</FieldLabel>
            <Input type="number" value={value.sortOrder} onChange={(e) => onChange({ ...value, sortOrder: e.target.value })} />
          </label>
          <label>
            <FieldLabel>风格</FieldLabel>
            <Textarea value={value.styles} onChange={(e) => onChange({ ...value, styles: e.target.value })} className="min-h-20" placeholder="Poster, Typography" />
          </label>
          <label>
            <FieldLabel>场景</FieldLabel>
            <Textarea value={value.scenes} onChange={(e) => onChange({ ...value, scenes: e.target.value })} className="min-h-20" placeholder="Commerce, Social" />
          </label>
          <label>
            <FieldLabel>标签</FieldLabel>
            <Textarea value={value.tags} onChange={(e) => onChange({ ...value, tags: e.target.value })} className="min-h-20" />
          </label>
          <label>
            <FieldLabel>示例案例</FieldLabel>
            <Textarea value={value.exampleCases} onChange={(e) => onChange({ ...value, exampleCases: e.target.value })} className="min-h-20" placeholder="1, 2, 3" />
          </label>
          <label>
            <FieldLabel>中文适用场景</FieldLabel>
            <Textarea value={value.zhUseWhen} onChange={(e) => onChange({ ...value, zhUseWhen: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>英文适用场景</FieldLabel>
            <Textarea value={value.enUseWhen} onChange={(e) => onChange({ ...value, enUseWhen: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>中文建议</FieldLabel>
            <Textarea value={value.guidanceZh} onChange={(e) => onChange({ ...value, guidanceZh: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>英文建议</FieldLabel>
            <Textarea value={value.guidanceEn} onChange={(e) => onChange({ ...value, guidanceEn: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>中文避坑</FieldLabel>
            <Textarea value={value.pitfallsZh} onChange={(e) => onChange({ ...value, pitfallsZh: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>英文避坑</FieldLabel>
            <Textarea value={value.pitfallsEn} onChange={(e) => onChange({ ...value, pitfallsEn: e.target.value })} className="min-h-24" />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>Prompt</FieldLabel>
            <Textarea value={value.prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} className="min-h-32" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CaseDialog({
  open,
  value,
  onChange,
  onClose,
  onSave,
  saving,
  originalId,
  categories,
}: {
  open: boolean;
  value: CaseForm;
  onChange: (next: CaseForm) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  originalId?: number | null;
  categories: ContentCategory[];
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{originalId ? "编辑案例" : "新增案例"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <FieldLabel>ID</FieldLabel>
            <Input value={value.id} onChange={(e) => onChange({ ...value, id: e.target.value })} placeholder="484" />
          </label>
          <label>
            <FieldLabel>状态</FieldLabel>
            <Select value={value.status} onValueChange={(next) => onChange({ ...value, status: next as ContentCase["status"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="published">published</SelectItem>
                <SelectItem value="draft">draft</SelectItem>
                <SelectItem value="archived">archived</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>标题</FieldLabel>
            <Input value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>图片</FieldLabel>
            <Input value={value.image} onChange={(e) => onChange({ ...value, image: e.target.value })} />
          </label>
          <label>
            <FieldLabel>图片说明</FieldLabel>
            <Input value={value.imageAlt} onChange={(e) => onChange({ ...value, imageAlt: e.target.value })} />
          </label>
          <label>
            <FieldLabel>来源标签</FieldLabel>
            <Input value={value.sourceLabel} onChange={(e) => onChange({ ...value, sourceLabel: e.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>来源链接</FieldLabel>
            <Input value={value.sourceUrl} onChange={(e) => onChange({ ...value, sourceUrl: e.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>Github 链接</FieldLabel>
            <Input value={value.githubUrl} onChange={(e) => onChange({ ...value, githubUrl: e.target.value })} />
          </label>
          <label>
            <FieldLabel>分类</FieldLabel>
            <Select value={value.category} onValueChange={(next) => onChange({ ...value, category: next })}>
              <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
              <SelectContent>
                {categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.value}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label>
            <FieldLabel>推荐</FieldLabel>
            <div className="flex h-11 items-center rounded-2xl border px-3">
              <input
                type="checkbox"
                checked={value.featured}
                onChange={(e) => onChange({ ...value, featured: e.target.checked })}
                className="size-4"
              />
            </div>
          </label>
          <label>
            <FieldLabel>使用次数</FieldLabel>
            <Input type="number" value={value.usageCount} onChange={(e) => onChange({ ...value, usageCount: e.target.value })} />
          </label>
          <label>
            <FieldLabel>收藏次数</FieldLabel>
            <Input type="number" value={value.favoriteCount} onChange={(e) => onChange({ ...value, favoriteCount: e.target.value })} />
          </label>
          <label>
            <FieldLabel>风格</FieldLabel>
            <Textarea value={value.styles} onChange={(e) => onChange({ ...value, styles: e.target.value })} className="min-h-20" />
          </label>
          <label>
            <FieldLabel>场景</FieldLabel>
            <Textarea value={value.scenes} onChange={(e) => onChange({ ...value, scenes: e.target.value })} className="min-h-20" />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>Prompt 摘要</FieldLabel>
            <Input value={value.promptPreview} onChange={(e) => onChange({ ...value, promptPreview: e.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>完整 Prompt</FieldLabel>
            <Textarea value={value.prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} className="min-h-32" />
          </label>
        </div>
        <div className="space-y-3">
          <div className="text-xs font-medium text-stone-500">预览</div>
          {value.image ? (
            <img
              src={value.image}
              alt={value.imageAlt || value.title}
              className="max-h-72 w-full rounded-2xl border border-stone-100 object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-stone-200 text-sm text-stone-400">
              暂无图片
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function categoryToForm(category: ContentCategory): CategoryForm {
  return {
    value: category.value || "",
    zhTitle: String(category.title?.zh ?? ""),
    enTitle: String(category.title?.en ?? ""),
    zhDescription: String(category.description?.zh ?? ""),
    enDescription: String(category.description?.en ?? ""),
    cover: category.cover || "",
    anchor: category.anchor || "",
    templateAnchor: category.templateAnchor || "",
    sortOrder: String(category.sortOrder ?? 0),
  };
}

function templateToForm(template: ContentTemplate): TemplateForm {
  return {
    id: template.id || "",
    zhTitle: String(template.title?.zh ?? ""),
    enTitle: String(template.title?.en ?? ""),
    zhDescription: String(template.description?.zh ?? ""),
    enDescription: String(template.description?.en ?? ""),
    category: template.category || "",
    anchor: template.anchor || "",
    cover: template.cover || "",
    styles: (template.styles ?? []).join(", "),
    scenes: (template.scenes ?? []).join(", "),
    tags: (template.tags ?? []).join(", "),
    zhUseWhen: String(template.useWhen?.zh ?? ""),
    enUseWhen: String(template.useWhen?.en ?? ""),
    guidanceZh: Array.isArray(template.guidance?.zh) ? (template.guidance.zh as string[]).join("\n") : String(template.guidance?.zh ?? ""),
    guidanceEn: Array.isArray(template.guidance?.en) ? (template.guidance.en as string[]).join("\n") : String(template.guidance?.en ?? ""),
    pitfallsZh: Array.isArray(template.pitfalls?.zh) ? (template.pitfalls.zh as string[]).join("\n") : String(template.pitfalls?.zh ?? ""),
    pitfallsEn: Array.isArray(template.pitfalls?.en) ? (template.pitfalls.en as string[]).join("\n") : String(template.pitfalls?.en ?? ""),
    exampleCases: (template.exampleCases ?? []).join(", "),
    prompt: template.prompt || "",
    sortOrder: String(template.sortOrder ?? 0),
  };
}

function caseToForm(item: ContentCase): CaseForm {
  return {
    id: String(item.id ?? ""),
    title: item.title || "",
    image: item.image || "",
    imageAlt: item.imageAlt || "",
    sourceLabel: item.sourceLabel || "",
    sourceUrl: item.sourceUrl || "",
    prompt: item.prompt || "",
    promptPreview: item.promptPreview || "",
    category: item.category || "",
    styles: (item.styles ?? []).join(", "),
    scenes: (item.scenes ?? []).join(", "),
    featured: Boolean(item.featured),
    usageCount: String(item.usageCount ?? 0),
    favoriteCount: String(item.favoriteCount ?? 0),
    githubUrl: item.githubUrl || "",
    status: item.status,
  };
}

function buildCategoryPayload(form: CategoryForm): ContentCategory {
  return {
    value: form.value.trim(),
    title: localized(form.zhTitle, form.enTitle),
    description: localized(form.zhDescription, form.enDescription),
    cover: form.cover.trim(),
    anchor: form.anchor.trim(),
    templateAnchor: form.templateAnchor.trim(),
    sortOrder: Number(form.sortOrder || 0),
  };
}

function buildTemplatePayload(form: TemplateForm): ContentTemplate {
  return {
    id: form.id.trim(),
    title: localized(form.zhTitle, form.enTitle),
    description: localized(form.zhDescription, form.enDescription),
    category: form.category.trim(),
    anchor: form.anchor.trim(),
    cover: form.cover.trim(),
    styles: splitList(form.styles),
    scenes: splitList(form.scenes),
    tags: splitList(form.tags),
    useWhen: localized(form.zhUseWhen, form.enUseWhen),
    guidance: { zh: splitList(form.guidanceZh), en: splitList(form.guidanceEn) },
    pitfalls: { zh: splitList(form.pitfallsZh), en: splitList(form.pitfallsEn) },
    exampleCases: splitNumbers(form.exampleCases),
    prompt: form.prompt.trim(),
    sortOrder: Number(form.sortOrder || 0),
  };
}

function buildCasePayload(form: CaseForm): ContentCase {
  return {
    id: Number(form.id || 0),
    title: form.title.trim(),
    image: form.image.trim(),
    imageAlt: form.imageAlt.trim(),
    sourceLabel: form.sourceLabel.trim(),
    sourceUrl: form.sourceUrl.trim(),
    prompt: form.prompt.trim(),
    promptPreview: form.promptPreview.trim(),
    category: form.category.trim(),
    styles: splitList(form.styles),
    scenes: splitList(form.scenes),
    featured: form.featured,
    usageCount: Number(form.usageCount || 0),
    favoriteCount: Number(form.favoriteCount || 0),
    githubUrl: form.githubUrl.trim(),
    status: form.status,
  };
}

function ContentPageContent() {
  const [activeTab, setActiveTab] = useState<TabKey>("cases");
  const [overview, setOverview] = useState<ContentOverview | null>(null);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [cases, setCases] = useState<ContentCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState("");
  const [caseSearch, setCaseSearch] = useState("");
  const [caseCategoryFilter, setCaseCategoryFilter] = useState("");
  const [caseStatusFilter, setCaseStatusFilter] = useState("");

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);

  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyTemplateForm);
  const [caseForm, setCaseForm] = useState<CaseForm>(emptyCaseForm);

  const [editingCategoryValue, setEditingCategoryValue] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingCaseId, setEditingCaseId] = useState<number | null>(null);

  const [savingCategory, setSavingCategory] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingCase, setSavingCase] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null);
  const [deletingCase, setDeletingCase] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewData, categoryData, templateData, caseData] = await Promise.all([
        fetchContentOverview(),
        fetchContentCategories(),
        fetchContentTemplates({ q: templateSearch, category: templateCategoryFilter }),
        fetchContentCases({
          q: caseSearch,
          category: caseCategoryFilter,
          status: caseStatusFilter,
          page: 1,
          pageSize: 1000,
        }),
      ]);
      setOverview(overviewData);
      setCategories(categoryData.items);
      setTemplates(templateData.items);
      setCases(caseData.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载内容数据失败");
    } finally {
      setIsLoading(false);
    }
  }, [templateSearch, templateCategoryFilter, caseSearch, caseCategoryFilter, caseStatusFilter]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const categoryOptions = useMemo(() => categories.map((item) => item.value), [categories]);

  const openNewCategory = () => {
    setEditingCategoryValue(null);
    setCategoryForm(emptyCategoryForm);
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (item: ContentCategory) => {
    setEditingCategoryValue(item.value);
    setCategoryForm(categoryToForm(item));
    setCategoryDialogOpen(true);
  };

  const openNewTemplate = () => {
    setEditingTemplateId(null);
    setTemplateForm(emptyTemplateForm);
    setTemplateDialogOpen(true);
  };

  const openEditTemplate = (item: ContentTemplate) => {
    setEditingTemplateId(item.id);
    setTemplateForm(templateToForm(item));
    setTemplateDialogOpen(true);
  };

  const openNewCase = () => {
    setEditingCaseId(null);
    setCaseForm(emptyCaseForm);
    setCaseDialogOpen(true);
  };

  const openEditCase = (item: ContentCase) => {
    setEditingCaseId(item.id);
    setCaseForm(caseToForm(item));
    setCaseDialogOpen(true);
  };

  const saveCategory = async () => {
    setSavingCategory(true);
    try {
      await saveContentCategory(buildCategoryPayload(categoryForm), editingCategoryValue || undefined);
      toast.success("分类已保存");
      setCategoryDialogOpen(false);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存分类失败");
    } finally {
      setSavingCategory(false);
    }
  };

  const saveTemplate = async () => {
    setSavingTemplate(true);
    try {
      await saveContentTemplate(buildTemplatePayload(templateForm), editingTemplateId || undefined);
      toast.success("模板已保存");
      setTemplateDialogOpen(false);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存模板失败");
    } finally {
      setSavingTemplate(false);
    }
  };

  const saveCase = async () => {
    setSavingCase(true);
    try {
      await saveContentCase(buildCasePayload(caseForm), editingCaseId || undefined);
      toast.success("案例已保存");
      setCaseDialogOpen(false);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存案例失败");
    } finally {
      setSavingCase(false);
    }
  };

  const removeCategory = async (value: string) => {
    if (!confirm(`删除分类 ${value}？`)) return;
    setDeletingCategory(value);
    try {
      await deleteContentCategory(value);
      toast.success("分类已删除");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除分类失败");
    } finally {
      setDeletingCategory(null);
    }
  };

  const removeTemplate = async (id: string) => {
    if (!confirm(`删除模板 ${id}？`)) return;
    setDeletingTemplate(id);
    try {
      await deleteContentTemplate(id);
      toast.success("模板已删除");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除模板失败");
    } finally {
      setDeletingTemplate(null);
    }
  };

  const removeCase = async (id: number) => {
    if (!confirm(`删除案例 ${id}？`)) return;
    setDeletingCase(id);
    try {
      await deleteContentCase(id);
      toast.success("案例已删除");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除案例失败");
    } finally {
      setDeletingCase(null);
    }
  };

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: "cases", label: "案例", count: cases.length },
    { key: "templates", label: "模板", count: templates.length },
    { key: "categories", label: "分类", count: categories.length },
  ];

  if (isLoading && !overview) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoaderCircle className="size-5 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Content Library</div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950">内容管理</h1>
          <div className="text-sm text-stone-500">分类、模板、案例统一管理，并同步提供外部 API。</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadAll()}>
            {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
            刷新
          </Button>
          <Button onClick={openNewCase}><CirclePlus className="size-4" />新增案例</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <OverviewCard label="分类" value={overview?.categories ?? 0} icon={<Layers3 className="size-5" />} />
        <OverviewCard label="模板" value={overview?.templates ?? 0} icon={<FileText className="size-5" />} />
        <OverviewCard label="案例" value={overview?.cases ?? 0} icon={<ImageIcon className="size-5" />} />
        <OverviewCard label="已发布" value={overview?.publishedCases ?? 0} icon={<Sparkles className="size-5" />} />
        <OverviewCard label="标签" value={overview?.styleTags ?? 0} icon={<Tag className="size-5" />} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
              activeTab === tab.key
                ? "border-stone-950 bg-stone-950 text-white"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300",
            )}
          >
            {tab.label}
            <span className={cn("rounded-full px-1.5 py-0.5 text-[11px]", activeTab === tab.key ? "bg-white/15" : "bg-stone-100")}>{tab.count}</span>
          </button>
        ))}
      </div>

      {activeTab === "categories" ? (
        <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
          <SectionHeader
            title="分类"
            description="管理分类的唯一值、标题、描述和导航锚点。"
            action={<Button onClick={openNewCategory}><Plus className="size-4" />新增分类</Button>}
          />
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-5 py-3">Value</th>
                    <th className="px-5 py-3">标题</th>
                    <th className="px-5 py-3">描述</th>
                    <th className="px-5 py-3">Anchor</th>
                    <th className="px-5 py-3">模板锚点</th>
                    <th className="px-5 py-3">排序</th>
                    <th className="px-5 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((item) => (
                    <tr key={item.value} className="border-t border-stone-100">
                      <td className="px-5 py-4 font-medium text-stone-900">{item.value}</td>
                      <td className="px-5 py-4 text-stone-600">{displayText(item.title)}</td>
                      <td className="px-5 py-4 text-stone-600">{displayText(item.description)}</td>
                      <td className="px-5 py-4 text-stone-500">{item.anchor || "-"}</td>
                      <td className="px-5 py-4 text-stone-500">{item.templateAnchor || "-"}</td>
                      <td className="px-5 py-4 text-stone-500">{item.sortOrder}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditCategory(item)}><Pencil className="size-4" />编辑</Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-rose-200 text-rose-600 hover:bg-rose-50"
                            onClick={() => void removeCategory(item.value)}
                            disabled={deletingCategory === item.value}
                          >
                            {deletingCategory === item.value ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "templates" ? (
        <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
          <SectionHeader
            title="模板"
            description="支持搜索、按分类筛选，以及编辑提示词、标签和案例引用。"
            action={<Button onClick={openNewTemplate}><Plus className="size-4" />新增模板</Button>}
          />
          <div className="flex flex-wrap gap-2 border-b border-stone-100 px-5 py-4">
            <div className="flex min-w-72 flex-1 items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3">
              <Search className="size-4 text-stone-400" />
              <Input value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} placeholder="搜索模板 ID、标题、说明" className="border-0 px-0 shadow-none focus-visible:ring-0" />
            </div>
            <Select value={templateCategoryFilter || "__all__"} onValueChange={(next) => setTemplateCategoryFilter(next === "__all__" ? "" : next)}>
              <SelectTrigger className="w-56"><SelectValue placeholder="全部分类" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部分类</SelectItem>
                {categoryOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setTemplateSearch(""); setTemplateCategoryFilter(""); }}>
              <Filter className="size-4" />清空
            </Button>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">标题</th>
                    <th className="px-5 py-3">分类</th>
                    <th className="px-5 py-3">标签</th>
                    <th className="px-5 py-3">案例</th>
                    <th className="px-5 py-3">排序</th>
                    <th className="px-5 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((item) => (
                    <tr key={item.id} className="border-t border-stone-100">
                      <td className="px-5 py-4 font-medium text-stone-900">{item.id}</td>
                      <td className="px-5 py-4 text-stone-600">
                        <div>{displayText(item.title)}</div>
                        <div className="mt-1 text-xs text-stone-400">{displayText(item.description)}</div>
                      </td>
                      <td className="px-5 py-4 text-stone-500">{item.category || "-"}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {[...item.styles, ...item.scenes, ...item.tags].slice(0, 6).map((tag) => (
                            <Badge key={tag} variant="outline" className="rounded-md">{tag}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-stone-500">{item.exampleCases.join(", ") || "-"}</td>
                      <td className="px-5 py-4 text-stone-500">{item.sortOrder}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditTemplate(item)}><Pencil className="size-4" />编辑</Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-rose-200 text-rose-600 hover:bg-rose-50"
                            onClick={() => void removeTemplate(item.id)}
                            disabled={deletingTemplate === item.id}
                          >
                            {deletingTemplate === item.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "cases" ? (
        <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
          <SectionHeader
            title="案例"
            description="支持按分类、状态和关键字搜索，并可直接编辑图片、Prompt、热度与收藏数。"
            action={<Button onClick={openNewCase}><Plus className="size-4" />新增案例</Button>}
          />
          <div className="grid gap-3 border-b border-stone-100 px-5 py-4 lg:grid-cols-4">
            <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3">
              <Search className="size-4 text-stone-400" />
              <Input value={caseSearch} onChange={(e) => setCaseSearch(e.target.value)} placeholder="搜索标题、Prompt、来源" className="border-0 px-0 shadow-none focus-visible:ring-0" />
            </div>
            <Select value={caseCategoryFilter || "__all__"} onValueChange={(next) => setCaseCategoryFilter(next === "__all__" ? "" : next)}>
              <SelectTrigger><SelectValue placeholder="全部分类" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部分类</SelectItem>
                {categoryOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={caseStatusFilter || "__all__"} onValueChange={(next) => setCaseStatusFilter(next === "__all__" ? "" : next)}>
              <SelectTrigger><SelectValue placeholder="全部状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部状态</SelectItem>
                <SelectItem value="published">published</SelectItem>
                <SelectItem value="draft">draft</SelectItem>
                <SelectItem value="archived">archived</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setCaseSearch(""); setCaseCategoryFilter(""); setCaseStatusFilter(""); }}>
              <Filter className="size-4" />清空
            </Button>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] text-sm">
                <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-5 py-3">预览</th>
                    <th className="px-5 py-3">标题</th>
                    <th className="px-5 py-3">分类</th>
                    <th className="px-5 py-3">状态</th>
                    <th className="px-5 py-3">指标</th>
                    <th className="px-5 py-3">标签</th>
                    <th className="px-5 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((item) => (
                    <tr key={item.id} className="border-t border-stone-100 align-top">
                      <td className="px-5 py-4">
                        <img src={item.image} alt={item.imageAlt || item.title} className="size-24 rounded-xl object-cover ring-1 ring-stone-100" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-stone-900">{item.title}</div>
                        <div className="mt-1 line-clamp-3 max-w-[28rem] text-xs text-stone-500">{item.promptPreview || item.prompt}</div>
                        <div className="mt-2 text-xs text-stone-400">{item.sourceLabel || "-"} · {item.sourceUrl || "-"}</div>
                      </td>
                      <td className="px-5 py-4 text-stone-500">{item.category || "-"}</td>
                      <td className="px-5 py-4">
                        <Badge variant={item.status === "published" ? "success" : item.status === "draft" ? "warning" : "outline"}>{item.status}</Badge>
                        {item.featured ? <Badge variant="violet" className="ml-2">推荐</Badge> : null}
                      </td>
                      <td className="px-5 py-4 text-stone-500">
                        <div className="flex items-center gap-2"><Star className="size-4" />{item.favoriteCount}</div>
                        <div className="mt-1 flex items-center gap-2"><Sparkles className="size-4" />{item.usageCount}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {[...item.styles, ...item.scenes].slice(0, 8).map((tag) => (
                            <Badge key={tag} variant="outline" className="rounded-md">{tag}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditCase(item)}><Pencil className="size-4" />编辑</Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-rose-200 text-rose-600 hover:bg-rose-50"
                            onClick={() => void removeCase(item.id)}
                            disabled={deletingCase === item.id}
                          >
                            {deletingCase === item.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <CategoryDialog
        open={categoryDialogOpen}
        value={categoryForm}
        onChange={setCategoryForm}
        onClose={() => setCategoryDialogOpen(false)}
        onSave={() => void saveCategory()}
        saving={savingCategory}
        originalValue={editingCategoryValue}
      />

      <TemplateDialog
        open={templateDialogOpen}
        value={templateForm}
        onChange={setTemplateForm}
        onClose={() => setTemplateDialogOpen(false)}
        onSave={() => void saveTemplate()}
        saving={savingTemplate}
        originalId={editingTemplateId}
        categories={categories}
      />

      <CaseDialog
        open={caseDialogOpen}
        value={caseForm}
        onChange={setCaseForm}
        onClose={() => setCaseDialogOpen(false)}
        onSave={() => void saveCase()}
        saving={savingCase}
        originalId={editingCaseId}
        categories={categories}
      />
    </section>
  );
}

export default function ContentPage() {
  const { isCheckingAuth, session } = useAuthGuard(["admin"]);
  if (isCheckingAuth || !session || session.role !== "admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoaderCircle className="size-5 animate-spin text-stone-400" />
      </div>
    );
  }
  return <ContentPageContent />;
}
