import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const addContentTag = baseProcedure
  .input(
    z.object({
      token: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const existingTag = await db.contentTag.findUnique({ where: { name: input.name } });
    if (existingTag) {
      throw new TRPCError({ code: "CONFLICT", message: "A tag with this name already exists." });
    }

    const newTag = await db.contentTag.create({
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        createdBy: adminUser.id,
      },
    });

    return { success: true, tag: newTag };
  });
