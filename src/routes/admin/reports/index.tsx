import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

// Import the admin navigation array from the dashboard
import { adminNavigation } from "../dashboard";

export const Route = createFileRoute("/admin/reports/")({
  component: AdminReports,
});

function AdminReports() {
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [dateRange, setDateRange] = useState("30days");
  
  // Fetch scheduled reports
  const { data: scheduledReports, isLoading: loadingSchedules, refetch } = api.getScheduledReports.useQuery(
    { token: token || "" },
    { 
      enabled: !!token && isOnline,
      onError: (error) => {
        toast.error(`Failed to load report schedules: ${error.message}`);
      }
    }
  );
  
  // Fetch report data
  const { data: reportData, isLoading: loadingReportData } = api.getReportData.useQuery(
    { 
      token: token || "",
      reportType: activeTab,
      dateRange
    },
    { 
      enabled: !!token && isOnline,
      onError: (error) => {
        toast.error(`Failed to load report data: ${error.message}`);
      }
    }
  );
  
  // Mutation for scheduling a report
  const scheduleReportMutation = api.scheduleReport.useMutation({
    onSuccess: () => {
      toast.success("Report scheduled successfully");
      setShowScheduleForm(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to schedule report: ${error.message}`);
    }
  });
  
  // Form state for scheduling a new report
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    description: "",
    reportType: "nannyPerformance",
    frequency: "weekly",
    format: ["PDF"],
    recipients: "",
    filters: ""
  });
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewSchedule(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle checkbox changes for format
  const handleFormatChange = (format: string) => {
    setNewSchedule(prev => {
      const formats = [...prev.format];
      if (formats.includes(format)) {
        return { ...prev, format: formats.filter(f => f !== format) };
      } else {
        return { ...prev, format: [...formats, format] };
      }
    });
  };
  
  // Handle report scheduling
  const handleScheduleReport = () => {
    if (!newSchedule.name || !newSchedule.reportType || !newSchedule.frequency) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    // Split recipients into array
    const recipients = newSchedule.recipients
      .split(',')
      .map(email => email.trim())
      .filter(email => email);
    
    if (isOnline) {
      scheduleReportMutation.mutate({
        token: token!,
        ...newSchedule,
        recipients
      });
    } else {
      // Handle offline operation
      addOperation({
        operationType: "CREATE",
        modelName: "ReportSchedule",
        recordId: crypto.randomUUID(),
        data: {
          ...newSchedule,
          recipients,
          nextRunDate: getNextRunDate(newSchedule.frequency),
          isActive: true,
          createdAt: new Date().toISOString()
        }
      });
      
      toast.success("Report schedule queued for sync when back online");
      setShowScheduleForm(false);
    }
  };
  
  // Generate next run date based on frequency
  const getNextRunDate = (frequency: string) => {
    const now = new Date();
    
    switch (frequency) {
      case "daily":
        now.setDate(now.getDate() + 1);
        break;
      case "weekly":
        now.setDate(now.getDate() + 7);
        break;
      case "monthly":
        now.setMonth(now.getMonth() + 1);
        break;
      case "quarterly":
        now.setMonth(now.getMonth() + 3);
        break;
      default:
        // Default to weekly
        now.setDate(now.getDate() + 7);
    }
    
    return now.toISOString();
  };
  
  // Handle report export
  const handleExportReport = (format: "PDF" | "Excel") => {
    toast.success(`Exporting report as ${format}...`);
    // This would be implemented with actual export functionality
  };
  
  return (
    <DashboardLayout 
      title="Reports & Analytics" 
      navigation={adminNavigation}
    >
      <div className="space-y-6">
        {/* Header section with tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Analytics Dashboard</h2>
              <p className="mt-1 text-gray-500">
                View and export reports on system activity and performance
              </p>
            </div>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                onClick={() => setShowScheduleForm(true)}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                Schedule Report
              </Button>
              <div className="flex space-x-1">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleExportReport("PDF")}
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  PDF
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleExportReport("Excel")}
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
                  </svg>
                  Excel
                </Button>
              </div>
            </div>
          </div>
          
          {/* Report scheduling form */}
          {showScheduleForm && (
            <div className="p-4 bg-blue-50 border-t border-b border-blue-200">
              <h3 className="text-sm font-medium text-blue-900 mb-3">Schedule Automated Report</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Report Name"
                  name="name"
                  value={newSchedule.name}
                  onChange={handleInputChange}
                  placeholder="Monthly Nanny Performance"
                  required
                />
                
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Report Type
                  </label>
                  <select
                    name="reportType"
                    value={newSchedule.reportType}
                    onChange={handleInputChange}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  >
                    <option value="nannyPerformance">Nanny Performance</option>
                    <option value="childMilestones">Child Milestones</option>
                    <option value="resourceUsage">Resource Usage</option>
                    <option value="systemActivity">System Activity</option>
                    <option value="userGrowth">User Growth</option>
                  </select>
                </div>
                
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Frequency
                  </label>
                  <select
                    name="frequency"
                    value={newSchedule.frequency}
                    onChange={handleInputChange}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                
                <div>
                  <p className="mb-1 block text-sm font-medium text-gray-700">Format</p>
                  <div className="space-y-2">
                    <label className="inline-flex items-center mr-4">
                      <input
                        type="checkbox"
                        checked={newSchedule.format.includes("PDF")}
                        onChange={() => handleFormatChange("PDF")}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">PDF</span>
                    </label>
                    <label className="inline-flex items-center mr-4">
                      <input
                        type="checkbox"
                        checked={newSchedule.format.includes("Excel")}
                        onChange={() => handleFormatChange("Excel")}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Excel</span>
                    </label>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <Input
                    label="Recipients (comma-separated email addresses)"
                    name="recipients"
                    value={newSchedule.recipients}
                    onChange={handleInputChange}
                    placeholder="admin@example.com, manager@example.com"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={newSchedule.description}
                    onChange={handleInputChange}
                    rows={2}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                    placeholder="Report description and purpose"
                  ></textarea>
                </div>
                
                <div className="md:col-span-2 flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowScheduleForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleScheduleReport}
                    isLoading={scheduleReportMutation.isLoading}
                  >
                    Schedule Report
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Report type tabs */}
          <div className="border-t border-gray-200">
            <div className="px-4 sm:px-6">
              <nav className="flex space-x-4 overflow-x-auto py-4" aria-label="Tabs">
                <button
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  Dashboard
                </button>
                <button
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'nannyPerformance'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('nannyPerformance')}
                >
                  Nanny Performance
                </button>
                <button
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'childMilestones'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('childMilestones')}
                >
                  Child Milestones
                </button>
                <button
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'resourceUsage'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('resourceUsage')}
                >
                  Resource Usage
                </button>
                <button
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'userGrowth'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('userGrowth')}
                >
                  User Growth
                </button>
              </nav>
            </div>
          </div>
          
          {/* Date range filter */}
          <div className="border-t border-gray-200 px-4 py-3 sm:px-6 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700 mr-2">Date Range:</span>
              <select
                className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="year">Last Year</option>
                <option value="custom">Custom Range</option>
              </select>
              
              {dateRange === 'custom' && (
                <div className="ml-3 flex space-x-2 items-center">
                  <Input
                    type="date"
                    className="w-auto"
                    fullWidth={false}
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    type="date"
                    className="w-auto"
                    fullWidth={false}
                  />
                  <Button size="sm" variant="outline">Apply</Button>
                </div>
              )}
            </div>
            
            <div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  // Refresh report data
                }}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Refresh
              </Button>
            </div>
          </div>
        </div>
        
        {/* Report content */}
        <div className="bg-white shadow rounded-lg p-6">
          {loadingReportData ? (
            <div className="p-6 text-center">
              <svg className="animate-spin h-8 w-8 mx-auto text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-2 text-gray-500">Loading report data...</p>
            </div>
          ) : activeTab === 'dashboard' ? (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">System Overview</h3>
              
              {/* Dashboard charts would go here */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">User Growth</h4>
                  <div className="h-64 flex items-center justify-center bg-white rounded border border-gray-100">
                    <p className="text-gray-500">User growth chart would be displayed here</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Observation Activity</h4>
                  <div className="h-64 flex items-center justify-center bg-white rounded border border-gray-100">
                    <p className="text-gray-500">Observation activity chart would be displayed here</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Resource Usage</h4>
                  <div className="h-64 flex items-center justify-center bg-white rounded border border-gray-100">
                    <p className="text-gray-500">Resource usage chart would be displayed here</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Milestone Achievement</h4>
                  <div className="h-64 flex items-center justify-center bg-white rounded border border-gray-100">
                    <p className="text-gray-500">Milestone achievement chart would be displayed here</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Key Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500">Active Nannies</p>
                    <p className="text-2xl font-semibold text-blue-600">42</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500">Active Parents</p>
                    <p className="text-2xl font-semibold text-purple-600">78</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500">Children Tracked</p>
                    <p className="text-2xl font-semibold text-green-600">103</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500">Observations</p>
                    <p className="text-2xl font-semibold text-yellow-600">1,254</p>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'nannyPerformance' ? (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Nanny Performance Metrics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Hours Logged by Nanny</h4>
                  <div className="h-64 flex items-center justify-center bg-white rounded border border-gray-100">
                    <p className="text-gray-500">Hours logged chart would be displayed here</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Observations Submitted</h4>
                  <div className="h-64 flex items-center justify-center bg-white rounded border border-gray-100">
                    <p className="text-gray-500">Observations chart would be displayed here</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">Top Performing Nannies</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nanny
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hours Logged
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Observations
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Certifications
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          View Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Sample data rows */}
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">Jane Smith</div>
                              <div className="text-sm text-gray-500">jane.smith@example.com</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          42.5
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          28
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          5
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <a href="#" className="text-blue-600 hover:text-blue-900">View</a>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">John Doe</div>
                              <div className="text-sm text-gray-500">john.doe@example.com</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          38.0
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          22
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          3
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <a href="#" className="text-blue-600 hover:text-blue-900">View</a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'childMilestones' ? (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Child Milestone Progress</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Milestone Achievement by Age Group</h4>
                  <div className="h-64 flex items-center justify-center bg-white rounded border border-gray-100">
                    <p className="text-gray-500">Milestone achievement chart would be displayed here</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Milestone Categories Distribution</h4>
                  <div className="h-64 flex items-center justify-center bg-white rounded border border-gray-100">
                    <p className="text-gray-500">Milestone categories chart would be displayed here</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">Recently Achieved Milestones</h4>
                </div>
                <div className="p-4">
                  <ul className="space-y-3">
                    <li className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Walks independently</p>
                          <p className="text-xs text-gray-500">Child: Emma Johnson (15 months)</p>
                        </div>
                        <span className="text-xs text-gray-500">2 days ago</span>
                      </div>
                    </li>
                    <li className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Says 5+ words</p>
                          <p className="text-xs text-gray-500">Child: Noah Williams (18 months)</p>
                        </div>
                        <span className="text-xs text-gray-500">3 days ago</span>
                      </div>
                    </li>
                    <li className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Stacks 4 blocks</p>
                          <p className="text-xs text-gray-500">Child: Sophia Davis (20 months)</p>
                        </div>
                        <span className="text-xs text-gray-500">5 days ago</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : activeTab === 'resourceUsage' ? (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Resource Usage Analytics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Resource Views by Type</h4>
                  <div className="h-64 flex items-center justify-center bg-white rounded border border-gray-100">
                    <p className="text-gray-500">Resource views chart would be displayed here</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Resource Views by Role</h4>
                  <div className="h-64 flex items-center justify-center bg-white rounded border border-gray-100">
                    <p className="text-gray-500">Role distribution chart would be displayed here</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">Top Resources</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Resource
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Views
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Developmental Stage
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          View Resource
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">Toddler Development Guide</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Article
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          156
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          Toddler (1-3 years)
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <a href="#" className="text-blue-600 hover:text-blue-900">View</a>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">Healthy Meal Planning</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Video
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          124
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          All Ages
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <a href="#" className="text-blue-600 hover:text-blue-900">View</a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">User Growth Analytics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">New Users Over Time</h4>
                  <div className="h-64 flex items-center justify-center bg-white rounded border border-gray-100">
                    <p className="text-gray-500">User growth chart would be displayed here</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">User Role Distribution</h4>
                  <div className="h-64 flex items-center justify-center bg-white rounded border border-gray-100">
                    <p className="text-gray-500">Role distribution chart would be displayed here</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">User Retention</h4>
                <div className="h-64 flex items-center justify-center bg-white rounded border border-gray-100">
                  <p className="text-gray-500">User retention chart would be displayed here</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Scheduled reports */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Scheduled Reports</h3>
          </div>
          
          {loadingSchedules ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">Loading scheduled reports...</p>
            </div>
          ) : scheduledReports && scheduledReports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frequency
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Run
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scheduledReports.map((report) => (
                    <tr key={report.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {report.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.reportType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.frequency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(report.nextRunDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {report.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            Edit
                          </button>
                          <button className="text-blue-600 hover:text-blue-900">
                            Run Now
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No scheduled reports. Click "Schedule Report" to create one.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
