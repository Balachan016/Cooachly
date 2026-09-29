import { PrismaClient, type Site } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [, , email, siteArg, newPassword] = process.argv;

  if (!email || !siteArg || !newPassword) {
    console.error("Usage: DATABASE_URL=<url> npx tsx scripts/reset-password.ts <email> <COOACHLY|ARTS> <newPassword>");
    process.exitCode = 1;
    return;
  }

  const site = siteArg.toUpperCase() as Site;
  if (site !== "COOACHLY" && site !== "ARTS") {
    console.error('Site must be "COOACHLY" or "ARTS"');
    process.exitCode = 1;
    return;
  }
  if (newPassword.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { site_email: { site, email } } });
  if (!user) {
    console.error(`No ${site} account found for ${email}.`);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  console.log(`Password reset for ${user.name} <${email}> on ${site} (role: ${user.role}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
