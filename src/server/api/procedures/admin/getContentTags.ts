import { z } from "zod";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const getContentTags = baseProcedure
  .input(
    z.object({
      token: z.string(),
      searchTerm: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN", "NANNY", "PARENT"]); // Allow all authenticated users to fetch tags

    const whereClause: any = {};
    if (input.searchTerm) {
        whereClause.name = { contains: input.searchTerm, mode: 'insensitive' };
    }
    
    const tags = await db.contentTag.findMany({
        where: whereClause,
        orderBy: { name: 'asc' }
    });
    return tags;
  });
