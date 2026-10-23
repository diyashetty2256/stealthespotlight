import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";

export async function ensureDefaultUsers(): Promise<void> {
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "admin-spotlight-2026";
  const judgePass = process.env.SEED_JUDGE_PASSWORD ?? "judge-spotlight-2026";

  const adminHash = await bcrypt.hash(adminPass, 12);
  const judgeHash = await bcrypt.hash(judgePass, 12);

  await pool.query(
    `INSERT INTO users (username, password_hash, display_name, role)
     VALUES ('admin', $1, 'Spotlight Admin', 'admin'),
            ('judge', $2, 'Head Judge', 'judge')
     ON CONFLICT (username) DO NOTHING`,
    [adminHash, judgeHash]
  );
}
