"use client";

import { useStudio } from "@/core/store";
import Link from "next/link";
import { useMemo, useState } from "react";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { projects, ops, allPosts } = useStudio();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const items: { label: string; href: string; group: string }[] = [];
    for (const p of ops.projects) {
      if (p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)) {
        items.push({ label: `${p.code} ${p.name}`, href: `/projects/${p.id}/overview`, group: "Projects" });
      }
    }
    for (const c of ops.clients) {
      if (c.name.toLowerCase().includes(query) || c.company.toLowerCase().includes(query)) {
        items.push({ label: c.name, href: `/clients`, group: "Clients" });
      }
    }
    for (const { project, post } of allPosts()) {
      if (post.title.toLowerCase().includes(query) || post.number.includes(query) || post.design.headline?.toLowerCase().includes(query)) {
        items.push({
          label: `${project.name} — ${post.number} ${post.title}`,
          href: `/projects/${project.id}/posts/${post.id}`,
          group: "Designs",
        });
      }
    }
    for (const s of ops.sources) {
      if (s.title.toLowerCase().includes(query) || s.description.toLowerCase().includes(query) || s.content.toLowerCase().includes(query) || s.extractedText.toLowerCase().includes(query)) {
        items.push({ label: s.title, href: `/projects/${s.projectId}/sources/${s.id}`, group: "Sources" });
      }
    }
    for (const r of ops.references) {
      if (r.title.toLowerCase().includes(query) || r.whatWeLike.toLowerCase().includes(query)) {
        items.push({ label: r.title, href: `/projects/${r.projectId}/references`, group: "References" });
      }
    }
    for (const d of ops.decisions) {
      if (d.decision.toLowerCase().includes(query) || d.rationale.toLowerCase().includes(query)) {
        items.push({ label: d.decision.slice(0, 60), href: `/projects/${d.projectId}/references`, group: "Decisions" });
      }
    }
    for (const k of Object.values(ops.knowledge)) {
      const text = [k.confirmedFacts, k.openQuestions, k.avoidDoNotUse, k.terminology].join(" ");
      if (text.toLowerCase().includes(query)) {
        items.push({ label: `Knowledge — ${k.projectId}`, href: `/projects/${k.projectId}/references`, group: "Knowledge" });
      }
    }
    for (const i of ops.inspirations) {
      if (i.title.toLowerCase().includes(query)) {
        items.push({ label: i.title, href: `/inspiration`, group: "Inspiration" });
      }
    }
    for (const idea of ops.ideas) {
      if (idea.title.toLowerCase().includes(query) || idea.body.toLowerCase().includes(query)) {
        items.push({
          label: idea.title,
          href: `/projects/${idea.projectId}/ideas`,
          group: "Ideas",
        });
      }
    }
    for (const l of ops.links) {
      if (l.title.toLowerCase().includes(query) || l.url.toLowerCase().includes(query)) {
        items.push({ label: l.title, href: `/projects/${l.projectId}/links`, group: "Links" });
      }
    }
    for (const d of ops.deliverables) {
      if (d.name.toLowerCase().includes(query)) {
        items.push({ label: d.name, href: `/projects/${d.projectId}/deliverables`, group: "Deliverables" });
      }
    }
    for (const c of ops.contentItems) {
      if (c.title.toLowerCase().includes(query) || c.caption.toLowerCase().includes(query)) {
        items.push({ label: c.title, href: `/projects/${c.projectId}/content`, group: "Content" });
      }
    }
    for (const p of ops.proposals) {
      if (p.title.toLowerCase().includes(query)) {
        items.push({ label: p.title, href: `/proposals`, group: "Proposals" });
      }
    }
    return items.slice(0, 16);
  }, [q, ops, allPosts, projects]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh]" onClick={onClose}>
      <div
        className="w-full max-w-lg border border-white/15 bg-[#171717] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search projects, sources, decisions, posts…"
          className="w-full border-b border-white/10 bg-transparent px-4 py-3 text-sm outline-none"
        />
        <ul className="max-h-72 overflow-auto py-2">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm opacity-40">Type to search project knowledge</li>
          ) : (
            results.map((item) => (
              <li key={`${item.group}-${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/5"
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] uppercase tracking-[0.12em] opacity-35">{item.group}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
