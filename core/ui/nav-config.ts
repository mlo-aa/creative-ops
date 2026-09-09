export type NavItem = { href: string; label: string };

export type NavGroup = { id: string; label?: string; items: NavItem[] };

/**
 * Primary global navigation — kept intentionally short. Posts lives inside
 * each project now, and Clients/Proposals are hidden (not removed) for now.
 */
export const GLOBAL_NAV_GROUPS: NavGroup[] = [
  {
    id: "main",
    items: [
      { href: "/", label: "Home" },
      { href: "/projects", label: "Projects" },
      { href: "/agenda", label: "Agenda" },
      { href: "/ideas", label: "Idea Map" },
      { href: "/inspiration", label: "Inspiration" },
    ],
  },
];

export type ProjectSection = {
  slug: string;
  label: string;
  /** Legacy slug that should redirect to this section's canonical slug. */
  redirectTo?: string;
  /** Omit from section sub-nav (legacy alias only). */
  hideFromSubNav?: boolean;
};

export type ProjectTab = {
  href: string;
  label: string;
  sections: ProjectSection[];
};

/**
 * Top-level project navigation — reduced to Overview | Brand (Posts is
 * appended separately by the project layout). Strategy, Knowledge, Content
 * and Deliverables are no longer separate destinations: their content now
 * lives inside Overview via progressive disclosure. The routes themselves
 * still exist and still work — nothing here deletes data.
 */
export const PROJECT_WORKSPACE_TABS: ProjectTab[] = [
  {
    href: "overview",
    label: "Overview",
    sections: [{ slug: "overview", label: "Overview" }],
  },
  {
    href: "branding",
    label: "Brand",
    sections: [
      { slug: "branding", label: "Brand setup" },
      { slug: "brand", label: "Brand setup", redirectTo: "branding", hideFromSubNav: true },
    ],
  },
];

/** All workspace slugs that must resolve for backward compatibility. */
export const PROJECT_WORKSPACE_SLUGS = [
  "overview",
  "strategy",
  "phases",
  "branding",
  "brand",
  "sources",
  "links",
  "references",
  "content",
  "ideas",
  "deliverables",
] as const;

export type ProjectWorkspaceSlug = (typeof PROJECT_WORKSPACE_SLUGS)[number];

export const PROJECT_STUDIO_TABS: NavItem[] = [
  { href: "feed", label: "Feed" },
  { href: "posts", label: "Designs" },
  { href: "templates", label: "Templates" },
  { href: "assets", label: "Assets" },
  { href: "settings", label: "Settings" },
];

export const PROJECT_STUDIO_SLUGS = ["feed", "posts", "templates", "assets", "settings"] as const;

/** Legacy slugs that redirect to a canonical workspace route. */
export const PROJECT_LEGACY_REDIRECTS: Record<string, string> = {
  brand: "branding",
};

export function projectSectionSubNav(sections: ProjectSection[]): NavItem[] {
  return sections
    .filter((section) => !section.hideFromSubNav)
    .map((section) => ({
      href: section.slug,
      label: section.label,
    }));
}

export function activeProjectTab(pathname: string, projectId: string): ProjectTab | undefined {
  for (const tab of PROJECT_WORKSPACE_TABS) {
    for (const section of tab.sections) {
      const prefix = `/projects/${projectId}/${section.slug}`;
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return tab;
    }
  }
  return undefined;
}

export function isProjectStudioPath(pathname: string, projectId: string): boolean {
  if (pathname.includes("/posts/")) return true;
  return PROJECT_STUDIO_TABS.some((t) => {
    const prefix = `/projects/${projectId}/${t.href}`;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export function resolveLegacyProjectRedirect(pathname: string, projectId: string): string | null {
  const prefix = `/projects/${projectId}/`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const slug = rest.split("/")[0];
  if (!slug) return null;
  const target = PROJECT_LEGACY_REDIRECTS[slug];
  if (!target || target === slug) return null;
  const suffix = rest.slice(slug.length);
  return `${prefix}${target}${suffix}`;
}

export function projectTabForSlug(slug: string): ProjectTab | undefined {
  return PROJECT_WORKSPACE_TABS.find((tab) => tab.sections.some((section) => section.slug === slug));
}
