import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const syncOperation = baseProcedure
  .input(
    z.object({
      token: z.string(),
      operationType: z.enum(["CREATE", "UPDATE", "DELETE"]),
      modelName: z.string(),
      recordId: z.string(),
      data: z.record(z.unknown()),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Log the sync operation
    const syncLog = await db.syncLog.create({
      data: {
        userId: user.id,
        operationType: input.operationType,
        modelName: input.modelName,
        recordId: input.recordId,
        changeData: JSON.stringify(input.data),
        syncStatus: "Pending",
      },
    });
    
    try {
      // Process the sync operation based on the model and operation type
      // This is a simplified implementation - in a real app, you would have specific handlers for each model
      
      switch (input.modelName) {
        case "Observation":
          await processObservationSync(input, user.id);
          break;
        case "Message":
          await processMessageSync(input, user.id);
          break;
        case "NannyProfile":
          await processNannyProfileSync(input, user.id);
          break;
        case "Certification":
          await processCertificationSync(input, user.id);
          break;
        case "ParentProfile":
          await processParentProfileSync(input, user.id);
          break;
        case "Child":
          await processChildSync(input, user.id);
          break;
        case "Family":
          await processFamilySync(input, user.id);
          break;
        case "ChildMilestone":
          await processChildMilestoneSync(input, user.id);
          break;
        case "FlaggedContent":
          await processFlaggedContentSync(input, user.id);
          break;
        case "Agency":
          await processAgencySync(input, user.id);
          break;
        case "AgencyNanny":
          await processAgencyNannySync(input, user.id);
          break;
        case "ReportSchedule":
          await processReportScheduleSync(input, user.id);
          break;
        case "ContentTag":
          await processContentTagSync(input, user.id);
          break;
        case "ResourceTag":
          await processResourceTagSync(input, user.id);
          break;
        case "User":
          await processUserSync(input, user.id);
          break;
        case "UserSettings":
          await processUserSettingsSync(input, user.id);
          break;
        case "UserNotificationSettings":
          await processUserNotificationSettingsSync(input, user.id);
          break;
        // Add more cases for other models as needed
        default:
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Unsupported model: ${input.modelName}`,
          });
      }
      
      // Update sync log status
      await db.syncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: "Completed",
          syncedAt: new Date(),
        },
      });
      
      return { success: true };
    } catch (error) {
      // Update sync log status
      await db.syncLog.update({
        where: { id: syncLog.id },
        data: {
          syncStatus: "Failed",
        },
      });
      
      throw error;
    }
  });

// Helper function to process Observation sync operations
async function processObservationSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string;
    data: Record<string, unknown>;
  },
  userId: string
) {
  const nannyProfile = await db.nannyProfile.findUnique({
    where: { userId },
  });
  
  if (!nannyProfile) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only nannies can sync observations",
    });
  }
  
  switch (input.operationType) {
    case "CREATE":
      await db.observation.create({
        data: {
          id: input.recordId, // Use the client-generated ID
          nannyId: nannyProfile.id,
          childId: input.data.childId as string,
          type: input.data.type as "TEXT" | "PHOTO" | "VIDEO" | "AUDIO",
          content: input.data.content as string,
          notes: input.data.notes as string | undefined,
          isPermanent: input.data.isPermanent as boolean | undefined,
          aiTags: input.data.aiTags as string | undefined,
        },
      });
      break;
    case "UPDATE":
      await db.observation.update({
        where: { id: input.recordId },
        data: {
          content: input.data.content as string | undefined,
          notes: input.data.notes as string | undefined,
          isPermanent: input.data.isPermanent as boolean | undefined,
          aiTags: input.data.aiTags as string | undefined,
        },
      });
      break;
    case "DELETE":
      await db.observation.delete({
        where: { id: input.recordId },
      });
      break;
  }
}

// Helper function to process Message sync operations
async function processMessageSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string;
    data: Record<string, unknown>;
  },
  userId: string
) {
  switch (input.operationType) {
    case "CREATE":
      await db.message.create({
        data: {
          id: input.recordId, // Use the client-generated ID
          content: input.data.content as string,
          encryptedContent: input.data.encryptedContent as string | undefined,
          senderId: userId,
          recipientId: input.data.recipientId as string,
          aiSummary: input.data.aiSummary as string | undefined,
        },
      });
      break;
    case "UPDATE":
      await db.message.update({
        where: { id: input.recordId },
        data: {
          isRead: input.data.isRead as boolean | undefined,
        },
      });
      break;
    case "DELETE":
      await db.message.delete({
        where: { id: input.recordId },
      });
      break;
  }
}

// Helper function to process NannyProfile sync operations
async function processNannyProfileSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string;
    data: Record<string, unknown>;
  },
  userId: string
) {
  // Only UPDATE is supported for NannyProfile
  if (input.operationType !== "UPDATE") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unsupported operation for NannyProfile: ${input.operationType}`,
    });
  }
  
  // Get the nanny profile
  const nannyProfile = await db.nannyProfile.findUnique({
    where: { userId },
  });
  
  if (!nannyProfile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Nanny profile not found",
    });
  }
  
  // Verify the profile ID matches
  if (nannyProfile.id !== input.recordId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to update this profile",
    });
  }
  
  // Update the profile
  await db.nannyProfile.update({
    where: { id: nannyProfile.id },
    data: {
      firstName: input.data.firstName as string,
      lastName: input.data.lastName as string,
      phoneNumber: input.data.phoneNumber as string | undefined,
      location: input.data.location as string | undefined,
      bio: input.data.bio as string | undefined,
      availability: input.data.availability as string | undefined,
      profileImageUrl: input.data.profileImageUrl as string | undefined,
    },
  });
}

