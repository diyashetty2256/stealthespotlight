import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import type { User } from "../config/types.js";

declare module "express-session" {
  interface SessionData {
    user?: User;
  }
}

export async function findUserByUsername(username: string): Promise<(User & { password_hash: string }) | null> {
  const normalized = username.trim().toLowerCase();
  const result = await pool.query("SELECT * FROM users WHERE username = $1", [normalized]);
  return (result.rows[0] as User & { password_hash: string }) ?? null;
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

export function requireJudge(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user || req.session.user.role !== "judge") {
    return res.status(403).json({ error: "Judge access required." });
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  next();
}
