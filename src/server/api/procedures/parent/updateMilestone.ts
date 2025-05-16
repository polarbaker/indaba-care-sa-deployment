import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const updateMilestone = baseProcedure
  .input(
    z.object({
      token: z.string(),
      id: z.string(),
      achievedDate: z.date().nullable(),
      notes: z.string().nullable(),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Get the milestone to verify permissions
    const childMilestone = await db.childMilestone.findUnique({
      where: { id: input.id },
      include: {
        child: true,
      },
    });
    
    if (!childMilestone) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Child milestone not found",
      });
    }
    
    // Verify user has permission to update milestones for this child
    let hasPermission = false;
    
    if (user.role === "PARENT") {
      // Check if parent owns this child
      const parentProfile = await db.parentProfile.findFirst({
        where: { userId: user.id },
        include: {
          children: {
            select: { id: true }
          }
        }
      });
      
      if (parentProfile) {
        hasPermission = parentProfile.children.some(child => child.id === childMilestone.childId);
      }
    } else if (user.role === "NANNY") {
      // Check if nanny is assigned to this child's family
      const nannyProfile = await db.nannyProfile.findFirst({
        where: { userId: user.id },
        include: {
          assignedFamilies: {
            include: {
              family: {
                include: {
                  children: {
                    select: { id: true }
                  }
                }
              }
            }
          }
        }
      });
      
      if (nannyProfile) {
        hasPermission = nannyProfile.assignedFamilies.some(
          assignment => assignment.family.children.some(child => child.id === childMilestone.childId)
        );
      }
    }
    
    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to update milestones for this child",
      });
    }
    
    // Update child milestone
    await db.childMilestone.update({
      where: { id: input.id },
      data: {
        achievedDate: input.achievedDate,
        notes: input.notes,
      },
    });
    
    return {
      success: true,
    };
  });
