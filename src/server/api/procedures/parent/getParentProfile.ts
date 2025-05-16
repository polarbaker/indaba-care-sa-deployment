import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const getParentProfile = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Validate user is a parent
    validateUserRole(user, ["PARENT"]);
    
    // Get parent profile with children, family, and assigned nannies
    const parentProfile = await db.parentProfile.findUnique({
      where: { userId: user.id },
      include: {
        children: {
          orderBy: { firstName: 'asc' }
        },
        family: {
          include: {
            nannies: {
              where: { status: "Active" },
              include: {
                nanny: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                    profileImageUrl: true,
                    availability: true,
                    bio: true,
                    hoursLogs: {
                      orderBy: { date: 'desc' },
                      take: 10
                    },
                    certifications: {
                      where: { status: "Active" },
                      select: {
                        id: true,
                        name: true,
                        issuingAuthority: true,
                        expiryDate: true,
                        status: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
    });
    
    if (!parentProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Parent profile not found",
      });
    }
    
    // Format the response to include calculated fields
    const formattedProfile = {
      ...parentProfile,
      children: parentProfile.children.map(child => ({
        ...child,
        age: calculateAge(child.dateOfBirth),
        // Parse medical info and allergies if they exist
        parsedMedicalInfo: child.medicalInfo ? JSON.parse(child.medicalInfo) : null,
        parsedAllergies: child.allergies ? JSON.parse(child.allergies) : null,
      })),
      family: parentProfile.family ? {
        ...parentProfile.family,
        parsedHomeDetails: parentProfile.family.homeDetails ? JSON.parse(parentProfile.family.homeDetails) : null,
        nannies: parentProfile.family.nannies.map(assignment => ({
          id: assignment.id,
          startDate: assignment.startDate,
          nanny: {
            ...assignment.nanny,
            // Calculate total hours in the last 30 days
            recentHours: calculateRecentHours(assignment.nanny.hoursLogs),
            // Check if any certifications are expiring soon (next 30 days)
            hasExpiringCertifications: hasExpiringCertifications(assignment.nanny.certifications),
            certifications: assignment.nanny.certifications.map(cert => ({
              ...cert,
              isExpired: cert.expiryDate ? new Date(cert.expiryDate) < new Date() : false,
              expiresInDays: cert.expiryDate 
                ? Math.ceil((new Date(cert.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                : null,
            })),
          }
        }))
      } : null,
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

// Helper function to calculate total hours in the last 30 days
function calculateRecentHours(hoursLogs: { date: Date; hoursWorked: number }[]): number {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return hoursLogs
    .filter(log => new Date(log.date) >= thirtyDaysAgo)
    .reduce((total, log) => total + log.hoursWorked, 0);
}

// Helper function to check if any certifications are expiring soon
function hasExpiringCertifications(certifications: { expiryDate: Date | null }[]): boolean {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  return certifications.some(cert => 
    cert.expiryDate && 
    new Date(cert.expiryDate) > new Date() && 
    new Date(cert.expiryDate) <= thirtyDaysFromNow
  );
}
