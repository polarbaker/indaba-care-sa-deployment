import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { serverEnv } from "~/env";
import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";

export const userTokenSchema = z.object({
  userId: z.string(),
  role: z.enum(["NANNY", "PARENT", "ADMIN"]),
});

export type UserToken = z.infer<typeof userTokenSchema>;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: { id: string; role: string }): string {
  return jwt.sign(
    { userId: user.id, role: user.role },
    serverEnv.JWT_SECRET,
    { expiresIn: "30d" }
  );
}

export function verifyToken(token: string): UserToken {
  try {
    const verified = jwt.verify(token, serverEnv.JWT_SECRET);
    return userTokenSchema.parse(verified);
  } catch (error) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired token",
    });
  }
}

export async function getUserFromToken(token: string) {
  const decoded = verifyToken(token);
  
  const user = await db.user.findUnique({
    where: { id: decoded.userId },
    include: {
      nannyProfile: decoded.role === "NANNY",
      parentProfile: decoded.role === "PARENT",
      adminProfile: decoded.role === "ADMIN",
    },
  });
  
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not found",
    });
  }
  
  return user;
}

export function validateUserRole(user: { role: string }, allowedRoles: string[]) {
  if (!allowedRoles.includes(user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to access this resource",
    });
  }
}