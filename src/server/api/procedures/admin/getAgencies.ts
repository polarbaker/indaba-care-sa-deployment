import { z } from "zod";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const getAgencies = baseProcedure
  .input(
    z.object({
      token: z.string(),
      searchTerm: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const whereClause: any = {};
    if (input.searchTerm) {
      whereClause.OR = [
        { name: { contains: input.searchTerm, mode: 'insensitive' } },
        { contactPerson: { contains: input.searchTerm, mode: 'insensitive' } },
        { contactEmail: { contains: input.searchTerm, mode: 'insensitive' } },
      ];
    }

    const agencies = await db.agency.findMany({
      where: whereClause,
      include: {
        nannyAssignments: { // Count of nannies assigned
          select: { id: true }
        }
      },
      orderBy: { name: 'asc' },
    });
    
    return agencies.map(agency => ({
        ...agency,
        nannyAssignmentsCount: agency.nannyAssignments.length
    }));
  });
