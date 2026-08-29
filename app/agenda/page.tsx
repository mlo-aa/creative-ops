"use client";

import { useStudio } from "@/core/store";
import Link from "next/link";
import { useMemo, useState } from "react";
import { btnPrimary, inputClass, SectionHeader } from "@/core/ui/OpsField";

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function AgendaPage() {
  const { ops, addCalendarEvent } = useStudio();
  const [projectFilter, setProjectFilter] = useState("all");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const events = useMemo(() => {
    const all = [
      ...ops.calendarEvents,
      ...ops.contentItems.filter((c) => c.publicationDate).map((c) => ({
        id: `cnt-${c.id}`,
        projectId: c.projectId,
        title: c.title,
        type: "content" as const,
        date: c.publicationDate!,
        notes: "",
        createdAt: c.createdAt,
      })),
      ...ops.deliverables.filter((d) => d.deadline).map((d) => ({
        id: `del-${d.id}`,
        projectId: d.projectId,
        title: d.name,
        type: "deliverable" as const,
        date: d.deadline!,
        notes: "",
        createdAt: d.createdAt,
      })),
      ...ops.phases.filter((p) => p.startDate).map((p) => ({
        id: `ph-${p.id}`,
        projectId: p.projectId,
        title: p.name,
        type: "phase" as const,
        date: p.startDate!,
        endDate: p.endDate,
        notes: p.notes,
        createdAt: p.createdAt,
      })),
    ];
    return all.filter((e) => projectFilter === "all" || e.projectId === projectFilter);
  }, [ops, projectFilter]);

  const monthEvents = events.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const upcoming = events
    .filter((e) => new Date(e.date) >= now)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 14);

  const weekDays = useMemo(() => {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [now]);

  const [newEvent, setNewEvent] = useState({ title: "", date: "", projectId: "" });

  return (
    <>
      <SectionHeader title="Agenda Creativa" />
      <p className="-mt-4 mb-6 text-sm opacity-50">Events by project</p>

      <div className="mb-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setProjectFilter("all")} className="text-[10px] uppercase opacity-50">All</button>
        {ops.projects.map((p) => (
          <button key={p.id} type="button" onClick={() => setProjectFilter(p.id)} className="text-[10px] uppercase opacity-50">
            {p.name}
          </button>
        ))}
      </div>

      <div className="mb-8 flex gap-2 overflow-x-auto">
        {weekDays.map((d) => {
          const isToday = d.toDateString() === now.toDateString();
          return (
            <div
              key={d.toISOString()}
              className="min-w-[64px] border px-3 py-2 text-center"
              style={{ borderColor: isToday ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)" }}
            >
              <p className="text-[10px] uppercase opacity-40">{d.toLocaleDateString(undefined, { weekday: "short" })}</p>
              <p className="text-lg">{d.getDate()}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-8 flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            if (month === 0) {
              setYear((y) => y - 1);
              setMonth(11);
            } else {
              setMonth((m) => m - 1);
            }
          }}
          className="opacity-50"
        >
          ←
        </button>
        <h2 className="text-sm tracking-[0.08em] uppercase">
          {new Date(year, month).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h2>
        <button
          type="button"
          onClick={() => {
            if (month === 11) {
              setYear((y) => y + 1);
              setMonth(0);
            } else {
              setMonth((m) => m + 1);
            }
          }}
          className="opacity-50"
        >
          →
        </button>
      </div>

      <div className="mb-10 grid grid-cols-7 gap-1">
        {Array.from({ length: daysInMonth(year, month) }, (_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEvents = monthEvents.filter((e) => e.date.startsWith(dateStr));
          return (
            <div key={day} className="min-h-[80px] border border-white/5 p-1">
              <p className="text-[10px] opacity-40">{day}</p>
              {dayEvents.map((e) => {
                const op = ops.projects.find((p) => p.id === e.projectId);
                return (
                  <p
                    key={e.id}
                    className="mt-1 truncate rounded px-1 py-0.5 text-[9px]"
                    style={{ background: `${op?.color ?? "#6D758F"}33`, color: op?.color }}
                    title={e.title}
                  >
                    {e.title}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-xs tracking-[0.16em] uppercase opacity-45">Next 14 days</h2>
        <ul className="space-y-2">
          {upcoming.map((e) => {
            const op = ops.projects.find((p) => p.id === e.projectId);
            return (
              <li key={e.id} className="flex items-center gap-3 text-sm">
                <span className="h-2 w-2 rounded-full" style={{ background: op?.color }} />
                <span className="w-24 text-[10px] uppercase opacity-40">{e.date}</span>
                <span className="flex-1">{e.title}</span>
                {e.projectId ? (
                  <Link href={`/projects/${e.projectId}/content`} className="text-[10px] uppercase opacity-40">
                    {op?.name}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <form
        className="grid gap-3 border border-white/10 p-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          addCalendarEvent({
            title: newEvent.title,
            date: newEvent.date,
            projectId: newEvent.projectId || undefined,
            type: "custom",
            notes: "",
          });
          setNewEvent({ title: "", date: "", projectId: "" });
        }}
      >
        <input className={inputClass} placeholder="Event title" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} />
        <input type="date" className={inputClass} value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} />
        <select className={inputClass} value={newEvent.projectId} onChange={(e) => setNewEvent({ ...newEvent, projectId: e.target.value })}>
          <option value="">No project</option>
          {ops.projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button type="submit" className={`${btnPrimary} sm:col-span-3`}>New event</button>
      </form>
    </>
  );
}
