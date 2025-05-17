import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const getNannyProfile = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Validate user is a nanny
    validateUserRole(user, ["NANNY"]);
    
    // Get nanny profile with certifications and assigned families
    const nannyProfile = await db.nannyProfile.findUnique({
      where: { userId: user.id },
      include: {
        certifications: {
          orderBy: { expiryDate: 'asc' }
        },
        assignedFamilies: {
          where: { status: "Active" },
          include: {
            family: {
              include: {
                children: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    dateOfBirth: true,
                    profileImageUrl: true,
                  },
                },
                parent: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                    profileImageUrl: true,
                  }
                }
              },
            },
          },
        },
        user: {
          select: {
            displayName: true,
            pronouns: true,
            email: true,
            phoneVerified: true,
            timeZone: true,
            locale: true,
            profileVisibility: true,
            marketingOptIn: true,
            notificationSettings: true,
            settings: true,
          }
        }
      },
    });
    
    if (!nannyProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Nanny profile not found",
      });
    }
    
    // Format the response to include calculated fields
    const formattedProfile = {
      ...nannyProfile,
      certifications: nannyProfile.certifications.map(cert => ({
        ...cert,
        isExpired: cert.expiryDate ? new Date(cert.expiryDate) < new Date() : false,
        expiresInDays: cert.expiryDate 
          ? Math.ceil((new Date(cert.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })),
      assignedFamilies: nannyProfile.assignedFamilies.map(assignment => ({
        id: assignment.id,
        startDate: assignment.startDate,
        family: {
          id: assignment.family.id,
          name: assignment.family.name,
          homeDetails: assignment.family.homeDetails,
          parent: assignment.family.parent,
          children: assignment.family.children.map(child => ({
            ...child,
            age: calculateAge(child.dateOfBirth),
          })),
        },
      })),
    };
    
    return formattedProfile;
  });

// Helper function to calculate age from date of birth
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}
