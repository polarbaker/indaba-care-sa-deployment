import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const getChildMilestones = baseProcedure
  .input(
    z.object({
      token: z.string(),
      childId: z.string(),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Validate user is a parent or nanny
    validateUserRole(user, ["PARENT", "NANNY"]);
    
    // If user is a parent, verify they own this child
    if (user.role === "PARENT") {
      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: user.id },
        include: {
          children: {
            select: { id: true }
          }
        }
      });
      
      if (!parentProfile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parent profile not found",
        });
      }
      
      const childBelongsToParent = parentProfile.children.some(child => child.id === input.childId);
      
      if (!childBelongsToParent) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view this child's milestones",
        });
      }
    }
    
    // If user is a nanny, verify they are assigned to this child's family
    if (user.role === "NANNY") {
      const nannyProfile = await db.nannyProfile.findUnique({
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
      
      if (!nannyProfile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nanny profile not found",
        });
      }
      
      const childBelongsToAssignedFamily = nannyProfile.assignedFamilies.some(
        assignment => assignment.family.children.some(child => child.id === input.childId)
      );
      
      if (!childBelongsToAssignedFamily) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view this child's milestones",
        });
      }
    }
    
    // Get child info
    const child = await db.child.findUnique({
      where: { id: input.childId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
      }
    });
    
    if (!child) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Child not found",
      });
    }
    
    // Calculate child's age in months
    const ageInMonths = calculateAgeInMonths(child.dateOfBirth);
    
    // Get achieved milestones for this child
    const achievedMilestones = await db.childMilestone.findMany({
      where: { childId: input.childId },
      include: {
        milestone: {
          include: {
            resources: {
              include: {
                resource: true
              }
            }
          }
        }
      },
      orderBy: [
        { achievedDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    // Get upcoming milestones based on child's age
    const upcomingMilestones = await db.milestone.findMany({
      where: {
        ageRangeStart: {
          lte: ageInMonths + 6 // Include milestones up to 6 months ahead
        },
        ageRangeEnd: {
          gte: ageInMonths
        },
        // Exclude already achieved milestones
        NOT: {
          childMilestones: {
            some: {
              childId: input.childId
            }
          }
        }
      },
      include: {
        resources: {
          include: {
            resource: true
          }
        }
      },
      orderBy: [
        { ageRangeStart: 'asc' },
        { category: 'asc' }
      ]
    });
    
    return {
      child: {
        ...child,
        ageInMonths
      },
      achievedMilestones: achievedMilestones.map(childMilestone => ({
        id: childMilestone.id,
        milestone: childMilestone.milestone,
        achievedDate: childMilestone.achievedDate,
        notes: childMilestone.notes,
        resources: childMilestone.milestone.resources.map(r => r.resource),
        createdAt: childMilestone.createdAt
      })),
      upcomingMilestones: upcomingMilestones.map(milestone => ({
        id: milestone.id,
        name: milestone.name,
        description: milestone.description,
        ageRangeStart: milestone.ageRangeStart,
        ageRangeEnd: milestone.ageRangeEnd,
        category: milestone.category,
        resources: milestone.resources.map(r => r.resource)
      }))
    };
  });

// Helper function to calculate age in months
function calculateAgeInMonths(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  
  let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
  months -= birthDate.getMonth();
  months += today.getMonth();
  
  // Adjust for day of month
  if (today.getDate() < birthDate.getDate()) {
    months--;
  }
  
  return months;
}
