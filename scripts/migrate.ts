import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { closePool, query } from "../src/lib/db/client";

const migrations = ["001_init.sql", "002_allow_empty_channel_key.sql"];

try {
  for (const migration of migrations) {
    const sql = await readFile(join(process.cwd(), "migrations", migration), "utf8");
    await query(sql);
    console.log(`Applied ${migration}`);
  }
} finally {
  await closePool();
}
