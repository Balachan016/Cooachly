import type { MetadataRoute } from "next";
import { SITE_CONFIG, sitePath, type Site } from "@/lib/site";

/** Status-bar / splash colours for the installed app, matching each site's brand-900. */
export const PWA_THEME: Record<Site, { themeColor: string; backgroundColor: string; shortName: string; icon: string }> = {
  COOACHLY: { themeColor: "#14532d", backgroundColor: "#ffffff", shortName: "Cooachly", icon: "cooachly" },
  ARTS: { themeColor: "#7f1d1d", backgroundColor: "#ffffff", shortName: "Cooachly Arts", icon: "arts" },
};

export function manifestPath(site: Site) {
  return sitePath(site, "/manifest.webmanifest");
}

/**
 * Web app manifest for one site. Cooachly and Arts are separate installable
 * apps (own id, name, icon and start URL), so a student of one never ends up
 * with the other's branding on their home screen.
 */
export function buildManifest(site: Site): MetadataRoute.Manifest {
  const config = SITE_CONFIG[site];
  const theme = PWA_THEME[site];
  const base = sitePath(site, "/");
  const icons = `/icons/${theme.icon}`;

  return {
    id: base,
    name: config.brandName,
    short_name: theme.shortName,
    description: config.description,
    // /dashboard sends signed-in users to their role's home, and everyone
    // else to the login page, which is what an app launch should do.
    start_url: sitePath(site, "/dashboard?source=pwa"),
    scope: base,
    display: "standalone",
    orientation: "portrait",
    theme_color: theme.themeColor,
    background_color: theme.backgroundColor,
    categories: ["education"],
    icons: [
      { src: `${icons}-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${icons}-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${icons}-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

export function manifestResponse(site: Site) {
  return new Response(JSON.stringify(buildManifest(site)), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
