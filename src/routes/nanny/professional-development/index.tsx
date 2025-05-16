import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { ResourcesHub } from "~/components/nanny/ResourcesHub";
import { useAuthStore } from "~/stores/authStore";
import { Button } from "~/components/ui/Button";

const nannyNavigation = [
  {
    name: "Dashboard",
    to: "/nanny/dashboard/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    name: "My Profile",
    to: "/nanny/profile/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    name: "Observations & Notes",
    to: "/nanny/observations-notes/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: "Messages",
    to: "/nanny/messages/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    name: "Professional Dev",
    to: "/nanny/professional-development/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    name: "Hours Log",
    to: "/nanny/hours-log/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

type ProfessionalDevTab = "resources" | "certifications" | "learning-paths" | "community";

export const Route = createFileRoute("/nanny/professional-development/")({
  component: ProfessionalDevelopment,
});

function ProfessionalDevelopment() {
  const [activeTab, setActiveTab] = useState<ProfessionalDevTab>("resources");
  const { user } = useAuthStore();
  
  // Mock certification data
  const certifications = [
    { 
      id: "1", 
      name: "Pediatric First Aid & CPR", 
      issuer: "Red Cross", 
      dateEarned: "2023-05-15", 
      expiryDate: "2025-05-15", 
      status: "active" 
    },
    { 
      id: "2", 
      name: "Child Development Associate (CDA)", 
      issuer: "Council for Professional Recognition", 
      dateEarned: "2022-08-10", 
      expiryDate: "2025-08-10", 
      status: "active" 
    }
  ];
  
  // Mock learning paths
  const learningPaths = [
    {
      id: "1",
      title: "Early Childhood Development Specialist",
      description: "Comprehensive training in child development from birth to age 5",
      progress: 65,
      modules: 12,
      completedModules: 8
    },
    {
      id: "2",
      title: "Positive Discipline Practitioner",
      description: "Learn effective, respectful approaches to guiding children's behavior",
      progress: 30,
      modules: 8,
      completedModules: 2
    }
  ];
  
  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "resources":
        return <ResourcesHub />;
      case "certifications":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Your Certifications</h3>
              <Button size="sm">Add Certification</Button>
            </div>
            
            {certifications.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                You haven't added any certifications yet. Click "Add Certification" to get started.
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {certifications.map((cert) => (
                    <li key={cert.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-medium text-gray-900">{cert.name}</h4>
                          <p className="text-sm text-gray-500">Issued by {cert.issuer}</p>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <span className="mr-2">Earned: {new Date(cert.dateEarned).toLocaleDateString()}</span>
                            <span>Expires: {new Date(cert.expiryDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            new Date(cert.expiryDate) > new Date() 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {new Date(cert.expiryDate) > new Date() ? 'Active' : 'Expired'}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recommended Certifications</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="text-base font-medium text-gray-900">Responsive Caregiving Certificate</h4>
                  <p className="text-sm text-gray-500 mt-1">Learn how to respond effectively to children's needs and cues.</p>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-500">Estimated time: 6 hours</span>
                    <button className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                      Learn more
                      <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="text-base font-medium text-gray-900">Special Needs Inclusion Specialist</h4>
                  <p className="text-sm text-gray-500 mt-1">Develop skills to support children with diverse needs and abilities.</p>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-500">Estimated time: 12 hours</span>
                    <button className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                      Learn more
                      <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "learning-paths":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Your Learning Paths</h3>
            
            {learningPaths.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                You haven't enrolled in any learning paths yet. Browse available paths below.
              </div>
            ) : (
              <div className="space-y-4">
                {learningPaths.map((path) => (
                  <div key={path.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6">
                      <h4 className="text-lg font-medium text-gray-900">{path.title}</h4>
                      <p className="mt-1 max-w-2xl text-sm text-gray-500">{path.description}</p>
                    </div>
                    <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                      <div className="mb-2 flex justify-between">
                        <span className="text-sm font-medium text-gray-700">Progress: {path.progress}%</span>
                        <span className="text-sm text-gray-500">{path.completedModules} of {path.modules} modules completed</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${path.progress}%` }}></div>
                      </div>
                      <div className="mt-4">
                        <Button>Continue Learning</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recommended Learning Paths</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="text-base font-medium text-gray-900">Multilingual Childcare Specialist</h4>
                  <p className="text-sm text-gray-500 mt-1">Learn techniques for supporting language development in multilingual children.</p>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-500">10 modules • 15 hours</span>
                    <button className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                      Enroll
                      <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="text-base font-medium text-gray-900">Nature-Based Learning Facilitator</h4>
                  <p className="text-sm text-gray-500 mt-1">Discover how to incorporate nature and outdoor experiences into childcare.</p>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-500">8 modules • 12 hours</span>
                    <button className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                      Enroll
                      <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "community":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Nanny Community</h3>
              <Button size="sm">Create Post</Button>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h4 className="text-base font-medium text-gray-900">Discussion Forums</h4>
                <p className="mt-1 text-sm text-gray-500">Connect with other childcare professionals</p>
              </div>
              
              <div className="divide-y divide-gray-200">
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="text-base font-medium text-gray-900">Best Practices for Toddler Transitions</h5>
                      <p className="mt-1 text-sm text-gray-500">26 posts • Last activity 2 hours ago</p>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      Active
                    </span>
                  </div>
                </div>
                
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="text-base font-medium text-gray-900">Supporting Children Through Family Changes</h5>
                      <p className="mt-1 text-sm text-gray-500">18 posts • Last activity 1 day ago</p>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      Active
                    </span>
                  </div>
                </div>
                
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="text-base font-medium text-gray-900">Career Growth and Professional Development</h5>
                      <p className="mt-1 text-sm text-gray-500">42 posts • Last activity 3 days ago</p>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h4 className="text-base font-medium text-gray-900">Upcoming Events</h4>
                <p className="mt-1 text-sm text-gray-500">Virtual and in-person professional development opportunities</p>
              </div>
              
              <div className="divide-y divide-gray-200">
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="text-base font-medium text-gray-900">Webinar: Nurturing Emotional Intelligence in Children</h5>
                      <p className="mt-1 text-sm text-gray-500">June 15, 2023 • 7:00 PM - 8:30 PM • Virtual</p>
                    </div>
                    <button className="rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 hover:bg-blue-100">
                      Register
                    </button>
                  </div>
                </div>
                
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="text-base font-medium text-gray-900">Workshop: Creative Art Activities for Preschoolers</h5>
                      <p className="mt-1 text-sm text-gray-500">June 22, 2023 • 10:00 AM - 12:00 PM • Community Center</p>
                    </div>
                    <button className="rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 hover:bg-blue-100">
                      Register
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <DashboardLayout 
      title="Professional Development" 
      navigation={nannyNavigation}
    >
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900">Welcome to Professional Development</h2>
          <p className="mt-1 text-gray-500">
            Access resources, certifications, and learning opportunities to enhance your childcare skills.
          </p>
        </div>
        
        {/* Professional Development tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("resources")}
              className={`${
                activeTab === "resources"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Resources Hub
            </button>
            <button
              onClick={() => setActiveTab("certifications")}
              className={`${
                activeTab === "certifications"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Certifications
            </button>
            <button
              onClick={() => setActiveTab("learning-paths")}
              className={`${
                activeTab === "learning-paths"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Learning Paths
            </button>
            <button
              onClick={() => setActiveTab("community")}
              className={`${
                activeTab === "community"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Community
            </button>
          </nav>
        </div>
        
        {/* Tab content */}
        <div>
          {renderTabContent()}
        </div>
      </div>
    </DashboardLayout>
  );
}
