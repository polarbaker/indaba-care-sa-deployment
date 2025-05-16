import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const archiveChild = baseProcedure
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

    const childToArchive = await db.child.findUnique({
      where: { id: input.childId },
    });

    if (!childToArchive) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Child not found." });
    }

    if (childToArchive.parentId !== parentProfile.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can only archive your own children." });
    }

    const archivedChild = await db.child.update({
      where: { id: input.childId },
      data: { isArchived: true },
    });

    return archivedChild;
  });
