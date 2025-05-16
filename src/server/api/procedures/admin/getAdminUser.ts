import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const getAdminUser = baseProcedure
  .input(
    z.object({
      token: z.string(),
      userId: z.string(),
    })
  )
  .query(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const user = await db.user.findUnique({
      where: { id: input.userId },
      include: {
        nannyProfile: true,
        parentProfile: true,
        adminProfile: true,
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      nannyProfile: user.nannyProfile,
      parentProfile: user.parentProfile,
      adminProfile: user.adminProfile,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  });
