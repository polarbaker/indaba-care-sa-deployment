import { z } from "zod";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const getAdminFlaggedContent = baseProcedure
  .input(
    z.object({
      token: z.string(),
      status: z.string().optional(),
      priority: z.string().optional(),
      contentType: z.string().optional(),
      searchTerm: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const whereClause: any = {};
    if (input.status) whereClause.status = input.status;
    if (input.priority) whereClause.priority = input.priority;
    if (input.contentType) whereClause.contentType = input.contentType;
    if (input.searchTerm) {
      whereClause.OR = [
        { reason: { contains: input.searchTerm, mode: 'insensitive' } },
        { keywords: { contains: input.searchTerm, mode: 'insensitive' } },
        { contentId: { contains: input.searchTerm, mode: 'insensitive' } },
      ];
    }

    const flaggedContent = await db.flaggedContent.findMany({
      where: whereClause,
      orderBy: [
        { priority: 'desc' }, // Assuming 'Urgent', 'High', 'Medium', 'Low' sort correctly
        { createdAt: 'desc' },
      ],
    });

    return flaggedContent.map(flag => ({
      ...flag,
      createdAt: flag.createdAt.toISOString(),
      moderatedAt: flag.moderatedAt?.toISOString(),
    }));
  });
