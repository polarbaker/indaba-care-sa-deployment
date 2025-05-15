import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { hashPassword, generateToken } from "~/lib/auth";

export const register = baseProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(["NANNY", "PARENT", "ADMIN"]),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phoneNumber: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Email already in use",
      });
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user with appropriate profile based on role
    const user = await db.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
      },
    });

    // Create profile based on role
    if (input.role === "NANNY") {
      await db.nannyProfile.create({
        data: {
          userId: user.id,
          firstName: input.firstName,
          lastName: input.lastName,
          phoneNumber: input.phoneNumber,
        },
      });
    } else if (input.role === "PARENT") {
      await db.parentProfile.create({
        data: {
          userId: user.id,
          firstName: input.firstName,
          lastName: input.lastName,
          phoneNumber: input.phoneNumber,
        },
      });
    } else if (input.role === "ADMIN") {
      await db.adminProfile.create({
        data: {
          userId: user.id,
          firstName: input.firstName,
          lastName: input.lastName,
        },
      });
    }

    // Generate JWT token
    const token = generateToken({ id: user.id, role: user.role });

    // Return user info and token
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: input.firstName,
        lastName: input.lastName,
      },
      token,
    };
  });
