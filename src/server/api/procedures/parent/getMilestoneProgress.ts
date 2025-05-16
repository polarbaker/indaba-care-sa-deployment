import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const getMilestoneProgress = baseProcedure
  .input(
    z.object({
      token: z.string(),
      childId: z.string(),
    })
  )
  .query(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    validateUserRole(user, ["PARENT"]); // Or NANNY if they should also see this

    const parentProfile = await db.parentProfile.findUnique({
      where: { userId: user.id },
      include: { children: { select: { id: true } } },
    });

    if (!parentProfile) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Parent profile not found." });
    }
    const childBelongsToParent = parentProfile.children.some(child => child.id === input.childId);
    if (!childBelongsToParent) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }

    // Fetch all standard milestones
    const allStandardMilestones = await db.milestone.findMany({
      select: { id: true, category: true },
    });

    // Fetch achieved standard milestones for the child
    const achievedStandardMilestones = await db.childMilestone.findMany({
      where: { 
        childId: input.childId,
        milestoneId: { not: null } // Only standard milestones
      },
      select: { milestone: { select: { id: true, category: true } } },
    });
    
    // Fetch all custom milestones for the child (or globally if not child-specific)
    const allCustomMilestones = await db.customMilestone.findMany({
        where: { OR: [{ childId: input.childId }, { childId: null }] }, // Child-specific or global custom
        select: { id: true, category: true }
    });
    
    // Fetch achieved custom milestones for the child
    const achievedCustomMilestones = await db.childMilestone.findMany({
        where: {
            childId: input.childId,
            customMilestoneId: { not: null } // Only custom milestones
        },
        select: { customMilestone: { select: {id: true, category: true}}}
    });


    const progressByDomain: Record<string, { achieved: number; total: number; percentage: number }> = {};

    // Process standard milestones
    allStandardMilestones.forEach(milestone => {
      if (!progressByDomain[milestone.category]) {
        progressByDomain[milestone.category] = { achieved: 0, total: 0, percentage: 0 };
      }
      progressByDomain[milestone.category].total++;
    });
    achievedStandardMilestones.forEach(achieved => {
      if (achieved.milestone && progressByDomain[achieved.milestone.category]) {
        progressByDomain[achieved.milestone.category].achieved++;
      }
    });
    
    // Process custom milestones
    allCustomMilestones.forEach(customMilestone => {
        if (!progressByDomain[customMilestone.category]) {
            progressByDomain[customMilestone.category] = { achieved: 0, total: 0, percentage: 0 };
        }
        progressByDomain[customMilestone.category].total++;
    });
    achievedCustomMilestones.forEach(achieved => {
        if (achieved.customMilestone && progressByDomain[achieved.customMilestone.category]) {
            progressByDomain[achieved.customMilestone.category].achieved++;
        }
    });


    // Calculate percentages
    for (const category in progressByDomain) {
      const domain = progressByDomain[category];
      domain.percentage = domain.total > 0 ? Math.round((domain.achieved / domain.total) * 100) : 0;
    }

    return progressByDomain;
  });
