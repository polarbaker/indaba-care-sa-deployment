import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { verifyPassword, generateToken } from "~/lib/auth";

export const login = baseProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    // Find user by email
    const user = await db.user.findUnique({
      where: { email: input.email },
      include: {
        nannyProfile: true,
        parentProfile: true,
        adminProfile: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid password",
      });
    }

    // Generate JWT token
    const token = generateToken({ id: user.id, role: user.role });

    // Get profile info based on role
    let firstName = "";
    let lastName = "";
    let profileImageUrl = undefined;

    if (user.role === "NANNY" && user.nannyProfile) {
      firstName = user.nannyProfile.firstName;
      lastName = user.nannyProfile.lastName;
      profileImageUrl = user.nannyProfile.profileImageUrl;
    } else if (user.role === "PARENT" && user.parentProfile) {
      firstName = user.parentProfile.firstName;
      lastName = user.parentProfile.lastName;
      profileImageUrl = user.parentProfile.profileImageUrl;
    } else if (user.role === "ADMIN" && user.adminProfile) {
      firstName = user.adminProfile.firstName;
      lastName = user.adminProfile.lastName;
    }

    // Return user info and token
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName,
        lastName,
        profileImageUrl,
      },
      token,
    };
  });
