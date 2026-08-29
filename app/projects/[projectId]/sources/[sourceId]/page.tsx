"use client";

import { useStudio } from "@/core/store";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SectionHeader, StatusPill } from "@/core/ui/OpsField";

export default function SourceDetailPage() {
  const params = useParams<{ projectId: string; sourceId: string }>();
  const { getSource, ops } = useStudio();
  const source = getSource(params.sourceId);

  if (!source) {
    return (
      <main className="px-6 py-8">
        <Link href={`/projects/${params.projectId}/sources`} className="text-xs uppercase opacity-50">← Sources</Link>
        <p className="mt-6">Source not found.</p>
      </main>
    );
  }

  const relatedDecisions = ops.decisions.filter((d) => source.relatedDecisionIds.includes(d.id));

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <Link href={`/projects/${params.projectId}/sources`} className="text-xs uppercase opacity-50">← Sources</Link>
      <SectionHeader title={source.title} />
      <div className="mb-6 flex flex-wrap gap-2">
        <StatusPill>{source.category.replace("_", " ")}</StatusPill>
        <StatusPill>{source.sourceType.replace("_", " ")}</StatusPill>
        <StatusPill>{source.priority}</StatusPill>
        <StatusPill>{source.status}</StatusPill>
        {source.isSourceOfTruth ? <StatusPill color="#7ecba8">Source of truth</StatusPill> : null}
      </div>

      {source.description ? (
        <section className="mb-6">
          <h3 className="text-[10px] uppercase opacity-45">Description</h3>
          <p className="mt-2 text-sm whitespace-pre-wrap">{source.description}</p>
        </section>
      ) : null}

      {source.url ? (
        <a href={source.url} target="_blank" rel="noreferrer" className="text-sm text-[#7ecba8]">{source.url}</a>
      ) : null}

      {source.fileName ? (
        <p className="mt-2 text-sm opacity-50">File: {source.fileName} ({source.fileMime})</p>
      ) : null}

      {source.content ? (
        <section className="mt-6 border border-white/10 p-4">
          <h3 className="text-[10px] uppercase opacity-45">Content</h3>
          <pre className="mt-2 whitespace-pre-wrap text-sm opacity-80">{source.content}</pre>
        </section>
      ) : null}

      {source.extractedText ? (
        <section className="mt-6 border border-white/10 p-4">
          <h3 className="text-[10px] uppercase opacity-45">Searchable text</h3>
          <p className="mt-2 text-sm opacity-70">{source.extractedText.slice(0, 500)}…</p>
        </section>
      ) : null}

      {source.notes ? (
        <section className="mt-6">
          <h3 className="text-[10px] uppercase opacity-45">Notes</h3>
          <p className="mt-2 text-sm">{source.notes}</p>
        </section>
      ) : null}

      {relatedDecisions.length ? (
        <section className="mt-8">
          <h3 className="text-[10px] uppercase opacity-45">Related decisions</h3>
          <ul className="mt-2 space-y-2">
            {relatedDecisions.map((d) => (
              <li key={d.id} className="text-sm">{d.decision}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 text-xs opacity-30">Added {new Date(source.dateAdded).toLocaleDateString()}</p>
    </main>
  );
}
