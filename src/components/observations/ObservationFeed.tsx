import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '~/components/ui/Button'; // Assuming Button component exists
import { api } from '~/trpc/react';
import { useAuthStore } from '~/stores/authStore';

type Observation = {
  id: string;
  childId: string;
  childName: string;
  nannyName?: string; // Nanny name might not always be present depending on context/permissions
  type: string; // TEXT, PHOTO, VIDEO, AUDIO, CHECKLIST, RICHTEXT
  content: string;
  aiTags?: string; // JSON string of tags
  createdAt: string; // ISO date string
  // Add other relevant fields like mediaUrl for PHOTO/VIDEO/AUDIO if applicable
};

interface ObservationFeedProps {
  // Initial set of observations, more can be loaded via infinite scroll
  initialObservations?: Observation[]; 
  // Function to load more observations for infinite scroll
  loadMoreObservations?: () => Promise<void>; 
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  isLoading?: boolean;
  // Filters
  childFilter?: string; // Child ID
  setChildFilter?: (childId: string | "all") => void;
  dateRangeFilter?: { start?: Date, end?: Date };
  setDateRangeFilter?: (range: { start?: Date, end?: Date }) => void;
  tagFilter?: string;
  setTagFilter?: (tag: string) => void;
  // Available children for filter dropdown
  availableChildren?: { id: string; firstName: string; lastName: string }[];
  // Available tags for filter dropdown (could be fetched or derived)
  availableTags?: string[];
  // Role of the current user to customize UI/actions
  userRole: "PARENT" | "NANNY" | "ADMIN"; 
}

export function ObservationFeed({
  initialObservations = [],
  loadMoreObservations,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  childFilter,
  setChildFilter,
  dateRangeFilter,
  setDateRangeFilter,
  tagFilter,
  setTagFilter,
  availableChildren = [],
  availableTags = [],
  userRole,
}: ObservationFeedProps) {

  const [observations, setObservations] = useState<Observation[]>(initialObservations);
  // TODO: Fetch observations using a tRPC query if not provided via props,
  // or manage state if this component is responsible for its own data fetching.
  // For now, we assume data is passed in or managed by a parent component.

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };
  
  const parseTags = (tagsString?: string): string[] => {
    if (!tagsString) return [];
    try {
      const parsed = JSON.parse(tagsString);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="p-4 bg-gray-50 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Child Filter */}
          {setChildFilter && (
            <div>
              <label htmlFor="child-filter" className="block text-sm font-medium text-gray-700">
                Filter by Child
              </label>
              <select
                id="child-filter"
                name="child-filter"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={childFilter || "all"}
                onChange={(e) => setChildFilter(e.target.value)}
              >
                <option value="all">All Children</option>
                {availableChildren.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.firstName} {child.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Filter - Basic Implementation */}
          {setDateRangeFilter && (
            <div>
              <label htmlFor="date-filter-start" className="block text-sm font-medium text-gray-700">
                Date Range
              </label>
              <div className="mt-1 flex space-x-2">
                <input 
                  type="date" 
                  id="date-filter-start"
                  className="block w-full pl-3 pr-1 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={dateRangeFilter?.start?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, start: e.target.value ? new Date(e.target.value) : undefined })}
                />
                <input 
                  type="date" 
                  id="date-filter-end"
                  className="block w-full pl-3 pr-1 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={dateRangeFilter?.end?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, end: e.target.value ? new Date(e.target.value) : undefined })}
                />
              </div>
            </div>
          )}

          {/* Tag Filter */}
          {setTagFilter && availableTags.length > 0 && (
             <div>
              <label htmlFor="tag-filter" className="block text-sm font-medium text-gray-700">
                Filter by Tag
              </label>
              <select
                id="tag-filter"
                name="tag-filter"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={tagFilter || ""}
                onChange={(e) => setTagFilter(e.target.value)}
              >
                <option value="">All Tags</option>
                {availableTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Observation List */}
      {isLoading && observations.length === 0 ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading observations...</p>
        </div>
      ) : observations.length === 0 ? (
        <div className="text-center py-10 bg-white shadow rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No observations found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {userRole === 'NANNY' ? "Get started by logging a new observation." : "No observations match your current filters."}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {observations.map((observation) => (
              <li key={observation.id} className="p-4 sm:p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 truncate">
                      <Link to={ userRole === 'NANNY' ? `/nanny/observations/${observation.id}` : `/parent/observations/${observation.id}`}>
                        Observation for {observation.childName}
                      </Link>
                    </p>
                    {observation.nannyName && <p className="text-xs text-gray-500">Logged by: {observation.nannyName}</p>}
                    <p className="text-xs text-gray-500">{formatDate(observation.createdAt)}</p>
                  </div>
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {observation.type}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  <p>{observation.content.length > 200 ? `${observation.content.substring(0, 200)}...` : observation.content}</p>
                </div>
                {parseTags(observation.aiTags).length > 0 && (
                  <div className="mt-2">
                    {parseTags(observation.aiTags).map(tag => (
                      <span key={tag} className="mr-1 mb-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {/* TODO: Link to observation detail page */}
                <div className="mt-3 text-right">
                   <Link 
                    to={ userRole === 'NANNY' ? `/nanny/observations/${observation.id}` : `/parent/observations/${observation.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    View Details &rarr;
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Load More Button */}
      {hasNextPage && loadMoreObservations && (
        <div className="mt-6 text-center">
          <Button
            onClick={loadMoreObservations}
            isLoading={isFetchingNextPage}
            variant="outline"
          >
            Load More Observations
          </Button>
        </div>
      )}
    </div>
  );
}
