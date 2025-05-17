import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

const hoursLogSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  breakMinutes: z.number().min(0, "Break time cannot be negative").default(0),
  familyId: z.string().optional(),
  notes: z.string().optional(),
});

type HoursLogFormValues = z.infer<typeof hoursLogSchema>;

interface HoursLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function HoursLogModal({ isOpen, onClose, onSuccess }: HoursLogModalProps) {
  const [mode, setMode] = useState<"manual" | "tracker">("manual");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [trackingStartTime, setTrackingStartTime] = useState<Date | null>(null);
  const [trackingElapsed, setTrackingElapsed] = useState(0); // in seconds
  const [trackingBreak, setTrackingBreak] = useState(0); // in seconds
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);
  
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<HoursLogFormValues>({
    resolver: zodResolver(hoursLogSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      startTime: "",
      endTime: "",
      breakMinutes: 0,
      notes: "",
    },
  });
  
  // Fetch assigned families
  const { data: childrenData, isLoading: isLoadingFamilies } = api.getAssignedChildren.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );
  
  // Get unique families from children
  const families = childrenData?.children
    ? Array.from(
        new Map(
          childrenData.children.map(child => [
            child.familyId,
            { 
              id: child.familyId, 
              name: child.parentFirstName && child.parentLastName 
                ? `${child.parentFirstName} ${child.parentLastName} Family` 
                : 'Unknown Family' 
            }
          ])
        ).values()
      ).filter(family => family.id) // Ensure family.id is not undefined/null
    : [];
  
  // Check for active shift
  const { 
    data: activeShiftData,
    isLoading: isLoadingActiveShift,
    refetch: refetchActiveShift
  } = api.getCurrentShift.useQuery(
    { token: token || "" },
    { 
      enabled: !!token && mode === "tracker",
      refetchInterval: isTracking ? 10000 : false, // Refetch every 10 seconds when tracking
    }
  );
  
  // Start shift mutation
  const startShiftMutation = api.startShift.useMutation({
    onSuccess: (data) => {
      toast.success("Shift started successfully");
      setIsTracking(true);
      setTrackingStartTime(new Date());
      setTrackingElapsed(0);
      setTrackingBreak(0);
      setIsPaused(false);
      setPauseStartTime(null);
      startTimer();
      refetchActiveShift();
    },
    onError: (error) => {
      toast.error(`Failed to start shift: ${error.message}`);
      setIsTracking(false);
    },
  });
  
  // End shift mutation
  const endShiftMutation = api.endShift.useMutation({
    onSuccess: (data) => {
      toast.success("Shift ended successfully");
      setIsTracking(false);
      setTrackingStartTime(null);
      setTrackingElapsed(0);
      setTrackingBreak(0);
      setIsPaused(false);
      setPauseStartTime(null);
      stopTimer();
      refetchActiveShift();
      
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to end shift: ${error.message}`);
    },
  });
  
  // Pause/resume shift mutation
  const pauseResumeShiftMutation = api.pauseResumeShift.useMutation({
    onSuccess: (data) => {
      if (data.action === "paused") {
        toast.success("Shift paused");
        setIsPaused(true);
        setPauseStartTime(new Date());
      } else {
        toast.success("Shift resumed");
        setIsPaused(false);
        setPauseStartTime(null);
        setTrackingBreak((prev) => prev + (data.pauseDuration || 0) * 60);
      }
      refetchActiveShift();
    },
    onError: (error) => {
      toast.error(`Failed to ${isPaused ? "resume" : "pause"} shift: ${error.message}`);
    },
  });
  
  // Log hours mutation
  const logHoursMutation = api.logHours.useMutation({
    onSuccess: () => {
      toast.success("Hours logged successfully");
      reset();
      setIsSubmitting(false);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to log hours: ${error.message}`);
      setIsSubmitting(false);
    },
  });
  
  // Timer functions
  const startTimer = () => {
    if (timerRef.current) return;
    
    timerRef.current = window.setInterval(() => {
      if (!isPaused) {
        setTrackingElapsed((prev) => prev + 1);
      }
    }, 1000);
  };
  
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  // Update the timer when active shift data is loaded
  useEffect(() => {
    if (activeShiftData?.hasActiveShift && mode === "tracker") {
      const shift = activeShiftData.shift;
      setIsTracking(true);
      setIsPaused(shift.isPaused);
      
      // Calculate elapsed time
      const startTime = new Date(shift.startTime);
      const now = new Date();
      const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      
      setTrackingStartTime(startTime);
      setTrackingElapsed(elapsedSeconds);
      setTrackingBreak(shift.breakMinutes * 60);
      
      if (shift.isPaused && shift.pauseStartTime) {
        setPauseStartTime(new Date(shift.pauseStartTime));
      } else {
        setPauseStartTime(null);
      }
      
      startTimer();
    } else if (mode === "tracker" && !activeShiftData?.hasActiveShift) {
      setIsTracking(false);
      setTrackingStartTime(null);
      setTrackingElapsed(0);
      setTrackingBreak(0);
      setIsPaused(false);
      setPauseStartTime(null);
      stopTimer();
    }
    
    return () => {
      stopTimer();
    };
  }, [activeShiftData, mode]);
  
  // Format time display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format break time display
  const formatBreakTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };
  
  // Handle tracker actions
  const handleStartTracking = () => {
    const familyId = watch("familyId");
    const notes = watch("notes");
    
    startShiftMutation.mutate({
      token: token || "",
      familyId,
      notes,
    });
  };
  
  const handleEndTracking = () => {
    const notes = watch("notes");
    
    endShiftMutation.mutate({
      token: token || "",
      notes,
    });
  };
  
  const handlePauseResumeTracking = () => {
    pauseResumeShiftMutation.mutate({
      token: token || "",
      action: isPaused ? "resume" : "pause",
    });
  };
  
  // Handle manual form submission
  const onSubmit = (data: HoursLogFormValues) => {
    setIsSubmitting(true);
    
    if (isOnline) {
      logHoursMutation.mutate({
        token: token || "",
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        breakMinutes: data.breakMinutes,
        familyId: data.familyId,
        notes: data.notes,
        isManualEntry: true,
      });
    } else {
      try {
        addOperation({
          operationType: "CREATE",
          modelName: "HoursLog",
          recordId: crypto.randomUUID(),
          data: {
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            breakMinutes: data.breakMinutes,
            familyId: data.familyId,
            notes: data.notes,
            isManualEntry: true,
          },
        });
        
        toast.success("Hours saved for syncing when back online");
        reset();
        setIsSubmitting(false);
        if (onSuccess) onSuccess();
        onClose();
      } catch (error) {
        toast.error("Failed to save hours");
        setIsSubmitting(false);
      }
    }
  };
  
  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setMode("manual");
      setIsTracking(false);
      setTrackingStartTime(null);
      setTrackingElapsed(0);
      setTrackingBreak(0);
      setIsPaused(false);
      setPauseStartTime(null);
      stopTimer();
    }
  }, [isOpen, reset]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-secondary opacity-75"></div>
        </div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-background rounded-card shadow-card overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-background px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-text-primary font-heading">
                  Log Hours
                </h3>
                
                {/* Mode selector */}
                <div className="mt-4 mb-6">
                  <div className="flex rounded-md shadow-sm">
                    <button
                      type="button"
                      className={`relative inline-flex items-center px-4 py-2 rounded-l-md border transition-all duration-150 ${
                        mode === "manual"
                          ? "bg-primary text-on-primary border-primary"
                          : "bg-background text-text-primary border-secondary hover:bg-surface"
                      } text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary`}
                      onClick={() => setMode("manual")}
                    >
                      Manual Entry
                    </button>
                    <button
                      type="button"
                      className={`relative inline-flex items-center px-4 py-2 rounded-r-md border transition-all duration-150 ${
                        mode === "tracker"
                          ? "bg-primary text-on-primary border-primary"
                          : "bg-background text-text-primary border-secondary hover:bg-surface"
                      } text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary`}
                      onClick={() => setMode("tracker")}
                    >
                      Time Tracker
                    </button>
                  </div>
                </div>
                
                {/* Common fields */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Family (Optional)
                  </label>
                  <select
                    {...register("familyId")}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-secondary focus:outline-none focus:ring-primary focus:border-primary transition-all duration-150 sm:text-sm rounded-lg"
                    disabled={isTracking || isSubmitting || isLoadingFamilies}
                  >
                    <option value="">Select a family</option>
                    {families.map((family: any) => (
                      <option key={family.id} value={family.id}>
                        {family.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    {...register("notes")}
                    rows={3}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-secondary rounded-lg transition-all duration-150"
                    placeholder="Add any notes about this shift..."
                    disabled={isSubmitting}
                  />
                </div>
                
                {/* Mode-specific content */}
                {mode === "manual" ? (
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          Date
                        </label>
                        <Input
                          type="date"
                          {...register("date")}
                          error={errors.date?.message}
                          disabled={isSubmitting}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-1">
                            Start Time
                          </label>
                          <Input
                            type="time"
                            {...register("startTime")}
                            error={errors.startTime?.message}
                            disabled={isSubmitting}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-1">
                            End Time
                          </label>
                          <Input
                            type="time"
                            {...register("endTime")}
                            error={errors.endTime?.message}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        Break Time (minutes)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        {...register("breakMinutes", { valueAsNumber: true })}
                        error={errors.breakMinutes?.message}
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="mt-6 sm:flex sm:flex-row-reverse">
                      <Button
                        type="submit"
                        isLoading={isSubmitting}
                        disabled={!isOnline && mode === "tracker"}
                      >
                        Log Hours
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="mt-3 sm:mt-0 sm:mr-3"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div>
                    {isLoadingActiveShift ? (
                      <div className="text-center py-6">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-text-secondary">Loading shift status...</p>
                      </div>
                    ) : isTracking ? (
                      <div className="space-y-4">
                        <div className="text-center p-4 bg-surface rounded-lg">
                          <div className="text-3xl font-bold text-text-primary">
                            {formatTime(trackingElapsed - trackingBreak)}
                          </div>
                          <div className="text-sm text-text-secondary">
                            Started at {trackingStartTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {trackingBreak > 0 && (
                            <div className="text-xs text-text-secondary mt-1">
                              Break time: {formatBreakTime(trackingBreak)}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-center space-x-4">
                          <Button
                            type="button"
                            variant={isPaused ? "outline" : "secondary"}
                            onClick={handlePauseResumeTracking}
                            disabled={!isOnline}
                          >
                            {isPaused ? (
                              <>
                                <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                </svg>
                                Resume
                              </>
                            ) : (
                              <>
                                <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                                </svg>
                                Pause
                              </>
                            )}
                          </Button>
                          
                          <Button
                            type="button"
                            variant="danger"
                            onClick={handleEndTracking}
                            disabled={!isOnline}
                          >
                            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                            </svg>
                            End Shift
                          </Button>
                        </div>
                        
                        {isPaused && (
                          <div className="text-center text-sm text-primary">
                            <svg className="inline-block h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                            Shift is paused. Break time is being tracked.
                          </div>
                        )}
                        
                        {!isOnline && (
                          <div className="text-center text-sm text-[#E63946] mt-2">
                            <svg className="inline-block h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            You are offline. Time tracking controls are disabled.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center p-6 bg-surface rounded-lg">
                          <p className="text-text-primary">
                            Start tracking your working hours in real-time.
                          </p>
                        </div>
                        
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            onClick={handleStartTracking}
                            disabled={!isOnline}
                          >
                            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                            </svg>
                            Start Shift
                          </Button>
                        </div>
                        
                        {!isOnline && (
                          <div className="text-center text-sm text-[#E63946]">
                            <svg className="inline-block h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            You are offline. Please use manual entry instead.
                          </div>
                        )}
                        
                        <div className="text-center">
                          <button
                            type="button"
                            className="text-sm text-primary hover:text-primary-light transition-colors duration-150"
                            onClick={() => setMode("manual")}
                          >
                            Switch to manual entry
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-6 sm:flex sm:flex-row-reverse">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="mt-3 sm:mt-0"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
