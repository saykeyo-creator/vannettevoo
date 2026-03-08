import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashSync } from "bcryptjs";
import path from "path";

const adapter = new PrismaBetterSqlite3({
  url: "file:" + path.resolve(__dirname, "..", "dev.db"),
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.adminUser.findFirst();
  if (existing) {
    console.log("Admin user already exists:", existing.email);
    return;
  }

  const admin = await prisma.adminUser.create({
    data: {
      email: "admin@vannettevoo.com.au",
      name: "Dr Vannette Voo",
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
