import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

type HoursLog = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  breakMinutes: number;
  notes: string;
  familyId?: string;
  familyName?: string;
  isOvertime: boolean;
  status: string;
};

interface HoursLogPanelProps {
  onAddHours?: () => void;
}

export function HoursLogPanel({ onAddHours }: HoursLogPanelProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedFamily, setSelectedFamily] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  
  const { token } = useAuthStore();
  const { isOnline } = useSyncStore();
  
  // Calculate date range for the selected month
  const startDate = new Date(`${selectedMonth}-01T00:00:00`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setDate(0); // Last day of the month
  
  // Fetch hours logs
  const { 
    data: hoursData, 
    isLoading,
    refetch,
  } = api.getHoursLog.useQuery(
    {
      token: token || "",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 100, // Large limit to get all entries for the month
    },
    {
      enabled: !!token,
      onError: (error) => {
        toast.error(`Failed to load hours: ${error.message}`);
      },
    }
  );
  
  // Filter hours logs
  const filteredLogs = hoursData?.data.filter(log => {
    if (selectedFamily !== "all" && log.familyId !== selectedFamily) {
      return false;
    }
    if (selectedStatus !== "all" && log.status !== selectedStatus) {
      return false;
    }
    return true;
  }) || [];
  
  // Calculate totals
  const totalHours = filteredLogs.reduce(
    (sum, log) => sum + log.durationMinutes / 60,
    0
  );
  
  const totalBreakHours = filteredLogs.reduce(
    (sum, log) => sum + log.breakMinutes / 60,
    0
  );
  
  const overtimeHours = filteredLogs
    .filter(log => log.isOvertime)
    .reduce((sum, log) => {
      const regularHours = Math.min(8 * 60, log.durationMinutes);
      return sum + (log.durationMinutes - regularHours) / 60;
    }, 0);
  
  // Get unique families from logs for filter dropdown
  const families = [
    { id: "all", name: "All Families" },
    ...Array.from(
      new Map(
        hoursData?.data
          .filter(log => log.familyId && log.familyName)
          .map(log => [log.familyId, { id: log.familyId, name: log.familyName }])
      ).values()
    ),
  ];
  
  // Handle export
  const handleExport = () => {
    setIsExporting(true);
    
    try {
      // Format data for CSV
      const csvData = filteredLogs.map(log => ({
        Date: new Date(log.date).toLocaleDateString(),
        Family: log.familyName || "N/A",
        "Start Time": log.startTime,
        "End Time": log.endTime,
        "Duration (hours)": (log.durationMinutes / 60).toFixed(2),
        "Break (hours)": (log.breakMinutes / 60).toFixed(2),
        "Overtime": log.isOvertime ? "Yes" : "No",
        Status: log.status,
        Notes: log.notes,
      }));
      
      // Convert to CSV
      const headers = Object.keys(csvData[0]).join(",");
      const rows = csvData.map(row => 
        Object.values(row)
          .map(value => `"${value}"`)
          .join(",")
      );
      const csv = [headers, ...rows].join("\n");
      
      // Create download link
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hours-log-${selectedMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Hours log exported successfully");
    } catch (error) {
      toast.error("Failed to export hours log");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Delete hours log
  const deleteHoursLogMutation = api.deleteHoursLog.useMutation({
    onSuccess: () => {
      toast.success("Hours log deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete hours log: ${error.message}`);
    },
  });
  
  const handleDelete = (hoursLogId: string) => {
    if (window.confirm("Are you sure you want to delete this hours log?")) {
      deleteHoursLogMutation.mutate({ token: token || "", hoursLogId });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Month Selector */}
          <div>
            <label htmlFor="month-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <Input
              id="month-filter"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
          
          {/* Family Filter */}
          <div>
            <label htmlFor="family-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Family
            </label>
            <select
              id="family-filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={selectedFamily}
              onChange={(e) => setSelectedFamily(e.target.value)}
            >
              {families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <Button
            onClick={onAddHours}
            type="button"
          >
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Log New Hours
          </Button>
          
          <Button
            onClick={handleExport}
            type="button"
            variant="outline"
            isLoading={isExporting}
            disabled={filteredLogs.length === 0}
          >
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </Button>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Hours (This Month)
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {isLoading ? (
                      <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      `${totalHours.toFixed(1)}`
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Weekly Hours
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {isLoading ? (
                      <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      `${hoursData?.summary.weeklyHours.toFixed(1) || 0}`
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Break Time
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {isLoading ? (
                      <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      `${totalBreakHours.toFixed(1)} hrs`
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Overtime Hours
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {isLoading ? (
                      <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      `${overtimeHours.toFixed(1)}`
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hours Log Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Hours Log</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Record of your working hours
          </p>
        </div>
        
        {isLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading hours log...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-10">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hours logged</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start tracking your working hours using the Log Hours button.
            </p>
            <div className="mt-6">
              <Button
                onClick={onAddHours}
                type="button"
              >
                <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Log Hours
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Family
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className={log.isOvertime ? "bg-red-50" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(log.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {log.startTime} - {log.endTime}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.familyName || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(log.durationMinutes / 60).toFixed(1)} hrs
                      </div>
                      {log.breakMinutes > 0 && (
                        <div className="text-xs text-gray-500">
                          {(log.breakMinutes / 60).toFixed(1)} hrs break
                        </div>
                      )}
                      {log.isOvertime && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Overtime
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${log.status === "APPROVED" ? "bg-green-100 text-green-800" : 
                          log.status === "REJECTED" ? "bg-red-100 text-red-800" : 
                          "bg-yellow-100 text-yellow-800"}`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {log.notes || "No notes"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {log.status !== "APPROVED" && (
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="text-red-600 hover:text-red-900 ml-4"
                          disabled={!isOnline}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
