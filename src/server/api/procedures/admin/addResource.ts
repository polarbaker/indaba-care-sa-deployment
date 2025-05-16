import { z } from "zod";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";
// import { generateAITagsForResource } from "~/lib/ai"; // Assuming an AI tagging helper

export const addResource = baseProcedure
  .input(
    z.object({
      token: z.string(),
      title: z.string().min(1),
      description: z.string().min(1),
      contentUrl: z.string().url(),
      resourceType: z.string(),
      visibleTo: z.array(z.string()), // Array of role names
      developmentalStage: z.string().optional(),
      tags: z.array(z.string()).optional(), // Array of ContentTag IDs
      enableAITagging: z.boolean().optional().default(false),
    })
  )
  .mutation(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const { token, enableAITagging, tags, ...resourceData } = input;
    
    let finalTags = tags || [];
    
    // Placeholder for AI Tagging
    // if (enableAITagging) {
    //   const aiGeneratedTags = await generateAITagsForResource(resourceData.title, resourceData.description);
    //   // Logic to create/find these tags and add their IDs to finalTags
    //   // For simplicity, we'll assume AI tags are just strings for now if not using ContentTag model for them
    //   resourceData.aiTags = JSON.stringify(aiGeneratedTags); 
    // }

    const resource = await db.resource.create({
      data: {
        ...resourceData,
        createdBy: adminUser.id,
        tags: "[]", // Initialize as empty JSON array, will be populated via ResourceTag
        contentTags: finalTags.length > 0 ? {
          create: finalTags.map(tagId => ({
            tag: { connect: { id: tagId } },
          })),
        } : undefined,
      },
    });

    return { success: true, resource };
  });
