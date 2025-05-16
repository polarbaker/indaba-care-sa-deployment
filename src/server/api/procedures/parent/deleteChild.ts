import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const deleteChild = baseProcedure
  .input(
    z.object({
      token: z.string(),
      childId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    validateUserRole(user, ["PARENT"]);

    const parentProfile = await db.parentProfile.findUnique({
      where: { userId: user.id },
    });

    if (!parentProfile) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Parent profile not found." });
    }

    const childToDelete = await db.child.findUnique({
      where: { id: input.childId },
    });

    if (!childToDelete) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Child not found." });
    }

    if (childToDelete.parentId !== parentProfile.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own children." });
    }

    // Perform deletion. Cascading deletes should handle related data based on schema.
    await db.child.delete({
      where: { id: input.childId },
    });

    return { success: true, deletedChildId: input.childId };
  });
