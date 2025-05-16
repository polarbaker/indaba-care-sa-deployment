import { z } from "zod";
import { baseProcedure } from "~/server/api/trpc";
import { getUserFromToken, validateUserRole } from "~/lib/auth";
// import { db } from "~/server/db"; // If storing keywords in DB

export const addKeywordFlag = baseProcedure
  .input(
    z.object({
      token: z.string(),
      keyword: z.string().min(1),
      // category: z.string().optional(), // e.g., 'Emergency', 'Inappropriate'
      // priority: z.string().optional(), // e.g., 'Urgent'
    })
  )
  .mutation(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    // Placeholder: In a real app, you'd store this keyword in a config file or database
    // For example, if using a KeywordFlag model:
    // await db.keywordFlag.create({
    //   data: {
    //     keyword: input.keyword,
    //     addedBy: adminUser.id,
    //     // category: input.category,
    //     // priority: input.priority,
    //   },
    // });
    
    console.log(`Admin ${adminUser.email} added keyword flag: "${input.keyword}"`);

    return { success: true, keyword: input.keyword };
  });
