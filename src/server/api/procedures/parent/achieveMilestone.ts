import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const achieveMilestone = baseProcedure
  .input(
    z.object({
      token: z.string(),
      childId: z.string(),
      milestoneId: z.string(),
      achievedDate: z.date().optional(),
      notes: z.string().nullable().optional(),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Verify user has permission to mark milestones for this child
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
        hasPermission = parentProfile.children.some(child => child.id === input.childId);
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
          assignment => assignment.family.children.some(child => child.id === input.childId)
        );
      }
    }
    
    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to mark milestones for this child",
      });
    }
    
    // Check if milestone exists
    const milestone = await db.milestone.findUnique({
      where: { id: input.milestoneId },
    });
    
    if (!milestone) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Milestone not found",
      });
    }
    
    // Check if milestone is already achieved
    const existingAchievement = await db.childMilestone.findFirst({
      where: {
        childId: input.childId,
        milestoneId: input.milestoneId,
      },
    });
    
    if (existingAchievement) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This milestone has already been achieved",
      });
    }
    
    // Create child milestone
    const childMilestone = await db.childMilestone.create({
      data: {
        childId: input.childId,
        milestoneId: input.milestoneId,
        achievedDate: input.achievedDate || new Date(),
        notes: input.notes,
      },
    });
    
    return {
      success: true,
      childMilestoneId: childMilestone.id,
    };
  });