// Helper function to process Certification sync operations
async function processCertificationSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string;
    data: Record<string, unknown>;
  },
  userId: string
) {
  // Get the nanny profile
  const nannyProfile = await db.nannyProfile.findUnique({
    where: { userId },
  });
  
  if (!nannyProfile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Nanny profile not found",
    });
  }
  
  switch (input.operationType) {
    case "CREATE":
      await db.certification.create({
        data: {
          id: input.recordId, // Use the client-generated ID
          nannyId: nannyProfile.id,
          name: input.data.name as string,
          issuingAuthority: input.data.issuingAuthority as string,
          dateIssued: new Date(input.data.dateIssued as string),
          expiryDate: input.data.expiryDate ? new Date(input.data.expiryDate as string) : null,
          certificateUrl: input.data.certificateUrl as string | undefined,
          status: input.data.status as string,
        },
      });
      break;
      
    case "UPDATE":
      // Verify the certification belongs to this nanny
      const existingCert = await db.certification.findUnique({
        where: { id: input.recordId },
      });
      
      if (!existingCert || existingCert.nannyId !== nannyProfile.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this certification",
        });
      }
      
      await db.certification.update({
        where: { id: input.recordId },
        data: {
          name: input.data.name as string,
          issuingAuthority: input.data.issuingAuthority as string,
          dateIssued: new Date(input.data.dateIssued as string),
          expiryDate: input.data.expiryDate ? new Date(input.data.expiryDate as string) : null,
          certificateUrl: input.data.certificateUrl as string | undefined,
          status: input.data.status as string,
        },
      });
      break;
      
    case "DELETE":
      // Verify the certification belongs to this nanny
      const certToDelete = await db.certification.findUnique({
        where: { id: input.recordId },
      });
      
      if (!certToDelete || certToDelete.nannyId !== nannyProfile.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this certification",
        });
      }
      
      await db.certification.delete({
        where: { id: input.recordId },
      });
      break;
  }
}

