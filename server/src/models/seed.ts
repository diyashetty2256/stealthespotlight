import { pool } from "../config/database.js";
import { runMigrations } from "./migrate.js";
import { ensureDefaultUsers } from "./bootstrap.js";

export const SAMPLE_PARTICIPANTS = [
  { number: 1, name: "Amara Osei", performance_title: "The Midnight Library of Unwritten Stories" },
  { number: 2, name: "Jonah Whitfield", performance_title: "Ode to a Broken Typewriter" },
  { number: 3, name: "Priya Nair", performance_title: "Letters I Never Sent" },
  { number: 4, name: "Diego Salazar", performance_title: "The Cartographer's Confession" },
  { number: 5, name: "Mei-Lin Zhao", performance_title: "Paper Cranes at Dawn" },
  { number: 6, name: "Felix Andersen", performance_title: "A Eulogy for the Last Bookshop" },
];

async function main() {
  await runMigrations();
  await ensureDefaultUsers();

  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "admin-spotlight-2026";
  const judgePass = process.env.SEED_JUDGE_PASSWORD ?? "judge-spotlight-2026";

  const existing = await pool.query("SELECT COUNT(*)::int AS count FROM participants");
  if (existing.rows[0].count === 0) {
    for (let i = 0; i < SAMPLE_PARTICIPANTS.length; i++) {
      const p = SAMPLE_PARTICIPANTS[i];
      await pool.query(
        `INSERT INTO participants (number, name, performance_title, display_order)
         VALUES ($1, $2, $3, $4)`,
        [p.number, p.name, p.performance_title, i]
      );
    }
    console.log(`Seeded ${SAMPLE_PARTICIPANTS.length} sample participants (no scores).`);
  } else {
    console.log("Participants already exist, skipping participant seed.");
  }

  console.log("Seed complete.");
  console.log(`  Admin login -> username: admin    password: ${adminPass}`);
  console.log(`  Judge login -> username: judge    password: ${judgePass}`);
  console.log("  Change these before a real event: POST /api/auth/change-password");
  await pool.end();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
