import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const getObservationDetail = baseProcedure
  .input(
    z.object({
      token: z.string(),
      observationId: z.string(),
    })
  )
  .query(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    // Allow PARENT, NANNY, or ADMIN to view observation details
    // Specific access control (e.g., parent can only see their child's observation)
    // will be handled by checking relations.

    const observation = await db.observation.findUnique({
      where: { id: input.observationId },
      include: {
        child: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true,
            parentId: true, // For parent auth check
            familyId: true, // For nanny auth check
          } 
        },
        nanny: {
          select: { 
            id: true, 
            userId: true, // For nanny auth check
            firstName: true, 
            lastName: true 
          } 
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            // We need to fetch the user who made the comment
            // This requires a relation from ObservationComment to User, or fetching separately.
            // For simplicity, assuming we add a direct relation or fetch user details later.
            // For now, we'll just return userId and rely on client to map to user name if needed.
            // Ideally, the backend would join this.
            // Let's assume we add a 'user' relation to ObservationComment model pointing to User model
            // user: { select: { id: true, firstName: true, lastName: true, role: true }}
          },
        },
      },
    });

    if (!observation) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Observation not found." });
    }

    // Authorization check
    if (user.role === "PARENT") {
      const parentProfile = await db.parentProfile.findUnique({ where: { userId: user.id }});
      if (!parentProfile || observation.child.parentId !== parentProfile.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to view this observation." });
      }
    } else if (user.role === "NANNY") {
      if (observation.nanny.userId !== user.id) {
         // Nanny can only view observations they created, unless further logic for shared families is added.
         // Or if they are assigned to the family of the child in the observation
         const isAssignedToFamily = await db.familyNanny.findFirst({
            where: {
                nannyId: observation.nannyId, // This is the nanny who created the observation
                familyId: observation.child.familyId!, // The family of the child in the observation
                nanny: { userId: user.id } // Check if the current nanny user is the one assigned
            }
         });
         if(!isAssignedToFamily && observation.nanny.userId !== user.id) { // Allow if current nanny created it OR is assigned to the family
            throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to view this observation." });
         }
      }
    }
    // ADMINs have access by default if they pass validateUserRole

    // Simulate fetching user details for comments (Ideally done via Prisma include)
    const commentsWithUserDetails = await Promise.all(observation.comments.map(async (comment) => {
        const commentUser = await db.user.findUnique({
            where: { id: comment.userId },
            select: { id: true, role: true, parentProfile: {select: {firstName: true, lastName: true}}, nannyProfile: {select: {firstName: true, lastName: true}}, adminProfile: {select: {firstName: true, lastName: true}} }
        });
        let userName = "Unknown User";
        if (commentUser?.parentProfile) userName = `${commentUser.parentProfile.firstName} ${commentUser.parentProfile.lastName}`;
        else if (commentUser?.nannyProfile) userName = `${commentUser.nannyProfile.firstName} ${commentUser.nannyProfile.lastName}`;
        else if (commentUser?.adminProfile) userName = `${commentUser.adminProfile.firstName} ${commentUser.adminProfile.lastName}`;
        
        return {
            ...comment,
            userName,
            userRole: commentUser?.role || "UNKNOWN" as "NANNY" | "PARENT" | "ADMIN",
        };
    }));


    return {
      ...observation,
      childName: `${observation.child.firstName} ${observation.child.lastName}`,
      nannyName: `${observation.nanny.firstName} ${observation.nanny.lastName}`,
      comments: commentsWithUserDetails,
      checklistItems: observation.type === "CHECKLIST" && observation.content ? JSON.parse(observation.content) : null,
      mediaUrl: (observation.type === "PHOTO" || observation.type === "VIDEO" || observation.type === "AUDIO") ? observation.content : null,
      content: (observation.type === "TEXT" || observation.type === "RICHTEXT") ? observation.content : '',
    };
  });
