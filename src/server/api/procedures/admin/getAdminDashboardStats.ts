import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const getAdminDashboardStats = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Validate user is an admin
    validateUserRole(user, ["ADMIN"]);
    
    // Get counts for dashboard stats
    const [
      totalUsers,
      nannies,
      parents,
      observations,
      certifications,
      pendingFlags,
      recentUsers,
      recentActivity
    ] = await Promise.all([
      // Total users
      db.user.count(),
      
      // Nannies count
      db.user.count({
        where: { role: "NANNY" }
      }),
      
      // Parents count
      db.user.count({
        where: { role: "PARENT" }
      }),
      
      // Observations count
      db.observation.count(),
      
      // Active certifications count
      db.certification.count({
        where: { status: "Active" }
      }),
      
      // Pending flags count
      db.flaggedContent.count({
        where: { status: "Pending" }
      }),
      
      // Recent users
      db.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          nannyProfile: true,
          parentProfile: true,
          adminProfile: true,
        }
      }),
      
      // Recent activity
      getRecentActivity()
    ]);
    
    // Format recent users
    const formattedRecentUsers = recentUsers.map(user => {
      let name = "";
      
      if (user.role === "NANNY" && user.nannyProfile) {
        name = `${user.nannyProfile.firstName} ${user.nannyProfile.lastName}`;
      } else if (user.role === "PARENT" && user.parentProfile) {
        name = `${user.parentProfile.firstName} ${user.parentProfile.lastName}`;
      } else if (user.role === "ADMIN" && user.adminProfile) {
        name = `${user.adminProfile.firstName} ${user.adminProfile.lastName}`;
      }
      
      return {
        id: user.id,
        name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      };
    });
    
    return {
      totalUsers,
      nannies,
      parents,
      observations,
      certifications,
      pendingFlags,
      recentUsers: formattedRecentUsers,
      recentActivity
    };
  });

// Helper function to get recent activity from various tables
async function getRecentActivity() {
  // Get recent user registrations
  const recentUsers = await db.user.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: {
      nannyProfile: true,
      parentProfile: true,
      adminProfile: true,
    }
  });
  
  // Get recent observations
  const recentObservations = await db.observation.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: {
      nanny: true,
      child: true,
    }
  });
  
  // Get recent flagged content
  const recentFlags = await db.flaggedContent.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
  });
  
  // Get recent certifications
  const recentCertifications = await db.certification.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: {
      nanny: true,
    }
  });
  
  // Combine and format all activities
  const activities = [
    ...recentUsers.map(user => {
      let name = user.email;
      
      if (user.role === "NANNY" && user.nannyProfile) {
        name = `${user.nannyProfile.firstName} ${user.nannyProfile.lastName}`;
      } else if (user.role === "PARENT" && user.parentProfile) {
        name = `${user.parentProfile.firstName} ${user.parentProfile.lastName}`;
      } else if (user.role === "ADMIN" && user.adminProfile) {
        name = `${user.adminProfile.firstName} ${user.adminProfile.lastName}`;
      }
      
      return {
        id: user.id,
        type: 'user_created',
        description: `New ${user.role.toLowerCase()} account created: ${name}`,
        timestamp: user.createdAt.toISOString(),
      };
    }),
    
    ...recentObservations.map(obs => ({
      id: obs.id,
      type: 'observation_created',
      description: `New ${obs.type.toLowerCase()} observation by ${obs.nanny.firstName} ${obs.nanny.lastName} for ${obs.child.firstName} ${obs.child.lastName}`,
      timestamp: obs.createdAt.toISOString(),
    })),
    
    ...recentFlags.map(flag => ({
      id: flag.id,
      type: 'content_flagged',
      description: `Content flagged: ${flag.contentType} (${flag.reason})`,
      timestamp: flag.createdAt.toISOString(),
    })),
    
    ...recentCertifications.map(cert => ({
      id: cert.id,
      type: 'certification_added',
      description: `New certification added for ${cert.nanny.firstName} ${cert.nanny.lastName}: ${cert.name}`,
      timestamp: cert.createdAt.toISOString(),
    })),
  ];
  
  // Sort by timestamp (most recent first) and take the first 10
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);
}
