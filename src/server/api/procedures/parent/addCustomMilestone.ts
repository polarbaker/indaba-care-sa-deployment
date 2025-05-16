import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const addCustomMilestone = baseProcedure
  .input(
    z.object({
      token: z.string(),
      name: z.string().min(1, "Milestone name is required"),
      description: z.string().min(1, "Description is required"),
      category: z.string().min(1, "Category is required"),
      childId: z.string().optional(), // Optional: if specific to a child
      // ageRangeStart and ageRangeEnd are not included here as they are less defined for custom milestones initially
    })
  )
  .mutation(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    validateUserRole(user, ["PARENT"]); // Only parents can add custom milestones for now

    // If childId is provided, verify the parent owns this child
    if (input.childId) {
      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: user.id },
        include: { children: { select: { id: true } } },
      });
      if (!parentProfile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Parent profile not found." });
      }
      const childBelongsToParent = parentProfile.children.some(child => child.id === input.childId);
      if (!childBelongsToParent) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only add custom milestones for your own children." });
      }
    }

    const customMilestone = await db.customMilestone.create({
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        createdById: user.id,
        childId: input.childId,
      },
    });

    return customMilestone;
  });
