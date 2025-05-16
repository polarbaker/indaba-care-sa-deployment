import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const updateFlaggedContent = baseProcedure
  .input(
    z.object({
      token: z.string(),
      flagId: z.string(),
      status: z.string().optional(),
      priority: z.string().optional(),
      moderatorNotes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const { flagId, ...updateData } = input;

    const flag = await db.flaggedContent.findUnique({ where: { id: flagId } });
    if (!flag) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Flagged content not found." });
    }

    const updatedFlag = await db.flaggedContent.update({
      where: { id: flagId },
      data: {
        ...updateData,
        moderatedBy: adminUser.id,
        moderatedAt: new Date(),
      },
    });

    return { success: true, flag: updatedFlag };
  });
