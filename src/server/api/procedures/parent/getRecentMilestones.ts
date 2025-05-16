import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const getRecentMilestones = baseProcedure
  .input(
    z.object({
      token: z.string(),
      searchTerm: z.string().optional(),
      limit: z.number().min(1).max(50).default(10),
      childId: z.string().optional(), // Optional: filter by specific child
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Fetch milestones based on user role and search term
    let whereClause: any = {};
    
    if (user.role === "PARENT") {
      const children = await db.child.findMany({
        where: { parentId: user.parentProfile?.id },
        select: { id: true },
      });
      const childIds = children.map(c => c.id);
      whereClause.childId = { in: input.childId ? [input.childId] : childIds };
    } else if (user.role === "NANNY") {
      // Nannies might see milestones for assigned children
      const assignedFamilies = await db.familyNanny.findMany({
        where: { nannyId: user.nannyProfile?.id, status: "Active" },
        include: { family: { include: { children: { select: { id: true } } } } },
      });
      const childIds = assignedFamilies.flatMap(fn => fn.family.children.map(c => c.id));
      whereClause.childId = { in: input.childId ? [input.childId] : childIds };
    }
    // For ADMIN, no specific user-based filter unless searchTerm is used or childId is provided
    else if (user.role === "ADMIN" && input.childId) {
      whereClause.childId = input.childId;
    }
    
    if (input.searchTerm) {
      whereClause.OR = [
        { milestone: { name: { contains: input.searchTerm, mode: "insensitive" } } },
        { milestone: { description: { contains: input.searchTerm, mode: "insensitive" } } },
        { customMilestone: { name: { contains: input.searchTerm, mode: "insensitive" } } },
        { customMilestone: { description: { contains: input.searchTerm, mode: "insensitive" } } },
        { notes: { contains: input.searchTerm, mode: "insensitive" } },
      ];
    }
    
    const childMilestones = await db.childMilestone.findMany({
      where: whereClause,
      take: input.limit,
      orderBy: { achievedDate: "desc" }, // Or createdAt
      include: {
        milestone: true,
        customMilestone: true,
        child: { select: { firstName: true, lastName: true } },
      },
    });
    
    return childMilestones.map(cm => ({
      id: cm.id,
      name: cm.milestone?.name || cm.customMilestone?.name || "Unnamed Milestone",
      description: cm.milestone?.description || cm.customMilestone?.description || cm.notes || "",
      achievedDate: cm.achievedDate?.toISOString(),
      childName: `${cm.child.firstName} ${cm.child.lastName}`,
    }));
  });
