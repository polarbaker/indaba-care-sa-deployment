import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const exportUserData = baseProcedure
  .input(
    z.object({
      token: z.string(),
      format: z.enum(["json", "csv"]).default("json"),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Get user data based on role
    let userData: any = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        pronouns: user.pronouns,
        timeZone: user.timeZone,
        locale: user.locale,
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
        profileVisibility: user.profileVisibility,
        marketingOptIn: user.marketingOptIn,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
    
    // Get profile data based on role
    if (user.role === "NANNY" && user.nannyProfile) {
      const nannyProfile = await db.nannyProfile.findUnique({
        where: { id: user.nannyProfile.id },
        include: {
          certifications: true,
          observations: {
            select: {
              id: true,
              childId: true,
              type: true,
              content: true,
              notes: true,
              createdAt: true,
            },
          },
          assignedFamilies: {
            include: {
              family: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          hoursLogs: true,
        },
      });
      
      userData.profile = nannyProfile;
    } else if (user.role === "PARENT" && user.parentProfile) {
      const parentProfile = await db.parentProfile.findUnique({
        where: { id: user.parentProfile.id },
        include: {
          children: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              gender: true,
              createdAt: true,
            },
          },
          family: {
            include: {
              nannies: {
                include: {
                  nanny: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      
      userData.profile = parentProfile;
    } else if (user.role === "ADMIN" && user.adminProfile) {
      const adminProfile = await db.adminProfile.findUnique({
        where: { id: user.adminProfile.id },
      });
      
      userData.profile = adminProfile;
    }
    
    // Get notification settings
    const notificationSettings = await db.userNotificationSettings.findUnique({
      where: { userId: user.id },
    });
    
    if (notificationSettings) {
      userData.notificationSettings = notificationSettings;
    }
    
    // Get sync settings
    const syncSettings = await db.userSettings.findUnique({
      where: { userId: user.id },
    });
    
    if (syncSettings) {
      userData.syncSettings = syncSettings;
    }
    
    // In a real implementation, you would:
    // 1. Format the data according to the requested format (JSON or CSV)
    // 2. Store the exported data file somewhere (e.g., S3)
    // 3. Return a download URL or send an email with the download link
    
    return {
      success: true,
      message: "Data export initiated successfully. You'll receive an email with your data soon.",
      // In a real implementation, you might return a job ID or status URL
      // downloadUrl: "https://example.com/exports/123.json",
    };
  });
