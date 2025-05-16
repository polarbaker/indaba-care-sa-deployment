import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const updateParentProfile = baseProcedure
  .input(
    z.object({
      token: z.string(),
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      phoneNumber: z.string().optional(),
      address: z.string().optional(),
      profileImageUrl: z.string().optional(),
      familyName: z.string().optional(), // Added
      contactInfo: z.object({ // Added
        primaryParent: z.object({
          name: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          address: z.string().optional(),
        }).optional(),
        secondaryParent: z.object({
          name: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          address: z.string().optional(),
        }).optional(),
        emergencyContact: z.object({
          name: z.string().optional(),
          relationship: z.string().optional(),
          phone: z.string().optional(),
        }).optional(),
      }).optional(),
      homeDetails: z.object({
        homeType: z.string().optional(),
        numberOfBedrooms: z.number().optional(),
        hasOutdoorSpace: z.boolean().optional(),
        petDetails: z.string().optional(),
        safetyInstructions: z.string().optional(), // Added
        routines: z.string().optional(), // Added
        dietaryRestrictions: z.string().optional(),
        householdMembers: z.array(z.object({
          relationship: z.string(),
          name: z.string().optional(),
          age: z.number().optional()
        })).optional(),
        importantNotes: z.string().optional(),
        preferredActivities: z.array(z.string()).optional(),
        houseRules: z.array(z.string()).optional()
      }).optional()
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Validate user is a parent
    validateUserRole(user, ["PARENT"]);
    
    // Get parent profile
    const parentProfile = await db.parentProfile.findUnique({
      where: { userId: user.id },
      include: {
        family: true
      }
    });
    
    if (!parentProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Parent profile not found",
      });
    }
    
    // Update parent profile
    const updatedProfile = await db.parentProfile.update({
      where: { id: parentProfile.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        phoneNumber: input.phoneNumber,
        address: input.address,
        profileImageUrl: input.profileImageUrl,
      },
    });
    
    // Update family home details and contact info if provided
    if (input.homeDetails || input.contactInfo || input.familyName) {
      if (parentProfile.family) {
        // Update existing family
        await db.family.update({
          where: { id: parentProfile.family.id },
          data: {
            ...(input.familyName && { name: input.familyName }),
            ...(input.homeDetails && { homeDetails: JSON.stringify(input.homeDetails) }),
            ...(input.contactInfo && { contactInfo: JSON.stringify(input.contactInfo) }),
          },
        });
      } else {
        // Create new family
        await db.family.create({
          data: {
            name: input.familyName || `${input.firstName} ${input.lastName}'s Family`,
            parentId: parentProfile.id,
            ...(input.homeDetails && { homeDetails: JSON.stringify(input.homeDetails) }),
            ...(input.contactInfo && { contactInfo: JSON.stringify(input.contactInfo) }),
          },
        });
      }
    }
    
    return { success: true, profile: updatedProfile };
  });
