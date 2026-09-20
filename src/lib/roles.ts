import type { Role, Site } from "@prisma/client";
import { sitePath } from "@/lib/site";

export function roleHomePath(role: Role, site: Site = "COOACHLY"): string {
  switch (role) {
    case "ADMIN":
      return sitePath(site, "/admin");
    case "PROFESSOR":
      return sitePath(site, "/professor");
    case "STUDENT":
    default:
      return sitePath(site, "/student");
  }
}

export const TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];
