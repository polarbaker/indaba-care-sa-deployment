import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const updateChild = baseProcedure
  .input(
    z.object({
      token: z.string(),
      childId: z.string(),
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      dateOfBirth: z.string().transform(val => new Date(val)),
      gender: z.string().optional(),
      medicalInfo: z.object({
        conditions: z.array(z.string()).optional(),
        medications: z.array(z.object({
          name: z.string(),
          dosage: z.string(),
          frequency: z.string(),
          notes: z.string().optional()
        })).optional(),
        doctorName: z.string().optional(),
        doctorPhone: z.string().optional(),
        bloodType: z.string().optional(),
        emergencyNotes: z.string().optional()
      }).optional(),
      allergies: z.array(z.object({
        allergen: z.string(),
        severity: z.enum(["Mild", "Moderate", "Severe"]),
        symptoms: z.array(z.string()).optional(),
        treatment: z.string().optional()
      })).optional(),
      profileImageUrl: z.string().optional()
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
        children: true
      }
    });
    
    if (!parentProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Parent profile not found",
      });
    }
    
    // Check if child belongs to this parent
    const childBelongsToParent = parentProfile.children.some(child => child.id === input.childId);
    
    if (!childBelongsToParent) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to update this child",
      });
    }
    
    // Update child
    const updatedChild = await db.child.update({
      where: { id: input.childId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        medicalInfo: input.medicalInfo ? JSON.stringify(input.medicalInfo) : undefined,
        allergies: input.allergies ? JSON.stringify(input.allergies) : undefined,
        profileImageUrl: input.profileImageUrl,
      },
    });
    
    return { success: true, child: updatedChild };
  });
