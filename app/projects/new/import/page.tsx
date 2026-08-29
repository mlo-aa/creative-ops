"use client";

import { useStudio } from "@/core/store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, inputClass } from "@/core/ui/OpsField";

export default function ImportProjectPage() {
  const { createOpsProject, addSource } = useStudio();
  const router = useRouter();
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [website, setWebsite] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");

  return (
    <main className="mx-auto max-w-xl py-4">
      <Link href="/projects/new" className="text-xs tracking-[0.14em] uppercase opacity-50">
        ← New project
      </Link>
      <h1 className="mt-6 text-3xl tracking-[-0.04em]" style={{ fontWeight: 500 }}>
        Import existing project
      </h1>
      <p className="mt-3 text-sm opacity-50">
        Organize supplied context into sources. No automatic inference — you enrich over time.
      </p>
      <form
        className="mt-10 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const id = createOpsProject({
            name: name || "Imported project",
            clientName: clientName || name,
            type: "other",
            types: ["other"],
            color: "#6D758F",
            status: "draft",
            intakeDraft: true,
          });
          const now = new Date().toISOString();
          if (website) {
            addSource({
              projectId: id,
              title: "Website",
              sourceType: "website",
              category: "website",
              url: website,
              fileData: "",
              fileName: "",
              fileMime: "",
              content: "",
              description: "Imported website URL",
              tags: ["import"],
              priority: "primary",
              status: "current",
              isSourceOfTruth: false,
              supersededBy: "",
              extractedText: "",
              notes: "",
              relatedDecisionIds: [],
              relatedContentIds: [],
              relatedDeliverableIds: [],
            });
          }
          if (repoUrl) {
            addSource({
              projectId: id,
              title: "Repository",
              sourceType: "github",
              category: "technical",
              url: repoUrl,
              fileData: "",
              fileName: "",
              fileMime: "",
              content: "",
              description: "Imported repository",
              tags: ["import"],
              priority: "important",
              status: "current",
              isSourceOfTruth: false,
              supersededBy: "",
              extractedText: "",
              notes: "",
              relatedDecisionIds: [],
              relatedContentIds: [],
              relatedDeliverableIds: [],
            });
          }
          if (socialInstagram) {
            addSource({
              projectId: id,
              title: "Instagram",
              sourceType: "social_profile",
              category: "campaign",
              url: socialInstagram,
              fileData: "",
              fileName: "",
              fileMime: "",
              content: "",
              description: "Imported social profile",
              tags: ["import", "social"],
              priority: "reference",
              status: "current",
              isSourceOfTruth: false,
              supersededBy: "",
              extractedText: "",
              notes: "",
              relatedDecisionIds: [],
              relatedContentIds: [],
              relatedDeliverableIds: [],
            });
          }
          if (notes) {
            addSource({
              projectId: id,
              title: "Import notes",
              sourceType: "notes",
              category: "other",
              url: "",
              fileData: "",
              fileName: "",
              fileMime: "",
              content: notes,
              description: "Notes provided at import",
              tags: ["import"],
              priority: "important",
              status: "current",
              isSourceOfTruth: false,
              supersededBy: "",
              extractedText: notes.slice(0, 2000),
              notes: "",
              relatedDecisionIds: [],
              relatedContentIds: [],
              relatedDeliverableIds: [],
            });
          }
          void now;
          router.push(`/projects/new/intake?projectId=${id}`);
        }}
      >
        <Field label="Project name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </Field>
        <Field label="Client / brand">
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Website URL">
          <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} placeholder="https://…" />
        </Field>
        <Field label="Repository URL">
          <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} className={inputClass} placeholder="https://github.com/…" />
        </Field>
        <Field label="Instagram URL / handle">
          <input value={socialInstagram} onChange={(e) => setSocialInstagram(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Notes / pasted context">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} rows={6} />
        </Field>
        <button type="submit" className={btnPrimary}>
          Import & continue intake
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] tracking-[0.14em] uppercase opacity-50">{label}</span>
      {children}
    </label>
  );
}
