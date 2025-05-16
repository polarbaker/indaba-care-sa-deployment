import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";
import { ObservationType } from "@prisma/client"; // Import enum

export const updateObservation = baseProcedure
  .input(
    z.object({
      token: z.string(),
      observationId: z.string(),
      childId: z.string().optional(), // Child might not be updatable, or only by admin
      type: z.nativeEnum(ObservationType).optional(),
      content: z.string().optional(),
      notes: z.string().nullable().optional(),
      // aiTags: z.string().optional(), // AI tags likely shouldn't be manually updatable by user
    })
  )
  .mutation(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    validateUserRole(user, ["NANNY", "ADMIN"]); // Only nannies or admins can update

    const observationToUpdate = await db.observation.findUnique({
      where: { id: input.observationId },
      include: { nanny: { select: { userId: true } } }
    });

    if (!observationToUpdate) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Observation not found." });
    }

    // Authorization: Nanny can only update their own observations. Admin can update any.
    if (user.role === "NANNY" && observationToUpdate.nanny.userId !== user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can only update your own observations." });
    }
    
    // Prevent changing childId by nanny after creation, admin might be allowed
    if (user.role === "NANNY" && input.childId && input.childId !== observationToUpdate.childId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Child cannot be changed for an existing observation." });
    }

    const updatedObservation = await db.observation.update({
      where: { id: input.observationId },
      data: {
        ...(input.childId && user.role === "ADMIN" && { childId: input.childId }), // Admin can change child
        ...(input.type && { type: input.type }),
        ...(input.content && { content: input.content }),
        ...(input.notes !== undefined && { notes: input.notes }), // Allow setting notes to null
      },
    });

    return updatedObservation;
  });
