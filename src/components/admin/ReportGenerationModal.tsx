import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

interface ReportGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportFormat = "PDF" | "Excel" | "CSV";

interface ReportParams {
  name: string;
  description: string;
  reportType: string;
  dateRange: string;
  customStartDate?: string;
  customEndDate?: string;
  userRoles: string[];
  metrics: string[];
  format: ReportFormat[];
  recipients: string;
}

export function ReportGenerationModal({ isOpen, onClose }: ReportGenerationModalProps) {
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Initial report parameters
  const [reportParams, setReportParams] = useState<ReportParams>({
    name: "",
    description: "",
    reportType: "systemOverview",
    dateRange: "30days",
    userRoles: ["NANNY", "PARENT", "ADMIN"],
    metrics: ["users", "observations", "certifications", "resources"],
    format: ["PDF"],
    recipients: ""
  });

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setIsGenerating(false);
      setGenerationProgress(0);
      setReportUrl(null);
      setError(null);
    }
  }, [isOpen]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setReportParams(prev => ({ ...prev, [name]: value }));
  };

  // Handle checkbox changes for format
  const handleFormatChange = (format: ReportFormat) => {
    setReportParams(prev => {
      const formats = [...prev.format];
      if (formats.includes(format)) {
        return { ...prev, format: formats.filter(f => f !== format) };
      } else {
        return { ...prev, format: [...formats, format] };
      }
    });
  };

  // Handle checkbox changes for user roles
  const handleRoleChange = (role: string) => {
    setReportParams(prev => {
      const roles = [...prev.userRoles];
      if (roles.includes(role)) {
        return { ...prev, userRoles: roles.filter(r => r !== role) };
      } else {
        return { ...prev, userRoles: [...roles, role] };
      }
    });
  };

  // Handle checkbox changes for metrics
  const handleMetricChange = (metric: string) => {
    setReportParams(prev => {
      const metrics = [...prev.metrics];
      if (metrics.includes(metric)) {
        return { ...prev, metrics: metrics.filter(m => m !== metric) };
      } else {
        return { ...prev, metrics: [...metrics, metric] };
      }
    });
  };

  // Schedule report mutation
  const scheduleReportMutation = api.scheduleReport.useMutation({
    onSuccess: (data) => {
      // Simulate report generation process
      setIsGenerating(true);
      
      // Mock progress updates
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setGenerationProgress(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          // Mock report URL
          setReportUrl(`/reports/${data.schedule.id}`);
          setIsGenerating(false);
          toast.success("Report generated successfully");
        }
      }, 500);
    },
    onError: (error) => {
      setError(error.message);
      toast.error(`Failed to generate report: ${error.message}`);
    }
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportParams.name) {
      toast.error("Please provide a name for the report");
      return;
    }
    
    if (reportParams.format.length === 0) {
      toast.error("Please select at least one format");
      return;
    }
    
    if (reportParams.dateRange === "custom" && 
        (!reportParams.customStartDate || !reportParams.customEndDate)) {
      toast.error("Please provide both start and end dates for custom range");
      return;
    }
    
    // Split recipients into array
    const recipients = reportParams.recipients
      ? reportParams.recipients.split(',').map(email => email.trim()).filter(Boolean)
      : [];
    
    // Create the report request payload
    const reportRequest = {
      token: token!,
      name: reportParams.name,
      description: reportParams.description,
      reportType: reportParams.reportType,
      frequency: "once", // One-time report
      format: reportParams.format,
      recipients,
      filters: JSON.stringify({
        dateRange: reportParams.dateRange,
        customStartDate: reportParams.customStartDate,
        customEndDate: reportParams.customEndDate,
        userRoles: reportParams.userRoles,
        metrics: reportParams.metrics
      })
    };
    
    if (isOnline) {
      scheduleReportMutation.mutate(reportRequest);
    } else {
      // Handle offline operation
      addOperation({
        operationType: "CREATE",
        modelName: "ReportSchedule",
        recordId: crypto.randomUUID(),
        data: {
          ...reportRequest,
          nextRunDate: new Date().toISOString(),
          isActive: true,
          createdAt: new Date().toISOString()
        }
      });
      
      toast.success("Report generation queued for when back online");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Generate Report
                </h3>
                
                {isGenerating ? (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">
                      Generating your report...
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${generationProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {generationProgress}% complete
                    </p>
                  </div>
                ) : reportUrl ? (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">
                      Your report is ready!
                    </p>
                    <div className="flex space-x-2">
                      {reportParams.format.map(format => (
                        <a 
                          key={format}
                          href={`${reportUrl}.${format.toLowerCase()}`}
                          download
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Download {format}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : error ? (
                  <div className="mt-4">
                    <p className="text-sm text-red-500">
                      Error: {error}
                    </p>
                    <Button 
                      className="mt-2"
                      onClick={() => setError(null)}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <Input
                      label="Report Name"
                      name="name"
                      value={reportParams.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Monthly System Overview"
                      required
                    />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Report Type
                      </label>
                      <select
                        name="reportType"
                        value={reportParams.reportType}
                        onChange={handleInputChange}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                      >
                        <option value="systemOverview">System Overview</option>
                        <option value="userActivity">User Activity</option>
                        <option value="nannyPerformance">Nanny Performance</option>
                        <option value="childMilestones">Child Milestones</option>
                        <option value="resourceUsage">Resource Usage</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date Range
                      </label>
                      <select
                        name="dateRange"
                        value={reportParams.dateRange}
                        onChange={handleInputChange}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                      >
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                        <option value="90days">Last 90 Days</option>
                        <option value="year">Last Year</option>
                        <option value="custom">Custom Range</option>
                      </select>
                    </div>
                    
                    {reportParams.dateRange === 'custom' && (
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Start Date"
                          type="date"
                          name="customStartDate"
                          value={reportParams.customStartDate || ''}
                          onChange={handleInputChange}
                          required
                        />
                        <Input
                          label="End Date"
                          type="date"
                          name="customEndDate"
                          value={reportParams.customEndDate || ''}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User Roles to Include
                      </label>
                      <div className="space-y-2">
                        <label className="inline-flex items-center mr-4">
                          <input
                            type="checkbox"
                            checked={reportParams.userRoles.includes("NANNY")}
                            onChange={() => handleRoleChange("NANNY")}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Nannies</span>
                        </label>
                        <label className="inline-flex items-center mr-4">
                          <input
                            type="checkbox"
                            checked={reportParams.userRoles.includes("PARENT")}
                            onChange={() => handleRoleChange("PARENT")}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Parents</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={reportParams.userRoles.includes("ADMIN")}
                            onChange={() => handleRoleChange("ADMIN")}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Admins</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Metrics to Include
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={reportParams.metrics.includes("users")}
                            onChange={() => handleMetricChange("users")}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Users</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={reportParams.metrics.includes("observations")}
                            onChange={() => handleMetricChange("observations")}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Observations</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={reportParams.metrics.includes("certifications")}
                            onChange={() => handleMetricChange("certifications")}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Certifications</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={reportParams.metrics.includes("resources")}
                            onChange={() => handleMetricChange("resources")}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Resources</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={reportParams.metrics.includes("milestones")}
                            onChange={() => handleMetricChange("milestones")}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Milestones</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={reportParams.metrics.includes("activity")}
                            onChange={() => handleMetricChange("activity")}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">System Activity</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Report Format
                      </label>
                      <div className="space-x-4">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={reportParams.format.includes("PDF")}
                            onChange={() => handleFormatChange("PDF")}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">PDF</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={reportParams.format.includes("Excel")}
                            onChange={() => handleFormatChange("Excel")}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Excel</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={reportParams.format.includes("CSV")}
                            onChange={() => handleFormatChange("CSV")}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">CSV</span>
                        </label>
                      </div>
                    </div>
                    
                    <Input
                      label="Email Recipients (optional, comma-separated)"
                      name="recipients"
                      value={reportParams.recipients}
                      onChange={handleInputChange}
                      placeholder="e.g., admin@example.com, manager@example.com"
                    />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (optional)
                      </label>
                      <textarea
                        name="description"
                        value={reportParams.description}
                        onChange={handleInputChange}
                        rows={2}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                        placeholder="Add any additional notes or context for this report"
                      ></textarea>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {isGenerating ? (
              <Button
                isLoading={true}
                disabled
              >
                Generating...
              </Button>
            ) : reportUrl ? (
              <Button
                onClick={onClose}
              >
                Close
              </Button>
            ) : error ? null : (
              <>
                <Button
                  type="submit"
                  onClick={handleSubmit}
                  isLoading={scheduleReportMutation.isLoading}
                >
                  Generate Report
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="mt-3 sm:mt-0 sm:mr-3"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
