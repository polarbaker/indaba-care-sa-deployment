import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const addObservationComment = baseProcedure
  .input(
    z.object({
      token: z.string(),
      observationId: z.string(),
      content: z.string().min(1, "Comment content cannot be empty"),
    })
  )
  .mutation(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    // Allow PARENT, NANNY, ADMIN to comment. Authorization to view the observation is implicitly required.
    // More specific checks (e.g. parent can only comment on their child's observation) can be added if needed.
    
    const observation = await db.observation.findUnique({
        where: { id: input.observationId },
        include: { child: { select: { parentId: true, familyId: true } } }
    });

    if (!observation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Observation not found." });
    }

    // Authorization: Ensure user can view/comment on this observation
    if (user.role === "PARENT") {
        const parentProfile = await db.parentProfile.findUnique({ where: { userId: user.id } });
        if (!parentProfile || observation.child.parentId !== parentProfile.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You cannot comment on this observation." });
        }
    } else if (user.role === "NANNY") {
        const nannyProfile = await db.nannyProfile.findUnique({ where: { userId: user.id }});
        if (!nannyProfile) throw new TRPCError({ code: "NOT_FOUND", message: "Nanny profile not found." });
        // Nanny can comment if they created it or are assigned to the child's family
        const isCreator = observation.nannyId === nannyProfile.id;
        const isAssignedToFamily = observation.child.familyId ? 
            await db.familyNanny.findFirst({
                where: { nannyId: nannyProfile.id, familyId: observation.child.familyId, status: "Active" }
            }) : false;
        if (!isCreator && !isAssignedToFamily) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You cannot comment on this observation." });
        }
    }
    // ADMINs are allowed by default

    const newComment = await db.observationComment.create({
      data: {
        observationId: input.observationId,
        userId: user.id, // Link to the User model
        content: input.content,
      },
    });

    return newComment;
  });
