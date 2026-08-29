"use client";

import { CORE_TEMPLATE_LIST } from "@/core/templates/coreTemplates";
import { useProject } from "@/core/project/context";
import { OFFERHUB_TEMPLATE_LIST } from "@/projects/offerhub/templates";

export default function TemplatesPage() {
  const project = useProject();
  const projectTemplates =
    project.id === "senda"
      ? [
          { id: "product-value", name: "Product value (Senda fragment)" },
          { id: "path-graphics", name: "Path graphics" },
        ]
      : project.id === "offerhub"
        ? OFFERHUB_TEMPLATE_LIST
        : [];

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl tracking-[-0.03em]">Templates</h1>
      <p className="mt-2 max-w-xl text-sm opacity-55">
        Core templates define layout. Brand colors, fonts and logos come from the active project.
      </p>
      <h2 className="mt-10 text-xs tracking-[0.16em] uppercase opacity-50">Core</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {CORE_TEMPLATE_LIST.map((template) => (
          <li key={template.id} className="border border-white/10 px-4 py-3">
            <p>{template.name}</p>
            <p className="mt-1 text-[11px] tracking-[0.1em] uppercase opacity-45">{template.id}</p>
          </li>
        ))}
      </ul>
      <h2 className="mt-10 text-xs tracking-[0.16em] uppercase opacity-50">Project</h2>
      {projectTemplates.length ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {projectTemplates.map((item) => (
            <li key={item.id} className="border border-white/10 px-4 py-3">
              <p>{item.name}</p>
              <p className="mt-1 text-[11px] tracking-[0.1em] uppercase opacity-45">{item.id}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm opacity-45">This project uses core templates only.</p>
      )}
    </main>
  );
}
