import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const deleteObservation = baseProcedure
  .input(
    z.object({
      token: z.string(),
      observationId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    validateUserRole(user, ["NANNY", "ADMIN"]);

    const observationToDelete = await db.observation.findUnique({
      where: { id: input.observationId },
      include: { nanny: { select: { userId: true } } }
    });

    if (!observationToDelete) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Observation not found." });
    }

    // Authorization: Nanny can only delete their own observations. Admin can delete any.
    if (user.role === "NANNY" && observationToDelete.nanny.userId !== user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own observations." });
    }

    // Cascading delete should handle comments if schema is set up correctly
    await db.observation.delete({
      where: { id: input.observationId },
    });

    return { success: true, deletedObservationId: input.observationId };
  });
