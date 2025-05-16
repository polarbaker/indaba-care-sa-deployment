import {
  createCallerFactory,
  createTRPCRouter,
  baseProcedure,
} from "~/server/api/trpc";

// Auth procedures
import { register } from "./procedures/auth/register";
import { login } from "./procedures/auth/login";
import { getMe } from "./procedures/auth/getMe";
import { verifyToken } from "./procedures/auth/verifyToken";

// App procedures
import { getAIAvailability } from "./procedures/app/getAIAvailability";

// Sync procedures
import { syncOperation } from "./procedures/sync/syncOperation";

// Observation procedures
import { createObservation } from "./procedures/observations/createObservation";
import { getChildObservations } from "./procedures/observations/getChildObservations";
import { getObservations } from "./procedures/observations/getObservations";
import { getAssignedChildren } from "./procedures/observations/getAssignedChildren";

// Messaging procedures
import { sendMessage } from "./procedures/messaging/sendMessage";
import { getConversations } from "./procedures/messaging/getConversations";
import { getMessages } from "./procedures/messaging/getMessages";

// Nanny profile procedures
import { getNannyProfile } from "./procedures/nanny/getNannyProfile";
import { updateNannyProfile } from "./procedures/nanny/updateNannyProfile";
import { manageCertification } from "./procedures/nanny/manageCertification";

// Parent profile procedures
import { getParentProfile } from "./procedures/parent/getParentProfile";
import { updateParentProfile } from "./procedures/parent/updateParentProfile";
import { updateChild } from "./procedures/parent/updateChild";
import { getChildMilestones } from "./procedures/parent/getChildMilestones";
import { submitFeedback } from "./procedures/parent/submitFeedback";
import { updateFeedback } from "./procedures/parent/updateFeedback";
import { getFeedbackHistory } from "./procedures/parent/getFeedbackHistory";
import { achieveMilestone } from "./procedures/parent/achieveMilestone";
import { updateMilestone } from "./procedures/parent/updateMilestone";

// Admin procedures
import { getAdminDashboardStats } from "./procedures/admin/getAdminDashboardStats";
import { getAdminUsers } from "./procedures/admin/getAdminUsers";
import { getAdminUser } from "./procedures/admin/getAdminUser";
import { updateAdminUser } from "./procedures/admin/updateAdminUser";
import { getAdminFlaggedContent } from "./procedures/admin/getAdminFlaggedContent";
import { updateFlaggedContent } from "./procedures/admin/updateFlaggedContent";
import { addKeywordFlag } from "./procedures/admin/addKeywordFlag";
import { getAdminResources } from "./procedures/admin/getAdminResources";
import { addResource } from "./procedures/admin/addResource";
import { updateResource } from "./procedures/admin/updateResource";
import { batchUploadResources } from "./procedures/admin/batchUploadResources";
import { getContentTags } from "./procedures/admin/getContentTags";
import { addContentTag } from "./procedures/admin/addContentTag";
import { getScheduledReports } from "./procedures/admin/getScheduledReports";
import { scheduleReport } from "./procedures/admin/scheduleReport";
import { getReportData } from "./procedures/admin/getReportData";
import { getAgencies } from "./procedures/admin/getAgencies";
import { addAgency } from "./procedures/admin/addAgency";
import { updateAgency } from "./procedures/admin/updateAgency";
import { getAgencyNannies } from "./procedures/admin/getAgencyNannies";
import { assignNannyToAgency } from "./procedures/admin/assignNannyToAgency";
import { updateNannyAgencyAssignment } from "./procedures/admin/updateNannyAgencyAssignment";

export const appRouter = createTRPCRouter({
  // Auth procedures
  register,
  login,
  getMe,
  verifyToken,
  
  // App procedures
  getAIAvailability,
  
  // Sync procedures
  syncOperation,
  
  // Observation procedures
  createObservation,
  getChildObservations,
  getObservations,
  getAssignedChildren,
  
  // Messaging procedures
  sendMessage,
  getConversations,
  getMessages,
  
  // Nanny profile procedures
  getNannyProfile,
  updateNannyProfile,
  manageCertification,
  
  // Parent profile procedures
  getParentProfile,
  updateParentProfile,
  updateChild,
  getChildMilestones,
  submitFeedback,
  updateFeedback,
  getFeedbackHistory,
  achieveMilestone,
  updateMilestone,
  
  // Admin procedures
  getAdminDashboardStats,
  getAdminUsers,
  getAdminUser,
  updateAdminUser,
  getAdminFlaggedContent,
  updateFlaggedContent,
  addKeywordFlag,
  getAdminResources,
  addResource,
  updateResource,
  batchUploadResources,
  getContentTags,
  addContentTag,
  getScheduledReports,
  scheduleReport,
  getReportData,
  getAgencies,
  addAgency,
  updateAgency,
  getAgencyNannies,
  assignNannyToAgency,
  updateNannyAgencyAssignment,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
