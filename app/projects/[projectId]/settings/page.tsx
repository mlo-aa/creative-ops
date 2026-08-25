"use client";

import { FORMAT_PRESETS } from "@/core/formats";
import { exportProjectPayload } from "@/core/store";
import { useProject } from "@/core/project/context";
import { useStudio } from "@/core/store";
import type { ProjectConfig } from "@/core/types";

export default function SettingsPage() {
  const project = useProject();
  const { updateSettings, resetProject, importProject } = useStudio();

  function download() {
    const blob = new Blob([exportProjectPayload(project)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.id}-project.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-8">
      <h1 className="text-2xl tracking-[-0.03em]">Settings</h1>
      <div className="mt-8 grid gap-5">
        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.12em] uppercase opacity-50">Project name</span>
          <input
            className={input}
            value={project.name}
            onChange={(e) => updateSettings(project.id, { name: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.12em] uppercase opacity-50">Export prefix</span>
          <input
            className={input}
            value={project.exportPrefix}
            onChange={(e) => updateSettings(project.id, { exportPrefix: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.12em] uppercase opacity-50">Format</span>
          <select
            className={input}
            value={project.formatId}
            onChange={(e) => updateSettings(project.id, { formatId: e.target.value })}
          >
            {FORMAT_PRESETS.map((format) => (
              <option key={format.id} value={format.id}>
                {format.name} · {format.width}×{format.height}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <button type="button" className={btn} onClick={download}>
          Export project
        </button>
        <label className={`${btn} cursor-pointer`}>
          Import project
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              const parsed = JSON.parse(text) as ProjectConfig;
              importProject(parsed);
              event.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          className={btn}
          onClick={() => {
            if (window.confirm("Reset this project’s studio changes?")) resetProject(project.id);
          }}
        >
          Reset project changes
        </button>
      </div>
    </main>
  );
}

const input = "w-full border border-white/15 bg-transparent px-3 py-2 text-sm";
const btn = "h-10 border border-white/20 px-4 text-[11px] tracking-[0.08em] uppercase";
