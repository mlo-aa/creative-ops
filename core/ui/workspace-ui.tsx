"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

const ACCENT = "var(--project-accent,#e4e0d4)";
const FOCUS_RING = `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[${ACCENT}]`;

export function NavGroupSeparator() {
  return <span className="mx-1 hidden h-4 w-px bg-white/10 md:inline-block" aria-hidden />;
}

export function InspectorTabBar<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex gap-1 border-b border-white/10 pb-2">
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-[13px] transition ${FOCUS_RING}`}
            style={{
              opacity: selected ? 1 : 0.5,
              background: selected ? "rgba(255,255,255,0.08)" : "transparent",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function InspectorPanel({
  id,
  labelledBy,
  hidden,
  children,
}: {
  id: string;
  labelledBy: string;
  hidden?: boolean;
  children: ReactNode;
}) {
  if (hidden) return null;
  return (
    <div role="tabpanel" id={id} aria-labelledby={labelledBy} className="space-y-4 pt-3">
      {children}
    </div>
  );
}

export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <section className="border-t border-white/8 pt-4 first:border-t-0 first:pt-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left ${FOCUS_RING}`}
      >
        <span className="text-[15px] font-medium text-white/85">{title}</span>
        <span className="text-sm opacity-40">{open ? "−" : "+"}</span>
      </button>
      {!open && summary ? <div className="mt-1.5 text-[13px] opacity-45">{summary}</div> : null}
      {open ? (
        <div id={contentId} className="mt-3 space-y-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function DropdownMenu({
  trigger,
  label,
  align = "right",
  children,
}: {
  trigger: ReactNode;
  label: string;
  align?: "left" | "right";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`rounded-lg ${FOCUS_RING}`}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={`absolute z-50 mt-1 min-w-[220px] rounded-xl border border-white/10 bg-[#1b1c1f] py-1.5 shadow-2xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({
  onClick,
  disabled,
  destructive,
  title,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] focus-visible:bg-white/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
        destructive ? "text-red-300" : "text-white/85 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

export function MenuDivider() {
  return <div role="separator" className="my-1 border-t border-white/10" />;
}

export function MenuHeading({ children }: { children: ReactNode }) {
  return <p className="px-3 py-1.5 text-[11px] text-white/35">{children}</p>;
}

export function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-xs opacity-70 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30 ${FOCUS_RING}`}
    >
      {children}
    </button>
  );
}

export function SceneActionsMenu({
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  canDelete,
}: {
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
}) {
  return (
    <DropdownMenu
      label="Scene actions"
      trigger={
        <span className="inline-flex h-9 items-center rounded-lg border border-white/15 px-2.5 text-[13px] opacity-60">
          ···
        </span>
      }
    >
      <MenuItem onClick={onDuplicate}>Duplicate scene</MenuItem>
      <MenuItem onClick={onMoveUp} disabled={!canMoveUp}>
        Move up
      </MenuItem>
      <MenuItem onClick={onMoveDown} disabled={!canMoveDown}>
        Move down
      </MenuItem>
      <MenuDivider />
      <MenuItem onClick={onDelete} disabled={!canDelete} destructive>
        Delete scene
      </MenuItem>
    </DropdownMenu>
  );
}

export function SubNav({
  projectId,
  items,
  pathname,
}: {
  projectId: string;
  items: { href: string; label: string }[];
  pathname: string;
}) {
  if (items.length <= 1) return null;
  return (
    <nav aria-label="Section" className="mx-auto mt-2 flex max-w-[1400px] flex-wrap gap-4 border-t border-white/8 pt-2.5">
      {items.map((item) => {
        const href = `/projects/${projectId}/${item.href}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={item.href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md text-[13px] ${FOCUS_RING}`}
            style={{ opacity: active ? 0.95 : 0.4 }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function StatusDot({ status }: { status: "ready" | "missing" | "stale" | "unavailable" }) {
  const colors = {
    ready: "#8fbf8a",
    missing: "rgba(255,255,255,0.25)",
    stale: "#e6b84d",
    unavailable: "rgba(255,255,255,0.2)",
  };
  const labels = {
    ready: "Ready",
    missing: "Not generated",
    stale: "Stale — regenerate",
    unavailable: "Unavailable",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] opacity-60">
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: colors[status] }} aria-hidden />
      {labels[status]}
    </span>
  );
}
