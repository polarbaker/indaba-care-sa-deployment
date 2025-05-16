import { useState } from "react";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Button } from "~/components/ui/Button";
import { Link } from "@tanstack/react-router";

type NannyAssignment = {
  id: string;
  startDate: Date;
  nanny: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    profileImageUrl?: string;
    availability?: string;
    bio?: string;
    recentHours: number;
    hasExpiringCertifications: boolean;
    certifications: {
      id: string;
      name: string;
      issuingAuthority: string;
      expiryDate?: Date;
      status: string;
      isExpired: boolean;
      expiresInDays?: number;
    }[];
    hoursLogs: {
      id: string;
      date: Date;
      hoursWorked: number;
      notes?: string;
    }[];
  };
};

// Component props
interface NannyViewProps {
  nannies: NannyAssignment[];
}

export function NannyView({ nannies }: NannyViewProps) {
  const [selectedNanny, setSelectedNanny] = useState<string | null>(
    nannies.length > 0 ? nannies[0].nanny.id : null
  );
  const { token } = useAuthStore();
  
  // Get the selected nanny's data
  const currentNanny = nannies.find(n => n.nanny.id === selectedNanny)?.nanny;
  
  // Fetch recent observations for the selected nanny
  const { 
    data: recentObservationsData, 
    isLoading: isLoadingObservations 
  } = api.getObservations.useQuery(
    { 
      token: token || "",
      nannyId: selectedNanny || "",
      limit: 5 
    },
    { 
      enabled: !!token && !!selectedNanny,
      onError: (error) => {
        console.error("Error fetching observations:", error);
      }
    }
  );
  
  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };
  
  // Format time for display
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (nannies.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No nannies assigned</h3>
        <p className="mt-1 text-sm text-gray-500">You don't have any nannies assigned to your family yet.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Nanny selector */}
      {nannies.length > 1 && (
        <div>
          <label htmlFor="nanny-select" className="block text-sm font-medium text-gray-700 mb-1">
            Select Nanny
          </label>
          <select
            id="nanny-select"
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            value={selectedNanny || ""}
            onChange={(e) => setSelectedNanny(e.target.value)}
          >
            {nannies.map((assignment) => (
              <option key={assignment.nanny.id} value={assignment.nanny.id}>
                {assignment.nanny.firstName} {assignment.nanny.lastName}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {currentNanny && (
        <div className="space-y-6">
          {/* Nanny profile header */}
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xl">
                {currentNanny.profileImageUrl ? (
                  <img 
                    src={currentNanny.profileImageUrl} 
                    alt={`${currentNanny.firstName} ${currentNanny.lastName}`}
                    className="h-16 w-16 rounded-full object-cover" 
                  />
                ) : (
                  currentNanny.firstName.charAt(0)
                )}
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                {currentNanny.firstName} {currentNanny.lastName}
              </h3>
              {currentNanny.phoneNumber && (
                <p className="text-sm text-gray-500">
                  {currentNanny.phoneNumber}
                </p>
              )}
              <div className="mt-1 flex items-center">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  currentNanny.hasExpiringCertifications 
                    ? "bg-yellow-100 text-yellow-800" 
                    : "bg-green-100 text-green-800"
                }`}>
                  {currentNanny.hasExpiringCertifications 
                    ? "Certifications expiring soon" 
                    : "Certifications up to date"}
                </span>
              </div>
            </div>
            <div className="ml-auto text-right">
              <Link
                to={`/parent/messages/?recipientId=${currentNanny.id}`}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <svg className="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Message
              </Link>
            </div>
          </div>
          
          {/* Stats section */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Hours Last 30 Days
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {currentNanny.recentHours}
                </dd>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Active Certifications
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {currentNanny.certifications.filter(c => c.status === "Active" && !c.isExpired).length}
                </dd>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Availability
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {currentNanny.availability || "Not specified"}
                </dd>
              </div>
            </div>
          </div>
          
          {/* Bio section */}
          {currentNanny.bio && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">About</h3>
              </div>
              <div className="border-t border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <p className="text-sm text-gray-500">{currentNanny.bio}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Recent hours logs */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Hours</h3>
            </div>
            <div className="border-t border-gray-200">
              {currentNanny.hoursLogs && currentNanny.hoursLogs.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {currentNanny.hoursLogs.slice(0, 5).map((log) => (
                    <li key={log.id} className="px-4 py-4 sm:px-6">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formatDate(log.date)}</p>
                          {log.notes && (
                            <p className="text-sm text-gray-500 mt-1">{log.notes}</p>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 font-medium">{log.hoursWorked} hours</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                  No recent hours logged.
                </div>
              )}
            </div>
          </div>
          
          {/* Certifications */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Certifications</h3>
            </div>
            <div className="border-t border-gray-200">
              {currentNanny.certifications && currentNanny.certifications.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {currentNanny.certifications.map((cert) => (
                    <li key={cert.id} className="px-4 py-4 sm:px-6">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{cert.name}</p>
                          <p className="text-xs text-gray-500">Issued by: {cert.issuingAuthority}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            cert.isExpired 
                              ? "bg-red-100 text-red-800" 
                              : cert.expiresInDays && cert.expiresInDays < 30 
                                ? "bg-yellow-100 text-yellow-800" 
                                : "bg-green-100 text-green-800"
                          }`}>
                            {cert.isExpired 
                              ? "Expired" 
                              : cert.expiresInDays 
                                ? `Expires in ${cert.expiresInDays} days` 
                                : "Active"}
                          </span>
                          {cert.expiryDate && (
                            <p className="text-xs text-gray-500 mt-1">
                              {cert.isExpired ? "Expired on: " : "Expires on: "}
                              {formatDate(cert.expiryDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                  No certifications available.
                </div>
              )}
            </div>
          </div>
          
          {/* Recent observations */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Observations</h3>
              <Link
                to="/parent/observations/"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
            <div className="border-t border-gray-200">
              {isLoadingObservations ? (
                <div className="px-4 py-5 sm:p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ) : !recentObservationsData?.data.length ? (
                <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                  No recent observations to display.
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {recentObservationsData.data.map((observation) => {
                    // Parse aiTags if it exists and is a string
                    const tags = observation.aiTags ? 
                      (() => {
                        try { return JSON.parse(observation.aiTags); } 
                        catch { return []; }
                      })() : [];
                      
                    return (
                      <li key={observation.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div>
                          <div className="flex justify-between">
                            <div className="text-sm font-medium text-gray-900">
                              {observation.childName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(new Date(observation.createdAt))} {formatTime(new Date(observation.createdAt))}
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            {observation.content.length > 150 
                              ? `${observation.content.substring(0, 150)}...` 
                              : observation.content}
                          </div>
                          {tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {tags.slice(0, 3).map((tag: string) => (
                                <span key={tag} className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          
          {/* Feedback section */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Feedback</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Rate your nanny's care and leave comments.
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <Link
                to={`/parent/profile/?tab=feedback&nannyId=${currentNanny.id}`}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <svg className="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
                Provide Feedback
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
