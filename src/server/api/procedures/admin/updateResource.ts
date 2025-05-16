import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const updateResource = baseProcedure
  .input(
    z.object({
      token: z.string(),
      resourceId: z.string(),
      title: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      contentUrl: z.string().url().optional(),
      resourceType: z.string().optional(),
      visibleTo: z.array(z.string()).optional(),
      developmentalStage: z.string().optional().nullable(),
      tags: z.array(z.string()).optional(), // Array of ContentTag IDs
      previewEnabled: z.boolean().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const { resourceId, token, tags, ...resourceUpdateData } = input;

    const resource = await db.resource.findUnique({ where: { id: resourceId } });
    if (!resource) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found." });
    }

    // Handle tag updates
    if (tags) {
      // First, remove existing tags
      await db.resourceTag.deleteMany({
        where: { resourceId: resourceId },
      });
      // Then, add new tags
      if (tags.length > 0) {
        await db.resourceTag.createMany({
          data: tags.map(tagId => ({
            resourceId: resourceId,
            tagId: tagId,
          })),
        });
      }
    }
    
    const updatedResource = await db.resource.update({
      where: { id: resourceId },
      data: {
        ...resourceUpdateData,
        developmentalStage: input.developmentalStage === null ? null : input.developmentalStage, // Handle explicit null
      },
    });

    return { success: true, resource: updatedResource };
  });