// Helper function to process ParentProfile sync operations
async function processParentProfileSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string;
    data: Record<string, unknown>;
  },
  userId: string
) {
  // Only UPDATE is supported for ParentProfile
  if (input.operationType !== "UPDATE") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unsupported operation for ParentProfile: ${input.operationType}`,
    });
  }
  
  // Get the parent profile
  const parentProfile = await db.parentProfile.findUnique({
    where: { userId },
  });
  
  if (!parentProfile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Parent profile not found",
    });
  }
  
  // Verify the profile ID matches
  if (parentProfile.id !== input.recordId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to update this profile",
    });
  }
  
  // Update the profile
  await db.parentProfile.update({
    where: { id: parentProfile.id },
    data: {
      firstName: input.data.firstName as string,
      lastName: input.data.lastName as string,
      phoneNumber: input.data.phoneNumber as string | undefined,
      address: input.data.address as string | undefined,
      profileImageUrl: input.data.profileImageUrl as string | undefined,
    },
  });
}

// Helper function to process Child sync operations
async function processChildSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string;
    data: Record<string, unknown>;
  },
  userId: string
) {
  // Get the parent profile
  const parentProfile = await db.parentProfile.findUnique({
    where: { userId },
    include: {
      children: {
        select: { id: true }
      }
    }
  });
  
  if (!parentProfile) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only parents can sync child data",
    });
  }
  
  switch (input.operationType) {
    case "CREATE":
      await db.child.create({
        data: {
          id: input.recordId, // Use the client-generated ID
          parentId: parentProfile.id,
          firstName: input.data.firstName as string,
          lastName: input.data.lastName as string,
          dateOfBirth: new Date(input.data.dateOfBirth as string),
          gender: input.data.gender as string | undefined,
          medicalInfo: input.data.medicalInfo as string | undefined,
          allergies: input.data.allergies as string | undefined,
          profileImageUrl: input.data.profileImageUrl as string | undefined,
          familyId: input.data.familyId as string | undefined,
        },
      });
      break;
    case "UPDATE":
      // Verify the child belongs to this parent
      const childIds = parentProfile.children.map(child => child.id);
      if (!childIds.includes(input.recordId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this child",
        });
      }
      
      await db.child.update({
        where: { id: input.recordId },
        data: {
          firstName: input.data.firstName as string | undefined,
          lastName: input.data.lastName as string | undefined,
          dateOfBirth: input.data.dateOfBirth ? new Date(input.data.dateOfBirth as string) : undefined,
          gender: input.data.gender as string | undefined,
          medicalInfo: input.data.medicalInfo as string | undefined,
          allergies: input.data.allergies as string | undefined,
          profileImageUrl: input.data.profileImageUrl as string | undefined,
        },
      });
      break;
    case "DELETE":
      // Verify the child belongs to this parent
      const childToDeleteIds = parentProfile.children.map(child => child.id);
      if (!childToDeleteIds.includes(input.recordId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this child",
        });
      }
      
      await db.child.delete({
        where: { id: input.recordId },
      });
      break;
  }
}

// Helper function to process Family sync operations
async function processFamilySync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string;
    data: Record<string, unknown>;
  },
  userId: string
) {
  // Get the parent profile
  const parentProfile = await db.parentProfile.findUnique({
    where: { userId },
    include: {
      family: true
    }
  });
  
  if (!parentProfile) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only parents can sync family data",
    });
  }
  
  switch (input.operationType) {
    case "CREATE":
      // Check if parent already has a family
      if (parentProfile.family) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Parent already has a family",
        });
      }
      
      await db.family.create({
        data: {
          id: input.recordId, // Use the client-generated ID
          name: input.data.name as string,
          parentId: parentProfile.id,
          homeDetails: input.data.homeDetails as string | undefined,
        },
      });
      break;
    case "UPDATE":
      // Verify the family belongs to this parent
      if (!parentProfile.family || parentProfile.family.id !== input.recordId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this family",
        });
      }
      
      await db.family.update({
        where: { id: input.recordId },
        data: {
          name: input.data.name as string | undefined,
          homeDetails: input.data.homeDetails as string | undefined,
        },
      });
      break;
    case "DELETE":
      // Family deletion is not supported
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Family deletion is not supported",
      });
  }
}

// Helper function to process ChildMilestone sync operations
async function processChildMilestoneSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string;
    data: Record<string, unknown>;
  },
  userId: string
) {
  // Get the user's role and associated profile
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  
  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }
  
  // Verify user has permission to manage this child's milestones
  const childId = input.data.childId as string;
  let hasPermission = false;
  
  if (user.role === "PARENT") {
    // Check if parent owns this child
    const parentProfile = await db.parentProfile.findFirst({
      where: { userId },
      include: {
        children: {
          select: { id: true }
        }
      }
    });
    
    if (parentProfile) {
      hasPermission = parentProfile.children.some(child => child.id === childId);
    }
  } else if (user.role === "NANNY") {
    // Check if nanny is assigned to this child's family
    const nannyProfile = await db.nannyProfile.findFirst({
      where: { userId },
      include: {
        assignedFamilies: {
          include: {
            family: {
              include: {
                children: {
                  select: { id: true }
                }
              }
            }
          }
        }
      }
    });
    
    if (nannyProfile) {
      hasPermission = nannyProfile.assignedFamilies.some(
        assignment => assignment.family.children.some(child => child.id === childId)
      );
    }
  }
  
  if (!hasPermission) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to manage this child's milestones",
    });
  }
  
  switch (input.operationType) {
    case "CREATE":
      await db.childMilestone.create({
        data: {
          id: input.recordId, // Use the client-generated ID
          childId: childId,
          milestoneId: input.data.milestoneId as string,
          achievedDate: input.data.achievedDate ? new Date(input.data.achievedDate as string) : null,
          notes: input.data.notes as string | undefined,
        },
      });
      break;
    case "UPDATE":
      // Verify the milestone exists
      const milestone = await db.childMilestone.findUnique({
        where: { id: input.recordId },
        include: {
          child: true
        }
      });
      
      if (!milestone) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Child milestone not found",
        });
      }
      
      // Double-check permission for the specific milestone
      if (milestone.child.id !== childId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this milestone",
        });
      }
      
      await db.childMilestone.update({
        where: { id: input.recordId },
        data: {
          achievedDate: input.data.achievedDate ? new Date(input.data.achievedDate as string) : null,
          notes: input.data.notes as string | undefined,
        },
      });
      break;
    case "DELETE":
      // Verify the milestone exists
      const milestoneToDelete = await db.childMilestone.findUnique({
        where: { id: input.recordId },
        include: {
          child: true
        }
      });
      
      if (!milestoneToDelete) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Child milestone not found",
        });
      }
      
      // Double-check permission for the specific milestone
      if (milestoneToDelete.child.id !== childId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this milestone",
        });
      }
      
      await db.childMilestone.delete({
        where: { id: input.recordId },
      });
      break;
  }
}

async function processFlaggedContentSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string;
    data: Record<string, unknown>;
  },
  userId: string
) {
  const adminUser = await db.user.findUnique({ where: { id: userId } });
  if (!adminUser || adminUser.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can sync flagged content." });
  }

  switch (input.operationType) {
    case "CREATE":
      await db.flaggedContent.create({
        data: {
          id: input.recordId,
          contentType: input.data.contentType as string,
          contentId: input.data.contentId as string,
          flaggedBy: input.data.flaggedBy as string, // Should be current user if flagged offline by admin
          reason: input.data.reason as string,
          keywords: input.data.keywords as string | undefined,
          status: input.data.status as string,
          priority: input.data.priority as string,
          moderatorNotes: input.data.moderatorNotes as string | undefined,
        },
      });
      break;
    case "UPDATE":
      await db.flaggedContent.update({
        where: { id: input.recordId },
        data: {
          status: input.data.status as string | undefined,
          priority: input.data.priority as string | undefined,
          moderatorNotes: input.data.moderatorNotes as string | undefined,
          moderatedBy: userId,
          moderatedAt: new Date(),
        },
      });
      break;
    case "DELETE":
      // Generally, flagged content might be archived or status changed, not hard deleted.
      // For now, let's support delete if needed.
      await db.flaggedContent.delete({ where: { id: input.recordId } });
      break;
  }
}

async function processAgencySync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string;
    data: Record<string, unknown>;
  },
  userId: string
) {
  const adminUser = await db.user.findUnique({ where: { id: userId } });
  if (!adminUser || adminUser.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can sync agencies." });
  }

  switch (input.operationType) {
    case "CREATE":
      await db.agency.create({
        data: {
          id: input.recordId,
          name: input.data.name as string,
          contactPerson: input.data.contactPerson as string | undefined,
          contactEmail: input.data.contactEmail as string | undefined,
          contactPhone: input.data.contactPhone as string | undefined,
          address: input.data.address as string | undefined,
          description: input.data.description as string | undefined,
          emergencyProtocols: input.data.emergencyProtocols as string | undefined,
        },
      });
      break;
    case "UPDATE":
      await db.agency.update({
        where: { id: input.recordId },
        data: {
          name: input.data.name as string | undefined,
          contactPerson: input.data.contactPerson as string | undefined,
          contactEmail: input.data.contactEmail as string | undefined,
          contactPhone: input.data.contactPhone as string | undefined,
          address: input.data.address as string | undefined,
          description: input.data.description as string | undefined,
          emergencyProtocols: input.data.emergencyProtocols as string | undefined,
        },
      });
      break;
    case "DELETE":
      await db.agency.delete({ where: { id: input.recordId } });
      break;
  }
}

async function processAgencyNannySync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string; // This is AgencyNanny assignment ID
    data: Record<string, unknown>;
  },
  userId: string
) {
  const adminUser = await db.user.findUnique({ where: { id: userId } });
  if (!adminUser || adminUser.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can sync nanny agency assignments." });
  }

  switch (input.operationType) {
    case "CREATE":
      await db.agencyNanny.create({
        data: {
          id: input.recordId,
          agencyId: input.data.agencyId as string,
          nannyId: input.data.nannyId as string,
          role: input.data.role as string | undefined,
          status: input.data.status as string,
          payRate: input.data.payRate as number | undefined,
          paymentSchedule: input.data.paymentSchedule as string | undefined,
          startDate: input.data.startDate ? new Date(input.data.startDate as string) : new Date(),
        },
      });
      break;
    case "UPDATE":
      await db.agencyNanny.update({
        where: { id: input.recordId },
        data: {
          role: input.data.role as string | undefined,
          status: input.data.status as string | undefined,
          payRate: input.data.payRate as number | undefined,
          paymentSchedule: input.data.paymentSchedule as string | undefined,
          endDate: input.data.endDate ? new Date(input.data.endDate as string) : undefined,
        },
      });
      break;
    case "DELETE":
      await db.agencyNanny.delete({ where: { id: input.recordId } });
      break;
  }
}

async function processReportScheduleSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string;
    data: Record<string, unknown>;
  },
  userId: string
) {
  const adminUser = await db.user.findUnique({ where: { id: userId } });
  if (!adminUser || adminUser.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can sync report schedules." });
  }

  switch (input.operationType) {
    case "CREATE":
      await db.reportSchedule.create({
        data: {
          id: input.recordId,
          name: input.data.name as string,
          description: input.data.description as string | undefined,
          reportType: input.data.reportType as string,
          frequency: input.data.frequency as string,
          nextRunDate: new Date(input.data.nextRunDate as string),
          format: input.data.format as string[],
          recipients: input.data.recipients as string[],
          filters: input.data.filters as string | undefined,
          createdBy: userId,
          isActive: input.data.isActive as boolean | undefined ?? true,
        },
      });
      break;
    case "UPDATE":
      await db.reportSchedule.update({
        where: { id: input.recordId },
        data: {
          name: input.data.name as string | undefined,
          description: input.data.description as string | undefined,
          reportType: input.data.reportType as string | undefined,
          frequency: input.data.frequency as string | undefined,
          nextRunDate: input.data.nextRunDate ? new Date(input.data.nextRunDate as string) : undefined,
          format: input.data.format as string[] | undefined,
          recipients: input.data.recipients as string[] | undefined,
          filters: input.data.filters as string | undefined,
          isActive: input.data.isActive as boolean | undefined,
        },
      });
      break;
    case "DELETE":
      await db.reportSchedule.delete({ where: { id: input.recordId } });
      break;
  }
}

async function processContentTagSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string;
    data: Record<string, unknown>;
  },
  userId: string
) {
  const adminUser = await db.user.findUnique({ where: { id: userId } });
  if (!adminUser || adminUser.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can sync content tags." });
  }

  switch (input.operationType) {
    case "CREATE":
      await db.contentTag.create({
        data: {
          id: input.recordId,
          name: input.data.name as string,
          description: input.data.description as string | undefined,
          category: input.data.category as string | undefined,
          createdBy: userId,
        },
      });
      break;
    case "UPDATE":
      await db.contentTag.update({
        where: { id: input.recordId },
        data: {
          name: input.data.name as string | undefined,
          description: input.data.description as string | undefined,
          category: input.data.category as string | undefined,
        },
      });
      break;
    case "DELETE":
      await db.contentTag.delete({ where: { id: input.recordId } });
      break;
  }
}

async function processResourceTagSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string; // ResourceTag ID
    data: Record<string, unknown>;
  },
  userId: string
) {
  const adminUser = await db.user.findUnique({ where: { id: userId } });
  if (!adminUser || adminUser.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can sync resource tags." });
  }

  switch (input.operationType) {
    case "CREATE":
      // Ensure both resource and tag exist before creating relation
      const resource = await db.resource.findUnique({ where: { id: input.data.resourceId as string }});
      const tag = await db.contentTag.findUnique({ where: { id: input.data.tagId as string }});
      if (!resource || !tag) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Resource or Tag not found for ResourceTag creation." });
      }
      await db.resourceTag.create({
        data: {
          id: input.recordId,
          resourceId: input.data.resourceId as string,
          tagId: input.data.tagId as string,
        },
      });
      break;
    // UPDATE for ResourceTag is usually not needed as it's a join table.
    // Deleting and re-creating is common.
    case "UPDATE": 
       throw new TRPCError({ code: "BAD_REQUEST", message: "Updating ResourceTag directly is not typical. Delete and create new." });
    case "DELETE":
      await db.resourceTag.delete({ where: { id: input.recordId } });
      break;
  }
}

// Helper function to process User model sync operations (for privacy settings)
async function processUserSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string; // Should be 'current' or the user ID
    data: Record<string, unknown>;
  },
  userId: string
) {
  // Only UPDATE is supported for User (for these specific fields)
  if (input.operationType !== "UPDATE") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unsupported operation for User model in this context: ${input.operationType}`,
    });
  }
  
  // Update user privacy settings
  await db.user.update({
    where: { id: userId },
    data: {
      profileVisibility: input.data.profileVisibility as string | undefined,
      marketingOptIn: input.data.marketingOptIn as boolean | undefined,
      displayName: input.data.displayName as string | undefined,
      pronouns: input.data.pronouns as string | undefined,
      timeZone: input.data.timeZone as string | undefined,
      locale: input.data.locale as string | undefined,
    },
  });
}

