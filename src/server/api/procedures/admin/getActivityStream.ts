import { z } from "zod";
import { baseProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getUserFromToken, validateUserRole } from "~/lib/auth";
import { EventEmitter } from "events";

// Create a global event emitter for system activities
const activityEmitter = new EventEmitter();

// Activity event interface
export interface ActivityEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  resourceId?: string;
  contentId?: string;
}

// Helper to emit activity events that can be consumed by the subscription
export function emitActivityEvent(event: ActivityEvent) {
  activityEmitter.emit("activity", event);
}

export const getActivityStream = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .subscription(async function* ({ input, signal }) { // Added signal for abort handling
    // Authenticate user
    try {
      const user = await getUserFromToken(input.token);
      validateUserRole(user, ["ADMIN"]);
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be an admin to access the activity stream",
      });
    }

    // Create a promise that resolves when the subscription is aborted
    const onAbort = new Promise<void>((resolve) => {
      signal.addEventListener("abort", resolve);
    });

    // Initial dummy activity to confirm subscription is working
    yield {
      id: crypto.randomUUID(),
      type: "subscription_started",
      description: "Real-time activity feed connected",
      timestamp: new Date().toISOString(),
    } as ActivityEvent; // Cast to ActivityEvent

    // Keep the subscription alive and yield events
    while (!signal.aborted) {
      const event = await new Promise<ActivityEvent | null>((resolve) => {
        // Listener for new activity events
        const listener = (data: ActivityEvent) => {
          resolve(data);
        };
        activityEmitter.once("activity", listener); // Use 'once' to resolve the promise for each event

        // If aborted while waiting for an event, resolve with null
        onAbort.then(() => {
          activityEmitter.off("activity", listener); // Clean up listener on abort
          resolve(null);
        });
      });

      if (event) {
        yield event;
      } else {
        // If event is null, it means the subscription was aborted
        break;
      }
    }
  });
