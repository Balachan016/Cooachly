import type { Site } from "@prisma/client";

export type { Site };

export const DEFAULT_SITE: Site = "COOACHLY";

/** URL prefix each site's app routes live under. Cooachly owns the root; Arts is namespaced. */
export function siteBasePath(site: Site): string {
  return site === "ARTS" ? "/arts" : "";
}

/** Prefixes an app-relative path (e.g. "/student/bookings") with the site's base path. */
export function sitePath(site: Site, path: string): string {
  return `${siteBasePath(site)}${path}`;
}

export const SITE_CONFIG: Record<Site, {
  brandName: string;
  tagline: string;
  description: string;
  supportPhone: string;
  category: string;
  homeHref: string;
}> = {
  COOACHLY: {
    brandName: "Cooachly",
    tagline: "Coaching, scheduled simply",
    description:
      "Cooachly connects students with professors for scheduled 1:1 coaching sessions, messaging, and payments — across any timezone.",
    supportPhone: "+91 80151 51896",
    category: "academic coaching",
    homeHref: "/",
  },
  ARTS: {
    brandName: "Cooachly Arts",
    tagline: "Carnatic vocals, taught live",
    description:
      "Cooachly Arts connects students with Carnatic vocal gurus for scheduled 1:1 music classes, messaging, and payments — across any timezone.",
    supportPhone: "+91 80151 51896",
    category: "Carnatic vocal music",
    homeHref: "/arts",
  },
};