// Helper function to process UserSettings sync operations
async function processUserSettingsSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string; // Should be 'current' or the user ID
    data: Record<string, unknown>;
  },
  userId: string
) {
  // Only UPDATE is supported for UserSettings
  if (input.operationType !== "UPDATE") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unsupported operation for UserSettings: ${input.operationType}`,
    });
  }
  
  // Update or create user settings
  await db.userSettings.upsert({
    where: { userId },
    update: {
      mediaCacheSize: input.data.mediaCacheSize as number | undefined,
      autoPurgePolicy: input.data.autoPurgePolicy as number | undefined,
      syncOnWifiOnly: input.data.syncOnWifiOnly as boolean | undefined,
      lastSyncAt: input.data.lastSyncAt ? new Date(input.data.lastSyncAt as string) : undefined,
    },
    create: {
      userId,
      mediaCacheSize: input.data.mediaCacheSize as number,
      autoPurgePolicy: input.data.autoPurgePolicy as number,
      syncOnWifiOnly: input.data.syncOnWifiOnly as boolean,
      lastSyncAt: input.data.lastSyncAt ? new Date(input.data.lastSyncAt as string) : undefined,
    },
  });
}

// Helper function to process UserNotificationSettings sync operations
async function processUserNotificationSettingsSync(
  input: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    recordId: string; // Should be 'current' or the user ID
    data: Record<string, unknown>;
  },
  userId: string
) {
  // Only UPDATE is supported for UserNotificationSettings
  if (input.operationType !== "UPDATE") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unsupported operation for UserNotificationSettings: ${input.operationType}`,
    });
  }
  
  // Update or create notification settings
  await db.userNotificationSettings.upsert({
    where: { userId },
    update: {
      inAppMessages: input.data.inAppMessages as boolean | undefined,
      inAppObservations: input.data.inAppObservations as boolean | undefined,
      inAppApprovals: input.data.inAppApprovals as boolean | undefined,
      inAppEmergencies: input.data.inAppEmergencies as boolean | undefined,
      emailMessages: input.data.emailMessages as boolean | undefined,
      emailObservations: input.data.emailObservations as boolean | undefined,
      emailApprovals: input.data.emailApprovals as boolean | undefined,
      emailEmergencies: input.data.emailEmergencies as boolean | undefined,
      smsMessages: input.data.smsMessages as boolean | undefined,
      smsObservations: input.data.smsObservations as boolean | undefined,
      smsApprovals: input.data.smsApprovals as boolean | undefined,
      smsEmergencies: input.data.smsEmergencies as boolean | undefined,
    },
    create: {
      userId,
      inAppMessages: input.data.inAppMessages as boolean,
      inAppObservations: input.data.inAppObservations as boolean,
      inAppApprovals: input.data.inAppApprovals as boolean,
      inAppEmergencies: input.data.inAppEmergencies as boolean,
      emailMessages: input.data.emailMessages as boolean,
      emailObservations: input.data.emailObservations as boolean,
      emailApprovals: input.data.emailApprovals as boolean,
      emailEmergencies: input.data.emailEmergencies as boolean,
      smsMessages: input.data.smsMessages as boolean,
      smsObservations: input.data.smsObservations as boolean,
      smsApprovals: input.data.smsApprovals as boolean,
      smsEmergencies: input.data.smsEmergencies as boolean,
    },
  });
}
