"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Upload,
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
  uploadContentImage,
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
          <DialogTitle>{originalValue ? "缂傛牞绶崚鍡欒" : "閺傛澘顤冮崚鍡欒"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <FieldLabel>闂傚倷绀侀幗婊堝磿閹版澘鍨傛い鏍ㄧ矌閸楁岸鏌熺紒銏犳灈缁?</FieldLabel>
            <Input value={value.value} onChange={(e) => onChange({ ...value, value: e.target.value })} placeholder="Posters & Typography" />
          </label>
          <label>
            <FieldLabel>婵犵數鍋為崹鍫曞箹閳哄懎鍌ㄥù鐘差儏閸戠娀鏌涢幇闈涙灈闁告劏鍋撻梻浣规偠閸庢椽宕滈敃鍌氭辈?</FieldLabel>
            <Input value={value.zhTitle} onChange={(e) => onChange({ ...value, zhTitle: e.target.value })} />
          </label>
          <label>
            <FieldLabel>闂傚倷绀侀崥瀣ｉ幒鎾变粓闁归棿绀侀崙鐘绘煕閹伴潧鏋涢柛鎰ㄥ亾闂備焦鎮堕崕娲礈閿曞倸姹?</FieldLabel>
            <Input value={value.enTitle} onChange={(e) => onChange({ ...value, enTitle: e.target.value })} />
          </label>
          <label>
            <FieldLabel>婵犵數鍋為崹鍫曞箹閳哄懎鍌ㄥù鐘差儏閸戠娀鏌涢幇闈涙灈缂佺姷鏁婚悡顐﹀炊閵娿劌顥濋梺?</FieldLabel>
            <Textarea value={value.zhDescription} onChange={(e) => onChange({ ...value, zhDescription: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>闂傚倷绀侀崥瀣ｉ幒鎾变粓闁归棿绀侀崙鐘绘煕閹伴潧鏋涚紒鐘垫暬閻擃偊宕堕妸銊ヮ棟闂?</FieldLabel>
            <Textarea value={value.enDescription} onChange={(e) => onChange({ ...value, enDescription: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>闂備浇顕х换鎰崲鐎ｎ剚顐芥慨姗嗗墻閻?</FieldLabel>
            <Input value={value.cover} onChange={(e) => onChange({ ...value, cover: e.target.value })} placeholder="/images/category-covers/poster.jpg" />
          </label>
          <label>
            <FieldLabel>闂傚倸鍊烽悞锔锯偓绗涘喚娼╅柕濞炬櫅绾?</FieldLabel>
            <Input value={value.anchor} onChange={(e) => onChange({ ...value, anchor: e.target.value })} />
          </label>
          <label>
            <FieldLabel>濠电姷顣藉Σ鍛村垂椤忓牆绀堟繝闈涙－閻斿棙鎱ㄥ璇蹭壕闂佸搫琚崝宀勶綖濠靛纭€闁绘劖婢樼€?</FieldLabel>
            <Input value={value.templateAnchor} onChange={(e) => onChange({ ...value, templateAnchor: e.target.value })} />
          </label>
          <label>
            <FieldLabel>闂傚倷绀佸﹢閬嶅磿閵堝洦鏆滈柟鐑樻婵?</FieldLabel>
            <Input type="number" value={value.sortOrder} onChange={(e) => onChange({ ...value, sortOrder: e.target.value })} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>闂傚倷绀侀幉锟犳偡閿曞倹鍋嬫俊銈呭暟閻?</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
            婵犵數鍎戠徊钘壝洪敂鐐床闁稿瞼鍋為崑?          </Button>
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
          <DialogTitle>{originalId ? "缂傛牞绶Ο鈩冩緲" : "閺傛澘顤冨Ο鈩冩緲"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <FieldLabel>ID</FieldLabel>
            <Input value={value.id} onChange={(e) => onChange({ ...value, id: e.target.value })} placeholder="tpl-poster" />
          </label>
          <label>
            <FieldLabel>婵犵數鍋為崹鍫曞箹閳哄懎鍌ㄥù鐘差儏閸戠娀鏌涢幇闈涙灈闁告劏鍋撻梻浣规偠閸庢椽宕滈敃鍌氭辈?</FieldLabel>
            <Input value={value.zhTitle} onChange={(e) => onChange({ ...value, zhTitle: e.target.value })} />
          </label>
          <label>
            <FieldLabel>闂傚倷绀侀崥瀣ｉ幒鎾变粓闁归棿绀侀崙鐘绘煕閹伴潧鏋涢柛鎰ㄥ亾闂備焦鎮堕崕娲礈閿曞倸姹?</FieldLabel>
            <Input value={value.enTitle} onChange={(e) => onChange({ ...value, enTitle: e.target.value })} />
          </label>
          <label>
            <FieldLabel>婵犵數鍋為崹鍫曞箹閳哄懎鍌ㄥù鐘差儏閸戠娀鏌涢幇闈涙灈缂佺姷鏁婚悡顐﹀炊閵娿劌顥濋梺?</FieldLabel>
            <Textarea value={value.zhDescription} onChange={(e) => onChange({ ...value, zhDescription: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>闂傚倷绀侀崥瀣ｉ幒鎾变粓闁归棿绀侀崙鐘绘煕閹伴潧鏋涚紒鐘垫暬閻擃偊宕堕妸銊ヮ棟闂?</FieldLabel>
            <Textarea value={value.enDescription} onChange={(e) => onChange({ ...value, enDescription: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>闂傚倷绀侀幉锛勬暜閹烘嚦娑樷槈濮橆厼浠?</FieldLabel>
            <Select value={value.category} onValueChange={(next) => onChange({ ...value, category: next })}>
              <SelectTrigger><SelectValue placeholder="闂傚倸鍊风欢锟犲磻閸曨垁鍥箥椤旂懓浜炬慨妯稿劚婵倻鈧娲樺畝绋跨暦閸楃偐鏋庨柟鐑樼箖閽? /></SelectTrigger>
              <SelectContent>
                {categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.value}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label>
            <FieldLabel>闂傚倸鍊烽悞锔锯偓绗涘喚娼╅柕濞炬櫅绾?</FieldLabel>
            <Input value={value.anchor} onChange={(e) => onChange({ ...value, anchor: e.target.value })} />
          </label>
          <label>
            <FieldLabel>闂備浇顕х换鎰崲鐎ｎ剚顐芥慨姗嗗墻閻?</FieldLabel>
            <Input value={value.cover} onChange={(e) => onChange({ ...value, cover: e.target.value })} />
          </label>
          <label>
            <FieldLabel>闂傚倷绀佸﹢閬嶅磿閵堝洦鏆滈柟鐑樻婵?</FieldLabel>
            <Input type="number" value={value.sortOrder} onChange={(e) => onChange({ ...value, sortOrder: e.target.value })} />
          </label>
          <label>
            <FieldLabel>婵犵绱曢崑娑㈩敄閸涱垪鍋撳☉鎺撴珚闁?</FieldLabel>
            <Textarea value={value.styles} onChange={(e) => onChange({ ...value, styles: e.target.value })} className="min-h-20" placeholder="Poster, Typography" />
          </label>
          <label>
            <FieldLabel>闂傚倷绶氬缁樹繆閸ヮ剙纾块柕鍫濇噳閺?</FieldLabel>
            <Textarea value={value.scenes} onChange={(e) => onChange({ ...value, scenes: e.target.value })} className="min-h-20" placeholder="Commerce, Social" />
          </label>
          <label>
            <FieldLabel>闂傚倷绀侀幖顐ょ矓閺夋嚚娲Ω閳哄﹥鏅?</FieldLabel>
            <Textarea value={value.tags} onChange={(e) => onChange({ ...value, tags: e.target.value })} className="min-h-20" />
          </label>
          <label>
            <FieldLabel>缂傚倸鍊风拋鏌ュ磻閹捐绾ч柣鎰綑椤ュ霉閸忕厧濮堝ǎ鍥э工铻栭柍褜鍓熼幃褔宕ㄩ娑卞仺?</FieldLabel>
            <Textarea value={value.exampleCases} onChange={(e) => onChange({ ...value, exampleCases: e.target.value })} className="min-h-20" placeholder="1, 2, 3" />
          </label>
          <label>
            <FieldLabel>婵犵數鍋為崹鍫曞箹閳哄懎鍌ㄥù鐘差儏閸戠娀鏌涢幇闈涙灍闁绘帒顭烽弻娑氫沪閸撗呯厑闂佸搫妫楃换姗€寮诲☉銏℃櫆闁诡垎鍐瀱婵?</FieldLabel>
            <Textarea value={value.zhUseWhen} onChange={(e) => onChange({ ...value, zhUseWhen: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>闂傚倷绀侀崥瀣ｉ幒鎾变粓闁归棿绀侀崙鐘绘煕閹伴潧鏋熼柣鎺戭煼閺屾稓浠﹂崜褏鐓侀梺鍝勬缁绘﹢寮诲☉銏℃櫆闁诡垎鍐瀱婵?</FieldLabel>
            <Textarea value={value.enUseWhen} onChange={(e) => onChange({ ...value, enUseWhen: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>婵犵數鍋為崹鍫曞箹閳哄懎鍌ㄥù鐘差儏閸戠娀鏌涢幇鐢靛帥闁搞倕鐗嗚灃闁挎梻鐡旈崕銉╂煕?</FieldLabel>
            <Textarea value={value.guidanceZh} onChange={(e) => onChange({ ...value, guidanceZh: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>闂傚倷绀侀崥瀣ｉ幒鎾变粓闁归棿绀侀崙鐘绘煕閹扮數鍘涢柛銈呯墕铻栭柨鏃傜摂閸庛儵鏌?</FieldLabel>
            <Textarea value={value.guidanceEn} onChange={(e) => onChange({ ...value, guidanceEn: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>婵犵數鍋為崹鍫曞箹閳哄懎鍌ㄥù鐘差儏閸戠娀鏌涢幇闈涙灍闁绘帒銈搁弻娑⑩€﹂幋婵囩亶缂?</FieldLabel>
            <Textarea value={value.pitfallsZh} onChange={(e) => onChange({ ...value, pitfallsZh: e.target.value })} className="min-h-24" />
          </label>
          <label>
            <FieldLabel>闂傚倷绀侀崥瀣ｉ幒鎾变粓闁归棿绀侀崙鐘绘煕閹伴潧鏋熼柣鎺戙偢閺屾盯鈥﹂幋婵囩亶缂?</FieldLabel>
            <Textarea value={value.pitfallsEn} onChange={(e) => onChange({ ...value, pitfallsEn: e.target.value })} className="min-h-24" />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>Prompt</FieldLabel>
            <Textarea value={value.prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} className="min-h-32" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>闂傚倷绀侀幉锟犳偡閿曞倹鍋嬫俊銈呭暟閻?</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
            婵犵數鍎戠徊钘壝洪敂鐐床闁稿瞼鍋為崑?          </Button>
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
  onUploadImage,
  uploadingImage,
  originalId,
  categories,
}: {
  open: boolean;
  value: CaseForm;
  onChange: (next: CaseForm) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  onUploadImage: (file: File) => void;
  uploadingImage: boolean;
  originalId?: number | null;
  categories: ContentCategory[];
}) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{originalId ? "缂傛牞绶鍫滅伐" : "閺傛澘顤冨鍫滅伐"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <FieldLabel>ID</FieldLabel>
            <Input value={value.id} onChange={(e) => onChange({ ...value, id: e.target.value })} placeholder="484" />
          </label>
          <label>
            <FieldLabel>闂傚倷鑳剁划顖炩€﹂崼銉ユ槬闁哄稁鍘奸悞?</FieldLabel>
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
            <FieldLabel>闂傚倷绀侀幖顐ょ矓閺夋嚚娲敇椤兘鍋?</FieldLabel>
            <Input value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>闂傚倷鐒﹂幃鍫曞磿鏉堛劍娅犻柤鎭掑劜濞?</FieldLabel>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                value={value.image}
                onChange={(e) => onChange({ ...value, image: e.target.value })}
                className="sm:flex-1"
                placeholder="/images/case_1710000000_xxx.jpg"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
                濠电偞鍨堕幐鎼佹晝閿濆洦顫?              </Button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) {
                    void onUploadImage(file);
                  }
                }}
              />
            </div>
          </label>
          <label>
            <FieldLabel>闂傚倷鐒﹂幃鍫曞磿鏉堛劍娅犻柤鎭掑劜濞呯娀鏌″搴′簼閻庢碍宀搁幃妤€鈽夊▍铏灴閿?</FieldLabel>
            <Input value={value.imageAlt} onChange={(e) => onChange({ ...value, imageAlt: e.target.value })} />
          </label>
          <label>
            <FieldLabel>闂傚倷绀侀幖顐λ囬銏犵？闁肩⒈鍓濇慨铏亜閺囨浜鹃悗娈垮枙缁瑥鐣烽崼鏇炵厸濠电姴鍊歌ⅷ</FieldLabel>
            <Input value={value.sourceLabel} onChange={(e) => onChange({ ...value, sourceLabel: e.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>闂傚倷绀侀幖顐λ囬銏犵？闁肩⒈鍓濇慨铏亜閺囨浜鹃梺鍝勭潤閸ャ劌鈧攱銇勯幒鍡椾壕婵?</FieldLabel>
            <Input value={value.sourceUrl} onChange={(e) => onChange({ ...value, sourceUrl: e.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>Github 闂傚倸鍊风粈浣规櫠娴犲纾婚柟鎹愬煐閺?</FieldLabel>
            <Input value={value.githubUrl} onChange={(e) => onChange({ ...value, githubUrl: e.target.value })} />
          </label>
          <label>
            <FieldLabel>闂傚倷绀侀幉锛勬暜閹烘嚦娑樷槈濮橆厼浠?</FieldLabel>
            <Select value={value.category} onValueChange={(next) => onChange({ ...value, category: next })}>
              <SelectTrigger><SelectValue placeholder="闂傚倸鍊风欢锟犲磻閸曨垁鍥箥椤旂懓浜炬慨妯稿劚婵倻鈧娲樺畝绋跨暦閸楃偐鏋庨柟鐑樼箖閽? /></SelectTrigger>
              <SelectContent>
                {categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.value}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label>
            <FieldLabel>闂傚倷娴囬～澶嬬娴犲绀夐煫鍥ㄦ尵閺?</FieldLabel>
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
            <FieldLabel>婵犵數鍋犻幓顏嗙礊閳ь剚绻涙径瀣鐎殿噮鍋婃俊鍫曞川椤忓懐鈧姊洪弬銉︽珔闁哥噥鍨伴埢?</FieldLabel>
            <Input type="number" value={value.usageCount} onChange={(e) => onChange({ ...value, usageCount: e.target.value })} />
          </label>
          <label>
            <FieldLabel>闂傚倷娴囬妴鈧柛瀣崌閺岀喖顢涘鍐炬毉濡炪們鍎查崹鍓佹崲濞戙垹骞㈤煫鍥ㄦ尭閳峰姊?</FieldLabel>
            <Input type="number" value={value.favoriteCount} onChange={(e) => onChange({ ...value, favoriteCount: e.target.value })} />
          </label>
          <label>
            <FieldLabel>婵犵绱曢崑娑㈩敄閸涱垪鍋撳☉鎺撴珚闁?</FieldLabel>
            <Textarea value={value.styles} onChange={(e) => onChange({ ...value, styles: e.target.value })} className="min-h-20" />
          </label>
          <label>
            <FieldLabel>闂傚倷绶氬缁樹繆閸ヮ剙纾块柕鍫濇噳閺?</FieldLabel>
            <Textarea value={value.scenes} onChange={(e) => onChange({ ...value, scenes: e.target.value })} className="min-h-20" />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>Prompt 闂傚倷鑳堕、濠冩叏閵堝鈧箓宕奸妷锝傚亾?</FieldLabel>
            <Input value={value.promptPreview} onChange={(e) => onChange({ ...value, promptPreview: e.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>闂備浇顕уù鐑藉箠閹捐瀚夋い鎺戝濮?Prompt</FieldLabel>
            <Textarea value={value.prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} className="min-h-32" />
          </label>
        </div>
        <div className="space-y-3">
          <div className="text-xs font-medium text-stone-500">婵犵妲呴崑鍛熆濡皷鍋撳鐓庣仸闁?</div>
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
              闂傚倷绀侀幖顐⑽涘Δ鍛９闁荤喐瀚堝☉銏犖у璺猴功閸婄偤姊洪崨濠冨瘷闁告劗鍋撳В?
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>闂傚倷绀侀幉锟犳偡閿曞倹鍋嬫俊銈呭暟閻?</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
            婵犵數鍎戠徊钘壝洪敂鐐床闁稿瞼鍋為崑?          </Button>
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
  const [uploadingCaseImage, setUploadingCaseImage] = useState(false);
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
      toast.error(error instanceof Error ? error.message : "闂傚倷绀侀幉鈥愁潖缂佹ɑ鍙忛柟顖ｇ亹瑜版帒鐐婃い鎺嗗亾缂佲偓閸愵喗鐓曟繛鎴濆船瀵箖鏌涢悢閿嬪枠闁哄备鍓濋幏鍛村传閸曞灚姣夐柣搴ゎ潐閹哥兘鎮為敃鈧銉╁礋椤掍胶绉跺銈嗗姂閸?);
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

  const uploadCaseImage = async (file: File) => {
    setUploadingCaseImage(true);
    try {
      const response = await uploadContentImage(file);
      setCaseForm((current) => ({ ...current, image: response.item.path }));
      toast.success("闂傚倷鐒﹂幃鍫曞磿鏉堛劍娅犻柤鎭掑劜濞呯娀鏌″畵顔艰嫰閺呯娀姊绘繝搴′航闁告﹢绠栭幃鐑藉箛椤?);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "婵犵數鍋為崹鍫曞箰閹间焦鏅濋柨婵嗘处椤洟鏌涢锝嗙闁绘劕锕弻娑㈠箻濡も偓閸犳岸寮抽浣虹瘈闁靛繆鈧啿濮哥紓渚囧枛婢т粙骞?);
    } finally {
      setUploadingCaseImage(false);
    }
  };

  const saveCategory = async () => {
    setSavingCategory(true);
    try {
      await saveContentCategory(buildCategoryPayload(categoryForm), editingCategoryValue || undefined);
      toast.success("闂傚倷绀侀幉锛勬暜閹烘嚦娑樷槈濮橆厼浠忓銈嗗姂閸╁嫰宕崨瀛橆棅妞ゆ劦鍋勯獮妯肩磼閻樿京鐭欓柟?);
      setCategoryDialogOpen(false);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "婵犵數鍎戠徊钘壝洪敂鐐床闁稿瞼鍋為崑銈夋煏婵炵偓娅呯紒鈧崱娑欑厱闁斥晛鍟伴幊鍡樸亜椤愵剛鐣辨い顓炴健楠炲棝骞嶉鍓у嫎闂?);
    } finally {
      setSavingCategory(false);
    }
  };

  const saveTemplate = async () => {
    setSavingTemplate(true);
    try {
      await saveContentTemplate(buildTemplatePayload(templateForm), editingTemplateId || undefined);
      toast.success("濠电姷顣藉Σ鍛村垂椤忓牆绀堟繝闈涙－閻斿棙淇婇娆掝劅闁哥喎鎳樺Λ鍛搭敃椤愩垹绠荤紓浣哄С缁瑩骞?);
      setTemplateDialogOpen(false);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "婵犵數鍎戠徊钘壝洪敂鐐床闁稿瞼鍋為崑銈夋煏婵炲灝鍓婚柣鏃傚帶閻掓椽鏌涢幇銊︽珖闁告垟鍓濈换婵嬪閳ュ啿濮哥紓渚囧枛婢т粙骞?);
    } finally {
      setSavingTemplate(false);
    }
  };

  const saveCase = async () => {
    setSavingCase(true);
    try {
      await saveContentCase(buildCasePayload(caseForm), editingCaseId || undefined);
      toast.success("濠电姷顣介崜婵嬨€冮崨瀛樺亱闁告侗鍨遍浠嬫煏婢跺牆鍔撮柛鐔锋嚇濡懘顢曢銏犵缂備胶濮崇划娆撳箖?);
      setCaseDialogOpen(false);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "婵犵數鍎戠徊钘壝洪敂鐐床闁稿瞼鍋為崑銈夋煏婵炲灝鍔存繛瀛樼墵閺屾盯顢曢敐鍥╃厒婵炴潙鍚嬮崝鏇⑩€﹂崸妤€绠氶柟娈垮枤缂堥亶鏌?);
    } finally {
      setSavingCase(false);
    }
  };

  const removeCategory = async (value: string) => {
    if (!confirm(`闂傚倷绀侀幉锛勬暜閻愬绠鹃柍褜鍓氱换娑㈠川椤撱垹寮伴悗瑙勬礃瀹€绋跨暦閸楃偐鏋庨柟鐑樼箖閽?${value}闂傚倷鐒︾€笛呯矙閹捐绀?) return;
    setDeletingCategory(value);
    try {
      await deleteContentCategory(value);
      toast.success("闂傚倷绀侀幉锛勬暜閹烘嚦娑樷槈濮橆厼浠忓銈嗗姂閸╁嫰宕崨瀛樼厵缂備焦锚缁楁帡鏌ｈ箛濠冩珚婵?);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "闂傚倷绀侀幉锛勬暜閻愬绠鹃柍褜鍓氱换娑㈠川椤撱垹寮伴悗瑙勬礃瀹€绋跨暦閸楃偐鏋庨柟鐑樼箖閽戝鈹戦悩顔肩仾闁稿氦鍋愰崚鎺楀礈瑜庨崰?);
    } finally {
      setDeletingCategory(null);
    }
  };

  const removeTemplate = async (id: string) => {
    if (!confirm(`闂傚倷绀侀幉锛勬暜閻愬绠鹃柍褜鍓氱换娑㈠川椤撱埄鈧鎽堕敐澶嬬厓闁宠桨绀侀弳鐐电磼?${id}闂傚倷鐒︾€笛呯矙閹捐绀?) return;
    setDeletingTemplate(id);
    try {
      await deleteContentTemplate(id);
      toast.success("濠电姷顣藉Σ鍛村垂椤忓牆绀堟繝闈涙－閻斿棙淇婇娆掝劅闁哥喎鎳橀弻鐔虹磼濡櫣鐟ㄩ梺璇茬箚閺呯姴顫?);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "闂傚倷绀侀幉锛勬暜閻愬绠鹃柍褜鍓氱换娑㈠川椤撱埄鈧鎽堕敐澶嬬厓闁宠桨绀侀弳鐐电磼閼搁潧绲绘い顓炴健楠炲棝骞嶉鍓у嫎闂?);
    } finally {
      setDeletingTemplate(null);
    }
  };

  const removeCase = async (id: number) => {
    if (!confirm(`闂傚倷绀侀幉锛勬暜閻愬绠鹃柍褜鍓氱换娑㈠川椤撱埄鈧銇勯埡浣靛仮鐎规洜鍘ч…銊╁川椤掑倻鐓?${id}闂傚倷鐒︾€笛呯矙閹捐绀?) return;
    setDeletingCase(id);
    try {
      await deleteContentCase(id);
      toast.success("濠电姷顣介崜婵嬨€冮崨瀛樺亱闁告侗鍨遍浠嬫煏婢跺牆鍔撮柛鐔锋嚇閺岀喓绱掑Ο铏圭懆闂佽绻嗛弲鐘差潖?);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "闂傚倷绀侀幉锛勬暜閻愬绠鹃柍褜鍓氱换娑㈠川椤撱埄鈧銇勯埡浣靛仮鐎规洜鍘ч…銊╁川椤掑倻鐓戞繝鐢靛О閸ㄦ椽宕曢懖鈺佸灊闁告挆鍕瀭?);
    } finally {
      setDeletingCase(null);
    }
  };

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: "cases", label: "濠电姷顣介崜婵嬨€冮崨瀛樺亱闁告侗鍨遍?, count: cases.length },
    { key: "templates", label: "濠电姷顣藉Σ鍛村垂椤忓牆绀堟繝闈涙－閻?, count: templates.length },
    { key: "categories", label: "闂傚倷绀侀幉锛勬暜閹烘嚦娑樷槈濮橆厼浠?, count: categories.length },
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
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950">闂傚倷绀侀幉锟犲礉閺囥垹绠犻幖鎼厛閺佸﹪鏌熼柇锕€鏋ゅ☉鎾崇Ч閺屻劌鈽夊Ο渚痪闂?</h1>
          <div className="text-sm text-stone-500">闂傚倷绀侀幉锛勬暜閹烘嚦娑樷槈濮橆厼浠忓銈嗗姧缁犳垼绻氬┑鐐舵彧缂嶄胶妲愰敂鐣岀懝闁逞屽墮椤曪綁宕滄担鐟版櫝闂侀潧鐗嗛崐鍛婄閹灐褰掓晲閸偄娈愰梺琛″亾闁告劕鐪伴埀顒佸笒椤繈顢楁径濠傚缂傚倷绶￠崰姘跺磿閵堝洨鐭欏鑸靛姇閻掑灚銇勯幒鎴濃偓缁樼▔瀹ュ鐓ユ繛鎴灻顏堟煕婵犲嫬浠遍柡灞诲妼閳藉螣閸噮浼冮梻浣藉瀹曠敻宕伴弽褏鏆﹂柕澹倹鍕冪紓鍌欓檷閸ㄨ淇婇柆宥嗏拺闁革富鍘剧敮娑㈡煕閺冣偓鐢偛鈻庨姀銈呭瀭妞ゆ劑鍨荤粣鐐烘⒑閸濆嫮鈻夐柛妯恒偢瀹?API闂?</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadAll()}>
            {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
            闂傚倷绀侀幉锛勬暜閿熺姴缁╅梺顒€绉撮拑?          </Button>
          <Button onClick={openNewCase}><CirclePlus className="size-4" />闂傚倷绀侀幖顐﹀磹閻熼偊鐔嗘慨妞诲亾鐠侯垶鏌涢幇鐢靛帥婵炲瓨鐗犻弻娑㈩敃閿濆洨鐓傛繛?</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <OverviewCard label="闂傚倷绀侀幉锛勬暜閹烘嚦娑樷槈濮橆厼浠? value={overview?.categories ?? 0} icon={<Layers3 className="size-5" />} />
        <OverviewCard label="濠电姷顣藉Σ鍛村垂椤忓牆绀堟繝闈涙－閻? value={overview?.templates ?? 0} icon={<FileText className="size-5" />} />
        <OverviewCard label="濠电姷顣介崜婵嬨€冮崨瀛樺亱闁告侗鍨遍? value={overview?.cases ?? 0} icon={<ImageIcon className="size-5" />} />
        <OverviewCard label="闂佽娴烽幊鎾诲箟闄囬妵鎰板礃椤撴粈姹楅梺绋挎湰缁秹寮? value={overview?.publishedCases ?? 0} icon={<Sparkles className="size-5" />} />
        <OverviewCard label="闂傚倷绀侀幖顐ょ矓閺夋嚚娲Ω閳哄﹥鏅? value={overview?.styleTags ?? 0} icon={<Tag className="size-5" />} />
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
            title="闂傚倷绀侀幉锛勬暜閹烘嚦娑樷槈濮橆厼浠?
            description="缂傚倸鍊烽懗鑸靛垔鐎靛憡顫曢柡鍥ュ灩缁犳牕鈹戦悩鍙夋悙缂佲偓閸℃稒鐓曢柍鈺佸暟閹冲棙銇勯顒傜暤闁哄矉缍佹俊鎼佸Ψ閵夘喕鎮ｉ梻浣芥〃缁讹繝宕板Δ鍐煓濠㈣埖鍔曢悞鍨亜閹烘垵顏╃痪鎯ф贡缁辨帒螖閸曗斁鍋撻埀顒勬煕鐎ｎ偅灏伴柟宄版嚇瀹曠兘顢橀悙鍏哥礃婵犵妲呴崑鍡樻櫠濡ゅ嫬缍橀梻渚€鈧偛鑻崢鎼佹煟閹虹偟鐣辨い鏇秮楠炴劖鎯旈～顓熷攭闂備礁鎼ˇ鎵偓绗涘應鍋撳顓犲弨闁诡喗顨嗛幏鍛村礃椤垶顥嶉梻浣虹《閺呮盯骞婂鈧濠氬Ω閵夘喗鍍甸梺鍛婎殘閸嬫﹢宕犻弽顓熲拺?
            action={<Button onClick={openNewCategory}><Plus className="size-4" />闂傚倷绀侀幖顐﹀磹閻熼偊鐔嗘慨妞诲亾鐠侯垶鏌涢幇闈涙灈缂佲偓閸℃稒鐓曢柍鈺佸暟閹冲棙銇?</Button>}
          />
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-5 py-3">Value</th>
                    <th className="px-5 py-3">闂傚倷绀侀幖顐ょ矓閺夋嚚娲敇椤兘鍋?</th>
                    <th className="px-5 py-3">闂傚倷鑳堕、濠囶敋瑜忛幑銏犖旈崨顓㈠敹?</th>
                    <th className="px-5 py-3">Anchor</th>
                    <th className="px-5 py-3">濠电姷顣藉Σ鍛村垂椤忓牆绀堟繝闈涙－閻斿棙鎱ㄥ璇蹭壕闂佸搫琚崝宀勶綖濠靛纭€闁绘劖婢樼€?</th>
                    <th className="px-5 py-3">闂傚倷绀佸﹢閬嶅磿閵堝洦鏆滈柟鐑樻婵?</th>
                    <th className="px-5 py-3">闂傚倷鑳堕幊鎾绘倶濠靛牏鐭撶€规洖娲ㄧ粈?</th>
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
                          <Button variant="outline" size="sm" onClick={() => openEditCategory(item)}><Pencil className="size-4" />缂傚倸鍊搁崐鎼佸磹瑜版帗鍋嬮柣鎰仛椤?</Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-rose-200 text-rose-600 hover:bg-rose-50"
                            onClick={() => void removeCategory(item.value)}
                            disabled={deletingCategory === item.value}
                          >
                            {deletingCategory === item.value ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            闂傚倷绀侀幉锛勬暜閻愬绠鹃柍褜鍓氱换?                          </Button>
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
            title="濠电姷顣藉Σ鍛村垂椤忓牆绀堟繝闈涙－閻?
            description="闂傚倷娴囬妴鈧柛瀣尰閵囧嫰寮介妸褉妲堥梺浼欏瘜閸ｏ綁寮婚悢鐓庣闁兼祴鏅濋悡鍌炴⒑缁嬭儻顫﹂柛鏃€鍨舵穱濠勨偓娑櫳戞刊鎾煟閻旂顥嬫俊顖氭濮婃椽宕ㄦ繝鍌滅懆濠碘槅鍋呯粙鎾诲箖椤曗偓椤㈡洟濡堕崶顑芥敽婵犵數鍋為崹鐔煎箠閸ヮ剙纾婚柟鐐綑缁剁偞绻涢幋鐐寸殤妞わ富鍠楃换娑氣偓鐢殿焾琚ㄩ梺绋块瀹曨剟顢氶敐鍡╂Ч閹艰揪绲块敍婵嬫⒑閸濆嫮鈻夐柛鎾寸〒閺侇噣宕卞☉娆戝幍缂傚倷鐒﹂敋濠殿喖顦甸弻鏇㈠炊閵婏妇娈ら梺褰掝棑婵挳顢樻總绋跨闁挎繂鎳嶆竟鏇熺箾鏉堝墽鍒版繝鈧柆宥呭瀭闁兼祴鏅濈壕鍏肩箾閹寸偟鎳冮柛鏂诲€濋弻鐔兼煥鐎ｎ偆鍑″銈傛櫅閵堢鐣烽悡搴叆闁告侗鍓涢惌妤呮煟鎼淬埄鍟忛柛鐘愁殔鐓ゆ繝濠傜墕閺嬩線鏌曢崼婵愭Ц鏉?
            action={<Button onClick={openNewTemplate}><Plus className="size-4" />闂傚倷绀侀幖顐﹀磹閻熼偊鐔嗘慨妞诲亾鐠侯垶鏌涢幇鈺佸闁绘梻鍘ч悞娲煕閹般劍娅囬柛?</Button>}
          />
          <div className="flex flex-wrap gap-2 border-b border-stone-100 px-5 py-4">
            <div className="flex min-w-72 flex-1 items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3">
              <Search className="size-4 text-stone-400" />
              <Input value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} placeholder="闂傚倷鑳堕幊鎾诲触鐎ｎ剙鍨濋幖娣妼绾惧ジ鏌曟繛鍨壔闁绘梻鍘ч悞娲煕閹般劍娅囬柛?ID闂傚倷绶氬褍螞閺冨牊鍊块柨鏇炲€归崑澶愭煥濠靛棙锛旂紒鎲嬬稻娣囧﹪顢涘鍛偓濠囨煕鐎ｎ偅灏伴柟宄版噽缁數鈧綆浜濋鍡涙⒒? className="border-0 px-0 shadow-none focus-visible:ring-0" />
            </div>
            <Select value={templateCategoryFilter || "__all__"} onValueChange={(next) => setTemplateCategoryFilter(next === "__all__" ? "" : next)}>
              <SelectTrigger className="w-56"><SelectValue placeholder="闂傚倷鑳堕…鍫㈡崲閸儱绀夐柟杈剧畱绾惧潡鏌熺紒銏犳灈缂佲偓閸℃稒鐓曢柍鈺佸暟閹冲棙銇? /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">闂傚倷鑳堕…鍫㈡崲閸儱绀夐柟杈剧畱绾惧潡鏌熺紒銏犳灈缂佲偓閸℃稒鐓曢柍鈺佸暟閹冲棙銇?</SelectItem>
                {categoryOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setTemplateSearch(""); setTemplateCategoryFilter(""); }}>
              <Filter className="size-4" />濠电姷鏁搁崑鐐哄箰閹间礁绠犻柟鐗堟緲閻?            </Button>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">闂傚倷绀侀幖顐ょ矓閺夋嚚娲敇椤兘鍋?</th>
                    <th className="px-5 py-3">闂傚倷绀侀幉锛勬暜閹烘嚦娑樷槈濮橆厼浠?</th>
                    <th className="px-5 py-3">闂傚倷绀侀幖顐ょ矓閺夋嚚娲Ω閳哄﹥鏅?</th>
                    <th className="px-5 py-3">濠电姷顣介崜婵嬨€冮崨瀛樺亱闁告侗鍨遍?</th>
                    <th className="px-5 py-3">闂傚倷绀佸﹢閬嶅磿閵堝洦鏆滈柟鐑樻婵?</th>
                    <th className="px-5 py-3">闂傚倷鑳堕幊鎾绘倶濠靛牏鐭撶€规洖娲ㄧ粈?</th>
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
                          <Button variant="outline" size="sm" onClick={() => openEditTemplate(item)}><Pencil className="size-4" />缂傚倸鍊搁崐鎼佸磹瑜版帗鍋嬮柣鎰仛椤?</Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-rose-200 text-rose-600 hover:bg-rose-50"
                            onClick={() => void removeTemplate(item.id)}
                            disabled={deletingTemplate === item.id}
                          >
                            {deletingTemplate === item.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            闂傚倷绀侀幉锛勬暜閻愬绠鹃柍褜鍓氱换?                          </Button>
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
            title="濠电姷顣介崜婵嬨€冮崨瀛樺亱闁告侗鍨遍?
            description="闂傚倷娴囬妴鈧柛瀣尰閵囧嫰寮介妸褉妲堥梺浼欏瘜閸ｏ綁寮婚悢铏圭煓婵炲棛鍋撶瑧闂備焦鎮堕崝灞矫归悜鑺ュ仏闁诡垼鐏濊瀹曞爼鏁愰崨顒€顥氬┑鐐舵彧缁蹭粙骞栭銈囨噮闂傚倷娴囬鏍礂濞戞氨鐭嗗〒姘ｅ亾妤犵偛绻戠€靛ジ寮堕幋鐙€妲梻浣筋潐閸庡吋鎱ㄩ妶澶婃辈婵炴垯鍨洪崐鍨箾閹寸偟鎳愭繛鍫熸礋閺岀喖顢欓懖鈺嬬礊濠碘€冲级閸旀瑩鏁愰悙渚晩闁告挆灞拘ュ┑掳鍊楁慨鐑藉磻閻樻祴鏋栨繛鎴炲殠娴滃綊鏌＄仦璇插姕闁稿骸閰ｉ幃妤€鈽夊▍顓т簼瀵板嫬顓奸崶鈺冿紳闂佺鏈粙鎾存櫠瀹曞洨纾煎Λ鐗堢箓娴滄壆鈧娲栭悥鐓庣暦濠婂棭妲诲銈忕到椤兘寮婚弴銏犲耿闁哄浄绱曢妶纾杘mpt闂傚倷绶氬褍螞閺冨牊鍤勯柛顐ｆ礀绾惧潡鎮峰▎蹇擃仾闁稿海鍠栭弻銊╁籍閸ャ劎銆婇梺鑽ゅ枂閸ㄤ粙寮婚敓鐘茬劦妞ゆ帒瀚粻姘舵煟濡も偓閻楁粌螞韫囨稒鈷戦弶鐐靛缁佷即鏌涢埡浣瑰枠闁糕斁鍋?
            action={<Button onClick={openNewCase}><Plus className="size-4" />闂傚倷绀侀幖顐﹀磹閻熼偊鐔嗘慨妞诲亾鐠侯垶鏌涢幇鐢靛帥婵炲瓨鐗犻弻娑㈩敃閿濆洨鐓傛繛?</Button>}
          />
          <div className="grid gap-3 border-b border-stone-100 px-5 py-4 lg:grid-cols-4">
            <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3">
              <Search className="size-4 text-stone-400" />
              <Input value={caseSearch} onChange={(e) => setCaseSearch(e.target.value)} placeholder="闂傚倷鑳堕幊鎾诲触鐎ｎ剙鍨濋幖娣妼绾惧ジ鏌曟繛鐐珔闁告劏鍋撻梻浣规偠閸庢椽宕滈敃鍌氭辈妞ゆ牜鍋為悡蹇涙煕閳╁啯绀夌紒浣侯棝ompt闂傚倷绶氬褍螞閺冨牊鍊块柨鏇楀亾妞ゎ厼娲Λ鍐ㄢ槈閹烘挻鏆? className="border-0 px-0 shadow-none focus-visible:ring-0" />
            </div>
            <Select value={caseCategoryFilter || "__all__"} onValueChange={(next) => setCaseCategoryFilter(next === "__all__" ? "" : next)}>
              <SelectTrigger><SelectValue placeholder="闂傚倷鑳堕…鍫㈡崲閸儱绀夐柟杈剧畱绾惧潡鏌熺紒銏犳灈缂佲偓閸℃稒鐓曢柍鈺佸暟閹冲棙銇? /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">闂傚倷鑳堕…鍫㈡崲閸儱绀夐柟杈剧畱绾惧潡鏌熺紒銏犳灈缂佲偓閸℃稒鐓曢柍鈺佸暟閹冲棙銇?</SelectItem>
                {categoryOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={caseStatusFilter || "__all__"} onValueChange={(next) => setCaseStatusFilter(next === "__all__" ? "" : next)}>
              <SelectTrigger><SelectValue placeholder="闂傚倷鑳堕…鍫㈡崲閸儱绀夐柟杈剧畱绾惧潡鏌熺紒銏犳灍闁稿鍔欓弻銈夊传閵夘喗姣岄梺? /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">闂傚倷鑳堕…鍫㈡崲閸儱绀夐柟杈剧畱绾惧潡鏌熺紒銏犳灍闁稿鍔欓弻銈夊传閵夘喗姣岄梺?</SelectItem>
                <SelectItem value="published">published</SelectItem>
                <SelectItem value="draft">draft</SelectItem>
                <SelectItem value="archived">archived</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setCaseSearch(""); setCaseCategoryFilter(""); setCaseStatusFilter(""); }}>
              <Filter className="size-4" />濠电姷鏁搁崑鐐哄箰閹间礁绠犻柟鐗堟緲閻?            </Button>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] text-sm">
                <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-5 py-3">婵犵妲呴崑鍛熆濡皷鍋撳鐓庣仸闁?</th>
                    <th className="px-5 py-3">闂傚倷绀侀幖顐ょ矓閺夋嚚娲敇椤兘鍋?</th>
                    <th className="px-5 py-3">闂傚倷绀侀幉锛勬暜閹烘嚦娑樷槈濮橆厼浠?</th>
                    <th className="px-5 py-3">闂傚倷鑳剁划顖炩€﹂崼銉ユ槬闁哄稁鍘奸悞?</th>
                    <th className="px-5 py-3">闂傚倷绀佸﹢閬嶁€﹂崼婢濇椽鏁冮崒娑樹函?</th>
                    <th className="px-5 py-3">闂傚倷绀侀幖顐ょ矓閺夋嚚娲Ω閳哄﹥鏅?</th>
                    <th className="px-5 py-3">闂傚倷鑳堕幊鎾绘倶濠靛牏鐭撶€规洖娲ㄧ粈?</th>
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
                        <div className="mt-2 text-xs text-stone-400">{item.sourceLabel || "-"} 闂?{item.sourceUrl || "-"}</div>
                      </td>
                      <td className="px-5 py-4 text-stone-500">{item.category || "-"}</td>
                      <td className="px-5 py-4">
                        <Badge variant={item.status === "published" ? "success" : item.status === "draft" ? "warning" : "outline"}>{item.status}</Badge>
                        {item.featured ? <Badge variant="violet" className="ml-2">闂傚倷娴囬～澶嬬娴犲绀夐煫鍥ㄦ尵閺?</Badge> : null}
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
                          <Button variant="outline" size="sm" onClick={() => openEditCase(item)}><Pencil className="size-4" />缂傚倸鍊搁崐鎼佸磹瑜版帗鍋嬮柣鎰仛椤?</Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-rose-200 text-rose-600 hover:bg-rose-50"
                            onClick={() => void removeCase(item.id)}
                            disabled={deletingCase === item.id}
                          >
                            {deletingCase === item.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            闂傚倷绀侀幉锛勬暜閻愬绠鹃柍褜鍓氱换?                          </Button>
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
        onUploadImage={(file) => void uploadCaseImage(file)}
        uploadingImage={uploadingCaseImage}
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
