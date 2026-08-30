import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  PROJECT_LEGACY_REDIRECTS,
  PROJECT_STUDIO_SLUGS,
  PROJECT_WORKSPACE_SLUGS,
  PROJECT_WORKSPACE_TABS,
  projectSectionSubNav,
  projectTabForSlug,
  resolveLegacyProjectRedirect,
} from "../core/ui/nav-config.ts";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}:`, err instanceof Error ? err.message : err);
  }
}

for (const slug of PROJECT_WORKSPACE_SLUGS) {
  test(`workspace route file exists: ${slug}`, () => {
    const file = path.join(process.cwd(), "app/projects/[projectId]", slug, "page.tsx");
    assert.ok(fs.existsSync(file), `missing page for /projects/:id/${slug}`);
  });
}

for (const slug of PROJECT_STUDIO_SLUGS) {
  test(`studio route file exists: ${slug}`, () => {
    const file = path.join(process.cwd(), "app/projects/[projectId]", slug, "page.tsx");
    assert.ok(fs.existsSync(file), `missing page for /projects/:id/${slug}`);
  });
}

test("every workspace slug maps to a project tab", () => {
  for (const slug of PROJECT_WORKSPACE_SLUGS) {
    assert.ok(projectTabForSlug(slug), `no tab for slug ${slug}`);
  }
});

test("legacy brand redirects to branding", () => {
  assert.equal(resolveLegacyProjectRedirect("/projects/senda/brand", "senda"), "/projects/senda/branding");
  assert.equal(resolveLegacyProjectRedirect("/projects/offerhub/brand", "offerhub"), "/projects/offerhub/branding");
});

test("canonical workspace URLs are not redirected", () => {
  for (const slug of PROJECT_WORKSPACE_SLUGS) {
    if (PROJECT_LEGACY_REDIRECTS[slug]) continue;
    assert.equal(resolveLegacyProjectRedirect(`/projects/senda/${slug}`, "senda"), null);
  }
});

test("brand section sub-nav hides legacy alias", () => {
  const brandTab = PROJECT_WORKSPACE_TABS.find((t) => t.href === "branding");
  assert.ok(brandTab);
  const items = projectSectionSubNav(brandTab!.sections);
  assert.equal(items.length, 1);
  assert.equal(items[0]!.href, "branding");
});

test("project layout defines inStudio before render", () => {
  const layout = fs.readFileSync(path.join(process.cwd(), "app/projects/[projectId]/layout.tsx"), "utf8");
  assert.ok(layout.includes("const inStudio = isProjectStudioPath"));
  assert.ok(layout.includes("section.slug"));
});

test("branding page does not import route page module", () => {
  const branding = fs.readFileSync(path.join(process.cwd(), "app/projects/[projectId]/branding/page.tsx"), "utf8");
  assert.ok(!branding.includes("/brand/page"));
  assert.ok(branding.includes("BrandSetupPanel"));
});

console.log(`\n--- Project routes audit ---\nPassed: ${passed}/${passed + failed}`);
if (failed > 0) process.exit(1);
console.log("All project route checks passed.");
