import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const getObservations = baseProcedure
  .input(
    z.object({
      token: z.string(),
      childId: z.string().optional(), // Optional filter by child
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Define base query based on user role
    let observationsQuery: any = {};
    
    if (user.role === "NANNY") {
      // For nannies, get their profile ID
      const nannyProfile = await db.nannyProfile.findUnique({
        where: { userId: user.id },
      });
      
      if (!nannyProfile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nanny profile not found",
        });
      }
      
      // Nannies can only see observations they created
      observationsQuery = {
        where: {
          nannyId: nannyProfile.id,
          ...(input.childId ? { childId: input.childId } : {}),
        },
      };
    } else if (user.role === "PARENT") {
      // For parents, get their profile ID
      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: user.id },
      });
      
      if (!parentProfile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parent profile not found",
        });
      }
      
      // Parents can only see observations for their children
      observationsQuery = {
        where: {
          child: {
            parentId: parentProfile.id,
          },
          ...(input.childId ? { childId: input.childId } : {}),
        },
      };
    } else if (user.role === "ADMIN") {
      // Admins can see all observations, optionally filtered by child
      observationsQuery = {
        where: {
          ...(input.childId ? { childId: input.childId } : {}),
        },
      };
    } else {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to view observations",
      });
    }
    
    // Get observations with pagination
    const observations = await db.observation.findMany({
      ...observationsQuery,
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
