import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

// Helper function to calculate age
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export const getChildrenOverview = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    validateUserRole(user, ["PARENT"]);

    const parentProfile = await db.parentProfile.findUnique({
      where: { userId: user.id },
      include: {
        children: {
          where: { isArchived: false }, // Only active children
          orderBy: { firstName: "asc" },
        },
      },
    });

    if (!parentProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Parent profile not found.",
      });
    }

    if (!parentProfile.children || parentProfile.children.length === 0) {
      return { children: [] };
    }

    const childrenOverview = await Promise.all(
      parentProfile.children.map(async (child) => {
        // Get last observation date
        const lastObservation = await db.observation.findFirst({
          where: { childId: child.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });

        // Get next scheduled milestone (simplified: first upcoming milestone)
        const ageInMonths = calculateAge(child.dateOfBirth) * 12 + new Date(child.dateOfBirth).getMonth(); // Simplified
        const nextMilestone = await db.milestone.findFirst({
          where: {
            ageRangeStart: { gte: ageInMonths },
            NOT: { childMilestones: { some: { childId: child.id } } },
          },
          orderBy: { ageRangeStart: "asc" },
          select: { name: true },
        });
        
        // Get unread messages count for this child (from Nanny/Admin to Parent related to this child)
        // This requires messages to be linked to a child, or a more complex query
        // For now, this is a placeholder. Actual implementation depends on Message model structure.
        const unreadMessages = await db.message.count({
            where: {
                recipientId: user.id,
                childId: child.id, // Assuming Message model has childId
                isRead: false,
            }
        });


        return {
          id: child.id,
          firstName: child.firstName,
          lastName: child.lastName,
          profileImageUrl: child.profileImageUrl,
          age: calculateAge(child.dateOfBirth),
          lastObservationDate: lastObservation?.createdAt.toLocaleDateString() || null,
          nextMilestone: nextMilestone?.name || null,
          unreadMessages: unreadMessages, // Placeholder
        };
      })
    );

    return { children: childrenOverview };
  });
