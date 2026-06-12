import { closePool } from "../src/lib/db/client";
import { deleteOldPlays } from "../src/lib/db/repository";

try {
  const deleted = await deleteOldPlays();
  console.log(`Deleted ${deleted} play records older than 30 days`);
} finally {
  await closePool();
}
