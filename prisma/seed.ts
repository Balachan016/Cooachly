import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(opts: {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "PROFESSOR" | "STUDENT";
  timezone: string;
}) {
  const passwordHash = await bcrypt.hash(opts.password, 10);
  return prisma.user.upsert({
    where: { email: opts.email },
    update: {},
    create: {
      name: opts.name,
      email: opts.email,
      passwordHash,
      role: opts.role,
      timezone: opts.timezone,
      professorProfile:
        opts.role === "PROFESSOR"
          ? {
              create: {
                headline: "Experienced coach ready to help you grow",
                bio: "This is a sample professor profile created by the seed script.",
                subject: "General coaching",
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

  console.log("Seeded users:");
  console.log(` - Admin:     ${admin.email} / ChangeMe123!`);
  console.log(` - Professor: ${professor.email} / ChangeMe123!`);
  console.log(` - Student:   ${student.email} / ChangeMe123!`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
