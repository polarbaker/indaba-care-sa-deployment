import { z } from "zod";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const getAdminResources = baseProcedure
  .input(
    z.object({
      token: z.string(),
      resourceType: z.string().optional(),
      visibleTo: z.string().optional(), // Role name like "NANNY", "PARENT"
      searchTerm: z.string().optional(),
      developmentalStage: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const whereClause: any = {};
    if (input.resourceType) whereClause.resourceType = input.resourceType;
    if (input.visibleTo) whereClause.visibleTo = { has: input.visibleTo };
    if (input.developmentalStage) whereClause.developmentalStage = input.developmentalStage;
    if (input.searchTerm) {
      whereClause.OR = [
        { title: { contains: input.searchTerm, mode: 'insensitive' } },
        { description: { contains: input.searchTerm, mode: 'insensitive' } },
        { tags: { contains: input.searchTerm, mode: 'insensitive' } }, // Assumes tags is a simple string field for now
      ];
    }

    const resources = await db.resource.findMany({
      where: whereClause,
      include: {
        contentTags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return resources.map(resource => ({
      ...resource,
      tags: resource.contentTags.map(rt => rt.tag), // Replace string tags with actual tag objects
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
    }));
  });
