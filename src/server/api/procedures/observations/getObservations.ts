import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const getObservations = baseProcedure
  .input(
    z.object({
      token: z.string(),
      childId: z.string().optional(),
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      startDate: z.string().datetime().optional(), // Added: ISO date string
      endDate: z.string().datetime().optional(),   // Added: ISO date string
      tag: z.string().optional(),                 // Added: Single tag to filter by
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Define base query based on user role
    let whereClause: any = {};
    
    if (user.role === "NANNY") {
      const nannyProfile = await db.nannyProfile.findUnique({ where: { userId: user.id } });
      if (!nannyProfile) throw new TRPCError({ code: "NOT_FOUND", message: "Nanny profile not found" });
      whereClause.nannyId = nannyProfile.id;
    } else if (user.role === "PARENT") {
      const parentProfile = await db.parentProfile.findUnique({ where: { userId: user.id } });
      if (!parentProfile) throw new TRPCError({ code: "NOT_FOUND", message: "Parent profile not found" });
      // Parents can only see observations for their children
      // This requires fetching children IDs associated with the parent.
      const childrenOfParent = await db.child.findMany({
        where: { parentId: parentProfile.id },
        select: { id: true }
      });
      const childrenIds = childrenOfParent.map(c => c.id);
      if (childrenIds.length === 0) { // No children, so no observations to show
        return { data: [], nextCursor: undefined };
      }
      whereClause.childId = { in: childrenIds };
    }
    // ADMINs can see all by default, no specific whereClause addition here for role

    // Apply filters
    if (input.childId) {
      // Ensure parent/nanny is authorized for this specific child if childId filter is applied
      if (user.role === "PARENT" && !whereClause.childId.in.includes(input.childId)) {
         throw new TRPCError({ code: "FORBIDDEN", message: "Access denied to this child's observations." });
      }
      // For nanny, if filtering by a specific child, ensure they are assigned to that child's family.
      // This logic might need to be more complex depending on how nannies are assigned.
      // For simplicity, if nannyId is already set, we assume this is implicitly handled.
      // If childId is provided, it overrides the general parent's children filter for that parent.
      whereClause.childId = input.childId;
    }

    if (input.startDate || input.endDate) {
      whereClause.createdAt = {};
      if (input.startDate) {
        whereClause.createdAt.gte = new Date(input.startDate);
      }
      if (input.endDate) {
        // Add 1 day to endDate to make it inclusive of the selected end date
        const endDate = new Date(input.endDate);
        endDate.setDate(endDate.getDate() + 1);
        whereClause.createdAt.lt = endDate;
      }
    }

    if (input.tag) {
      // Assuming aiTags is a JSON string array: "[\"tag1\", \"tag2\"]"
      // This requires a database that supports JSON querying or careful string matching.
      // For PostgreSQL, one might use: where: { aiTags: { path: '$', array_contains: input.tag } }
      // For simplicity with basic string matching (less robust):
      whereClause.aiTags = {
        contains: `"${input.tag}"`, // Matches if the tag is present as a JSON string element
      };
    }
    
    // Get observations with pagination
    const observations = await db.observation.findMany({
      where: whereClause, // Updated
      take: input.limit + 1,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        nanny: {
          select: {
            firstName: true,
            lastName: true,
            profileImageUrl: true,
          },
        },
        child: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    
    // Check if there are more results
    const hasMore = observations.length > input.limit;
    const data = hasMore ? observations.slice(0, input.limit) : observations;
    
    // Get the next cursor
    const nextCursor = hasMore ? data[data.length - 1].id : undefined;
    
    // Format the observations for the frontend
    const formattedObservations = data.map(observation => ({
      id: observation.id,
      nannyId: observation.nannyId,
      nannyName: `${observation.nanny.firstName} ${observation.nanny.lastName}`,
      childId: observation.childId,
      childName: `${observation.child.firstName} ${observation.child.lastName}`,
      type: observation.type,
      content: observation.content,
      aiTags: observation.aiTags,
      createdAt: observation.createdAt.toISOString(),
      updatedAt: observation.updatedAt.toISOString(),
    }));
    
    return {
      data: formattedObservations,
      nextCursor,
    };
  });
