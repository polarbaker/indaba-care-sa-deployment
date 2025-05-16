import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const addChild = baseProcedure
  .input(
    z.object({
      token: z.string(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      dateOfBirth: z.string().datetime(), // Expect ISO string
      gender: z.string().optional(),
      profileImageUrl: z.string().url().optional().or(z.literal("")),
    })
  )
  .mutation(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    validateUserRole(user, ["PARENT"]);

    const parentProfile = await db.parentProfile.findUnique({
      where: { userId: user.id },
      include: { family: true }, // Ensure family is included
    });

    if (!parentProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Parent profile not found.",
      });
    }
    
    // Ensure family exists, create if not
    let familyId = parentProfile.family?.id;
    if (!familyId) {
      const newFamily = await db.family.create({
        data: {
          name: `${parentProfile.firstName} ${parentProfile.lastName}'s Family`,
          parentId: parentProfile.id,
        },
      });
      familyId = newFamily.id;
    }

    const newChild = await db.child.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: new Date(input.dateOfBirth),
        gender: input.gender,
        profileImageUrl: input.profileImageUrl || null,
        parentId: parentProfile.id,
        familyId: familyId, // Link child to family
      },
    });

    return newChild;
  });
