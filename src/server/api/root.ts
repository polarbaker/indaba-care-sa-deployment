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

export const appRouter = createTRPCRouter({
  // Auth procedures
  register,
  login,
  getMe,
  verifyToken,
  
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
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);