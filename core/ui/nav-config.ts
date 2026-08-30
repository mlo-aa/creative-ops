export type NavItem = { href: string; label: string };

export type NavGroup = { id: string; label?: string; items: NavItem[] };

/** Global app navigation — grouped for visual hierarchy, flat URLs unchanged. */
export const GLOBAL_NAV_GROUPS: NavGroup[] = [
  {
    id: "work",
    label: "Work",
    items: [
      { href: "/", label: "Home" },
      { href: "/projects", label: "Projects" },
      { href: "/posts", label: "Posts" },
    ],
  },
  {
    id: "planning",
    label: "Planning",
    items: [
      { href: "/agenda", label: "Agenda" },
      { href: "/ideas", label: "Idea Map" },
      { href: "/inspiration", label: "Inspiration" },
    ],
  },
  {
    id: "business",
    label: "Business",
    items: [
      { href: "/clients", label: "Clients" },
      { href: "/proposals", label: "Proposals" },
    ],
  },
];

export type ProjectTab = {
  href: string;
  label: string;
  /** Route slugs that belong to this section (first is default). */
  sections: string[];
};

/** Consolidated project workspace tabs (~6 primary areas). */
export const PROJECT_WORKSPACE_TABS: ProjectTab[] = [
  { href: "overview", label: "Overview", sections: ["overview"] },
  { href: "strategy", label: "Strategy", sections: ["strategy", "phases"] },
  { href: "branding", label: "Brand", sections: ["branding", "brand"] },
  { href: "sources", label: "Knowledge", sections: ["sources", "links", "references"] },
  { href: "content", label: "Content", sections: ["content", "ideas"] },
  { href: "deliverables", label: "Deliverables", sections: ["deliverables"] },
];

export const PROJECT_STUDIO_TABS: NavItem[] = [
  { href: "feed", label: "Feed" },
  { href: "posts", label: "Designs" },
  { href: "templates", label: "Templates" },
  { href: "assets", label: "Assets" },
  { href: "settings", label: "Settings" },
];

export function projectSectionSubNav(sectionSlugs: string[]): NavItem[] {
  const labels: Record<string, string> = {
    strategy: "Strategy",
    phases: "Phases",
    branding: "Brand setup",
    brand: "Brand setup",
    sources: "Sources",
    links: "Links",
    references: "References",
    content: "Content plan",
    ideas: "Ideas",
  };
  return sectionSlugs.map((slug) => ({
    href: slug,
    label: labels[slug] ?? slug,
  }));
}

export function activeProjectTab(pathname: string, projectId: string): ProjectTab | undefined {
  for (const tab of PROJECT_WORKSPACE_TABS) {
    for (const slug of tab.sections) {
      const prefix = `/projects/${projectId}/${slug}`;
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
