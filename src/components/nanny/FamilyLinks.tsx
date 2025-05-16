import React from "react";

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  profileImageUrl?: string;
}

interface Parent {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profileImageUrl?: string;
}

interface Family {
  id: string;
  name: string;
  homeDetails?: string;
  parent: Parent;
  children: Child[];
}

interface FamilyAssignment {
  id: string;
  startDate: string;
  family: Family;
}

interface FamilyLinksProps {
  families: FamilyAssignment[];
}

export function FamilyLinks({ families }: FamilyLinksProps) {
  if (!families || families.length === 0) {
    return (
      <div className="text-center py-10">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No families assigned</h3>
        <p className="mt-1 text-sm text-gray-500">You don't have any assigned families yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h3 className="text-lg font-medium text-gray-900">Assigned Families</h3>
      
      {families.map((assignment) => (
        <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-medium text-gray-900">{assignment.family.name}</h4>
              <span className="text-sm text-gray-500">
                Assigned since {new Date(assignment.startDate).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="px-6 py-4">
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-500 mb-2">Parents</h5>
              <div className="flex items-center">
                {assignment.family.parent.profileImageUrl ? (
                  <img 
                    src={assignment.family.parent.profileImageUrl} 
                    alt={`${assignment.family.parent.firstName} ${assignment.family.parent.lastName}`}
                    className="h-10 w-10 rounded-full mr-3"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                    <span className="text-gray-600 font-medium">
                      {assignment.family.parent.firstName.charAt(0)}
                      {assignment.family.parent.lastName.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {assignment.family.parent.firstName} {assignment.family.parent.lastName}
                  </p>
                  {assignment.family.parent.phoneNumber && (
                    <p className="text-xs text-gray-500">{assignment.family.parent.phoneNumber}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-500 mb-2">Children</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignment.family.children.map((child) => (
                  <div key={child.id} className="flex items-center p-3 border border-gray-100 rounded-md">
                    {child.profileImageUrl ? (
                      <img 
                        src={child.profileImageUrl} 
                        alt={`${child.firstName} ${child.lastName}`}
                        className="h-12 w-12 rounded-full mr-3"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-medium">
                          {child.firstName.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {child.firstName} {child.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {child.age} {child.age === 1 ? 'year' : 'years'} old
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {assignment.family.homeDetails && (
              <div>
                <h5 className="text-sm font-medium text-gray-500 mb-2">Home Context</h5>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                  {assignment.family.homeDetails}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
