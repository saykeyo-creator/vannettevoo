import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashSync } from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.adminUser.findFirst();
  if (existing) {
    console.log("Admin user already exists:", existing.email);
    return;
  }

  const admin = await prisma.adminUser.create({
    data: {
      email: "admin@vannettevu.com.au",
      name: "Vannette Vu",
      passwordHash: hashSync("changeme123", 12),
    },
  });

  console.log("Created admin user:", admin.email);
  console.log("Default password: changeme123 — change this immediately!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
