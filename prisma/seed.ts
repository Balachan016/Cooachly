import { PrismaClient, type Site } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(opts: {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "PROFESSOR" | "STUDENT";
  timezone: string;
  site?: Site;
  headline?: string;
  bio?: string;
  subject?: string;
}) {
  const site = opts.site ?? "COOACHLY";
  const passwordHash = await bcrypt.hash(opts.password, 10);
  return prisma.user.upsert({
    where: { site_email: { site, email: opts.email } },
    update: {},
    create: {
      site,
      name: opts.name,
      email: opts.email,
      passwordHash,
      role: opts.role,
      timezone: opts.timezone,
      professorProfile:
        opts.role === "PROFESSOR"
          ? {
              create: {
                headline: opts.headline ?? "Experienced coach ready to help you grow",
                bio: opts.bio ?? "This is a sample professor profile created by the seed script.",
                subject: opts.subject ?? "General coaching",
                hourlyRateCents: 5000,
              },
            }
          : undefined,
    },
  });
}

async function main() {
  const admin = await upsertUser({
    name: "Admin",
    email: "admin@cooachly.com",
    password: "ChangeMe123!",
    role: "ADMIN",
    timezone: "UTC",
  });

  const professor = await upsertUser({
    name: "Sam Professor",
    email: "professor@cooachly.com",
    password: "ChangeMe123!",
    role: "PROFESSOR",
    timezone: "America/New_York",
  });

  const student = await upsertUser({
    name: "Alex Student",
    email: "student@cooachly.com",
    password: "ChangeMe123!",
    role: "STUDENT",
    timezone: "Asia/Kolkata",
  });

  const existingAvailability = await prisma.availability.findFirst({ where: { professorId: professor.id } });
  if (!existingAvailability) {
    await prisma.availability.createMany({
      data: [
        { professorId: professor.id, dayOfWeek: 1, startTime: "09:00", endTime: "12:00", timezone: "America/New_York" },
        { professorId: professor.id, dayOfWeek: 3, startTime: "13:00", endTime: "17:00", timezone: "America/New_York" },
      ],
    });
  }

  // Cooachly Arts (Carnatic vocals) — a fully separate governance: its own
  // admin, guru, and student accounts, scoped by `site: "ARTS"`.
  const artsAdmin = await upsertUser({
    name: "Arts Admin",
    email: "admin@cooachly.com",
    password: "ChangeMe123!",
    role: "ADMIN",
    timezone: "UTC",
    site: "ARTS",
  });

  const artsGuru = await upsertUser({
    name: "Meera Guru",
    email: "guru@cooachly.com",
    password: "ChangeMe123!",
    role: "PROFESSOR",
    timezone: "Asia/Kolkata",
    site: "ARTS",
    headline: "Trained in the Semmangudi bani, 20+ years of teaching experience",
    bio: "This is a sample guru profile created by the seed script.",
    subject: "Carnatic Vocals",
  });

  const artsStudent = await upsertUser({
    name: "Priya Student",
    email: "student@cooachly.com",
    password: "ChangeMe123!",
    role: "STUDENT",
    timezone: "America/Los_Angeles",
    site: "ARTS",
  });

  const existingArtsAvailability = await prisma.availability.findFirst({ where: { professorId: artsGuru.id } });
  if (!existingArtsAvailability) {
    await prisma.availability.createMany({
      data: [
        { professorId: artsGuru.id, dayOfWeek: 6, startTime: "09:00", endTime: "12:00", timezone: "Asia/Kolkata", sessionLengthMinutes: 30 },
        { professorId: artsGuru.id, dayOfWeek: 0, startTime: "09:00", endTime: "12:00", timezone: "Asia/Kolkata", sessionLengthMinutes: 30 },
      ],
    });
  }

  console.log("Seeded Cooachly users:");
  console.log(` - Admin:     ${admin.email} / ChangeMe123!`);
  console.log(` - Professor: ${professor.email} / ChangeMe123!`);
  console.log(` - Student:   ${student.email} / ChangeMe123!`);
  console.log("Seeded Cooachly Arts users (same emails, separate accounts via site scoping):");
  console.log(` - Admin: ${artsAdmin.email} / ChangeMe123!`);
  console.log(` - Guru:  ${artsGuru.email} / ChangeMe123!`);
  console.log(` - Student: ${artsStudent.email} / ChangeMe123!`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
