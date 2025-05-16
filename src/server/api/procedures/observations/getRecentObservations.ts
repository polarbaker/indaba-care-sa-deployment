import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const getRecentObservations = baseProcedure
  .input(
    z.object({
      token: z.string(),
      searchTerm: z.string().optional(),
      limit: z.number().min(1).max(50).default(10),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Fetch observations based on user role and search term
    // Nannies can see observations they created
    // Parents can see observations for their children
    // Admins can see all observations
    
    let whereClause: any = {};
    
    if (user.role === "NANNY") {
      whereClause.nannyId = user.nannyProfile?.id;
    } else if (user.role === "PARENT") {
      const children = await db.child.findMany({
        where: { parentId: user.parentProfile?.id },
        select: { id: true },
      });
      const childIds = children.map(c => c.id);
      whereClause.childId = { in: childIds };
    }
    // For ADMIN, no specific user-based filter unless searchTerm is used
    
    if (input.searchTerm) {
      whereClause.OR = [
        { content: { contains: input.searchTerm, mode: "insensitive" } },
        { notes: { contains: input.searchTerm, mode: "insensitive" } },
        { child: { firstName: { contains: input.searchTerm, mode: "insensitive" } } },
        { child: { lastName: { contains: input.searchTerm, mode: "insensitive" } } },
      ];
    }
    
    const observations = await db.observation.findMany({
      where: whereClause,
      take: input.limit,
      orderBy: { createdAt: "desc" },
      include: {
        child: { select: { firstName: true, lastName: true } },
      },
    });
    
    return observations.map(obs => ({
      id: obs.id,
      content: obs.content,
      createdAt: obs.createdAt.toISOString(),
      childName: `${obs.child.firstName} ${obs.child.lastName}`,
    }));
  });
