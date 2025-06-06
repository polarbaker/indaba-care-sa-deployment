import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const updateNannyProfile = baseProcedure
  .input(
    z.object({
      token: z.string(),
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      phoneNumber: z.string().optional(),
      location: z.string().optional(),
      bio: z.string().optional(),
      availability: z.string().optional(),
      profileImageUrl: z.string().optional(),
      coverImageUrl: z.string().optional(),
      specialties: z.array(z.string()).optional(),
      yearsOfExperience: z.number().optional(),
      languages: z.array(z.string()).optional(),
      displayName: z.string().optional(),
      pronouns: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Validate user is a nanny
    validateUserRole(user, ["NANNY"]);
    
    // Get nanny profile
    const nannyProfile = await db.nannyProfile.findUnique({
      where: { userId: user.id },
    });
    
    if (!nannyProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Nanny profile not found",
      });
    }
    
    // Update the nanny profile
    const updatedProfile = await db.nannyProfile.update({
      where: { id: nannyProfile.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        phoneNumber: input.phoneNumber,
        location: input.location,
        bio: input.bio,
        availability: input.availability,
        profileImageUrl: input.profileImageUrl,
        coverImageUrl: input.coverImageUrl,
        specialties: input.specialties,
        yearsOfExperience: input.yearsOfExperience,
        languages: input.languages,
      },
    });
    
    // If displayName or pronouns are provided, update the user record as well
    if (input.displayName || input.pronouns) {
      await db.user.update({
        where: { id: user.id },
        data: {
          displayName: input.displayName,
          pronouns: input.pronouns,
        },
      });
    }
    
    return updatedProfile;
  });
