import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const getChildObservations = baseProcedure
  .input(
    z.object({
      token: z.string(),
      childId: z.string(),
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Check if user has access to this child's observations
    const canAccess = await checkUserAccess(user.id, user.role, input.childId);
    
    if (!canAccess) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to view observations for this child",
      });
    }
    
    // Get observations with pagination
    const observations = await db.observation.findMany({
      where: {
        childId: input.childId,
      },
      take: input.limit + 1, // Take one extra to determine if there are more
      cursor: input.cursor ? { id: input.cursor } : undefined,
      orderBy: {
        createdAt: "desc", // Most recent first
      },
      include: {
        nanny: {
          select: {
            firstName: true,
            lastName: true,
            profileImageUrl: true,
          },
        },
      },
    });
    
    // Check if there are more results
    const hasMore = observations.length > input.limit;
    const data = hasMore ? observations.slice(0, input.limit) : observations;
    
    // Get the next cursor
    const nextCursor = hasMore ? data[data.length - 1].id : undefined;
    
    return {
      data,
      nextCursor,
    };
  });

// Helper function to check if user has access to a child's observations
async function checkUserAccess(userId: string, userRole: string, childId: string): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true; // Admins have access to all observations
  }
  
  if (userRole === "PARENT") {
    // Check if user is the parent of this child
    const child = await db.child.findFirst({
      where: {
        id: childId,
        parent: {
          userId,
        },
      },
    });
    
    return !!child;
  }
  
  if (userRole === "NANNY") {
    // Check if nanny is assigned to the child's family
    const nannyProfile = await db.nannyProfile.findUnique({
      where: { userId },
    });
    
    if (!nannyProfile) return false;
    
    const child = await db.child.findUnique({
      where: { id: childId },
      include: {
        family: {
          include: {
            nannies: {
              where: {
                nannyId: nannyProfile.id,
                status: "Active",
              },
            },
          },
        },
      },
    });
    
    return !!(child?.family?.nannies.length);
  }
  
  return false;
}
