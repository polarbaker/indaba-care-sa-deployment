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
import { changePassword } from "./procedures/auth/changePassword";
import { setup2FA } from "./procedures/auth/setup2FA";
import { verify2FA } from "./procedures/auth/verify2FA";
import { disable2FA } from "./procedures/auth/disable2FA";
import { getUserSessions } from "./procedures/auth/getUserSessions";
import { revokeSession } from "./procedures/auth/revokeSession";

// App procedures
import { getAIAvailability } from "./procedures/app/getAIAvailability";

// Sync procedures
import { syncOperation } from "./procedures/sync/syncOperation";

// User procedures
import { updateNotificationSettings } from "./procedures/user/updateNotificationSettings";
import { updatePrivacySettings } from "./procedures/user/updatePrivacySettings";
import { updateSyncSettings } from "./procedures/user/updateSyncSettings";
import { syncNow } from "./procedures/user/syncNow";
import { exportUserData } from "./procedures/user/exportUserData";
import { deleteAccount } from "./procedures/user/deleteAccount";

// Observation procedures
import { createObservation } from "./procedures/observations/createObservation";
import { getChildObservations } from "./procedures/observations/getChildObservations";
import { getObservations } from "./procedures/observations/getObservations";
import { getAssignedChildren } from "./procedures/observations/getAssignedChildren";
import { getObservationDetail } from "./procedures/observations/getObservationDetail";
import { addObservationComment } from "./procedures/observations/addObservationComment";
import { updateObservation } from "./procedures/observations/updateObservation";
import { deleteObservation } from "./procedures/observations/deleteObservation";
import { getRecentObservations } from "./procedures/observations/getRecentObservations";

// Messaging procedures
import { sendMessage } from "./procedures/messaging/sendMessage";
import { getConversations } from "./procedures/messaging/getConversations";
import { getMessages } from "./procedures/messaging/getMessages";
import { getAvailableRecipients } from "./procedures/messaging/getAvailableRecipients";

// Nanny profile procedures
import { getNannyProfile } from "./procedures/nanny/getNannyProfile";
import { updateNannyProfile } from "./procedures/nanny/updateNannyProfile";
import { manageCertification } from "./procedures/nanny/manageCertification";
import { searchFamilies } from "./procedures/nanny/searchFamilies";
import { requestFamilyAccess } from "./procedures/nanny/requestFamilyAccess";

// Hours Log procedures
import { getHoursLog } from "./procedures/nanny/getHoursLog";
import { logHours } from "./procedures/nanny/logHours";
import { updateHoursLog } from "./procedures/nanny/updateHoursLog";
import { deleteHoursLog } from "./procedures/nanny/deleteHoursLog";
import { getCurrentShift } from "./procedures/nanny/getCurrentShift";
import { startShift } from "./procedures/nanny/startShift";
import { endShift } from "./procedures/nanny/endShift";
import { pauseResumeShift } from "./procedures/nanny/pauseResumeShift";
import { getSchedule } from "./procedures/nanny/getSchedule";

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
import { 
  getFamilyDocuments, 
  uploadFamilyDocument, 
  deleteFamilyDocument 
} from "./procedures/parent/familyDocuments";
import { 
  getFamilyUsers, 
  inviteParent, 
  resendParentInvitation, 
  cancelParentInvitation 
} from "./procedures/parent/familyUsers";
import { 
  getFamilyPreferences, 
  updateFamilyPreferences 
} from "./procedures/parent/familyPreferences";
import { addChild } from "./procedures/parent/addChild";
import { getChildrenOverview } from "./procedures/parent/getChildrenOverview";
import { getChildDetails } from "./procedures/parent/getChildDetails";
import { archiveChild } from "./procedures/parent/archiveChild";
import { deleteChild } from "./procedures/parent/deleteChild";
import { addCustomMilestone } from "./procedures/parent/addCustomMilestone";
import { getMilestoneProgress } from "./procedures/parent/getMilestoneProgress";
import { getRecentMilestones } from "./procedures/parent/getRecentMilestones";

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
import { getActivityStream } from "./procedures/admin/getActivityStream";
import { getSystemSettings } from "./procedures/admin/getSystemSettings";
import { updateSystemSettings } from "./procedures/admin/updateSystemSettings";
import { downloadAuditLogs } from "./procedures/admin/downloadAuditLogs";
import { testEmailConnection } from "./procedures/admin/testEmailConnection";
import { testSmsConnection } from "./procedures/admin/testSmsConnection";
import { testPushConnection } from "./procedures/admin/testPushConnection";
import { testAIConnection } from "./procedures/admin/testAIConnection";

export const appRouter = createTRPCRouter({
  // Auth procedures
  register,
  login,
  getMe,
  verifyToken,
  changePassword,
  setup2FA,
  verify2FA,
  disable2FA,
  getUserSessions,
  revokeSession,
  
  // App procedures
  getAIAvailability,
  
  // Sync procedures
  syncOperation,
  
  // User procedures
  updateNotificationSettings,
  updatePrivacySettings,
  updateSyncSettings,
  syncNow,
  exportUserData,
  deleteAccount,
  
  // Observation procedures
  createObservation,
  getChildObservations,
  getObservations,
  getAssignedChildren,
  getObservationDetail,
  addObservationComment,
  updateObservation,
  deleteObservation,
  getRecentObservations,
  
  // Messaging procedures
  sendMessage,
  getConversations,
  getMessages,
  getAvailableRecipients,
  
  // Nanny profile procedures
  getNannyProfile,
  updateNannyProfile,
  manageCertification,
  searchFamilies,
  requestFamilyAccess,
  
  // Hours Log procedures
  getHoursLog,
  logHours,
  updateHoursLog,
  deleteHoursLog,
  getCurrentShift,
  startShift,
  endShift,
  pauseResumeShift,
  getSchedule,
  
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
  getRecentMilestones,
  // Family Profile procedures
  getFamilyDocuments,
  uploadFamilyDocument,
  deleteFamilyDocument,
  getFamilyUsers,
  inviteParent,
  resendParentInvitation,
  cancelParentInvitation,
  getFamilyPreferences,
  updateFamilyPreferences,
  addChild,
  getChildrenOverview,
  getChildDetails,
  archiveChild,
  deleteChild,
  addCustomMilestone,
  getMilestoneProgress,
  
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
  getActivityStream,
  
  // Admin System Settings procedures
  getSystemSettings,
  updateSystemSettings,
  downloadAuditLogs,
  testEmailConnection,
  testSmsConnection,
  testPushConnection,
  testAIConnection,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
