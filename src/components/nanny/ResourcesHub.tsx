import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useAIStore } from "~/stores/aiStore";
import { Button } from "~/components/ui/Button";
import { checkAIAvailability } from "~/lib/aiHelpers";
import toast from "react-hot-toast";

// Define resource types
type Resource = {
  id: string;
  title: string;
  description: string;
  contentUrl: string;
  resourceType: string;
  tags: string; // JSON string of tags
  aiTags?: string; // JSON string of AI-generated tags
  createdAt: Date;
  updatedAt: Date;
  isSaved?: boolean;
  userTags?: string[]; // User-defined tags for saved resources
};

// Define AI recommendation types
type AIRecommendation = {
  title: string;
  description: string;
  professionalBenefits: string;
  implementationTips: string;
};

export function ResourcesHub() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDevelopmentalArea, setSelectedDevelopmentalArea] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [savedOnly, setSavedOnly] = useState<boolean>(false);
  const [showAIRecommendations, setShowAIRecommendations] = useState<boolean>(false);
  const [showCertificationResources, setShowCertificationResources] = useState<boolean>(false);
  const { token } = useAuthStore();
  const { isAIAvailable } = useAIStore();
  
  // Mock resources data (in a real implementation, this would be fetched from an API)
  const resources: Resource[] = [
    {
      id: "1",
      title: "Child Development Milestones: 0-5 Years",
      description: "Comprehensive guide to developmental milestones for children from birth to 5 years.",
      contentUrl: "https://example.com/milestones-guide",
      resourceType: "PDF",
      tags: JSON.stringify(["child development", "milestones", "professional"]),
      aiTags: JSON.stringify(["reference", "developmental psychology", "age-appropriate"]),
      createdAt: new Date("2023-01-15"),
      updatedAt: new Date("2023-01-15"),
      isSaved: true,
      userTags: ["reference", "important"]
    },
    {
      id: "2",
      title: "Positive Discipline Techniques for Toddlers",
      description: "Effective strategies for guiding toddler behavior using positive discipline approaches.",
      contentUrl: "https://example.com/positive-discipline",
      resourceType: "Article",
      tags: JSON.stringify(["behavior management", "toddler", "discipline"]),
      aiTags: JSON.stringify(["positive reinforcement", "redirection", "boundaries"]),
      createdAt: new Date("2023-02-20"),
      updatedAt: new Date("2023-02-20"),
      isSaved: false
    },
    {
      id: "3",
      title: "Supporting Language Development Through Play",
      description: "Activities and techniques to encourage language acquisition through everyday interactions.",
      contentUrl: "https://example.com/language-play",
      resourceType: "Video",
      tags: JSON.stringify(["language", "play-based learning", "communication"]),
      aiTags: JSON.stringify(["vocabulary", "speech development", "interactive"]),
      createdAt: new Date("2023-03-10"),
      updatedAt: new Date("2023-03-10"),
      isSaved: true,
      userTags: ["activities", "language"]
    },
    {
      id: "4",
      title: "Child Nutrition: Creating Balanced Meals",
      description: "Guide to planning and preparing nutritious meals for children of different ages.",
      contentUrl: "https://example.com/nutrition-guide",
      resourceType: "Article",
      tags: JSON.stringify(["nutrition", "meal planning", "health"]),
      aiTags: JSON.stringify(["balanced diet", "food groups", "healthy eating"]),
      createdAt: new Date("2023-04-05"),
      updatedAt: new Date("2023-04-05"),
      isSaved: false
    },
    {
      id: "5",
      title: "First Aid for Childcare Professionals",
      description: "Essential first aid skills and emergency procedures for nannies and childcare providers.",
      contentUrl: "https://example.com/first-aid",
      resourceType: "Video",
      tags: JSON.stringify(["safety", "first aid", "certification"]),
      aiTags: JSON.stringify(["emergency response", "CPR", "injury prevention"]),
      createdAt: new Date("2023-05-12"),
      updatedAt: new Date("2023-05-12"),
      isSaved: true,
      userTags: ["certification", "safety"]
    },
    {
      id: "6",
      title: "Professional Communication with Parents",
      description: "Best practices for effective and respectful communication with parents and families.",
      contentUrl: "https://example.com/communication-guide",
      resourceType: "PDF",
      tags: JSON.stringify(["communication", "professional development", "family relationships"]),
      aiTags: JSON.stringify(["boundaries", "feedback", "collaboration"]),
      createdAt: new Date("2023-06-18"),
      updatedAt: new Date("2023-06-18"),
      isSaved: false
    }
  ];
  
  // Mock AI recommendations
  const aiRecommendations: AIRecommendation[] = [
    {
      title: "Observation Journaling Technique",
      description: "Implement a structured approach to documenting child observations using the ABC (Antecedent, Behavior, Consequence) method.",
      professionalBenefits: "Improved assessment skills, better communication with parents, evidence-based developmental tracking",
      implementationTips: "Set aside 10 minutes daily, use a dedicated notebook or app, focus on one child per day"
    },
    {
      title: "Emotion Coaching Method",
      description: "Learn to identify, validate, and guide children through their emotions using the five steps of emotion coaching.",
      professionalBenefits: "Enhanced emotional intelligence support, reduced behavioral challenges, stronger child-caregiver bond",
      implementationTips: "Practice active listening, use simple emotion vocabulary, model healthy emotional expression"
    },
    {
      title: "Sensory Learning Stations",
      description: "Create designated areas with different sensory experiences that support multiple developmental domains.",
      professionalBenefits: "Supports cognitive development, addresses various learning styles, encourages independence",
      implementationTips: "Rotate materials weekly, include natural elements, ensure accessibility for different ages"
    }
  ];
  
  // Filter resources based on selected filters
  const filteredResources = resources.filter(resource => {
    // Filter by saved status
    if (savedOnly && !resource.isSaved) {
      return false;
    }
    
    // Filter by category (resource type)
    if (selectedCategory !== "all" && resource.resourceType !== selectedCategory) {
      return false;
    }
    
    // Filter by developmental area (using tags)
    if (selectedDevelopmentalArea !== "all") {
      const tags = JSON.parse(resource.tags);
      
      if (selectedDevelopmentalArea === "language" && 
          !tags.some((tag: string) => tag.includes("language") || tag.includes("communication"))) {
        return false;
      } else if (selectedDevelopmentalArea === "social" && 
                !tags.some((tag: string) => tag.includes("social") || tag.includes("emotional"))) {
        return false;
      } else if (selectedDevelopmentalArea === "cognitive" && 
                !tags.some((tag: string) => tag.includes("cognitive") || tag.includes("learning"))) {
        return false;
      } else if (selectedDevelopmentalArea === "physical" && 
                !tags.some((tag: string) => tag.includes("physical") || tag.includes("motor"))) {
        return false;
      } else if (selectedDevelopmentalArea === "professional" && 
                !tags.some((tag: string) => tag.includes("professional") || tag.includes("certification"))) {
        return false;
      }
    }
    
    // Filter for certification resources
    if (showCertificationResources) {
      const tags = JSON.parse(resource.tags);
      if (!tags.includes("certification")) {
        return false;
      }
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = resource.title.toLowerCase().includes(query);
      const descriptionMatch = resource.description.toLowerCase().includes(query);
      const tagsMatch = resource.tags.toLowerCase().includes(query);
      
      return titleMatch || descriptionMatch || tagsMatch;
    }
    
    return true;
  });
  
  // Toggle save status for a resource
  const toggleSaveResource = (resourceId: string) => {
    // In a real implementation, this would call an API to save/unsave the resource
    toast.success(`Resource ${resources.find(r => r.id === resourceId)?.isSaved ? 'removed from' : 'added to'} saved items`);
  };
  
  // Toggle AI recommendations
  const toggleAIRecommendations = () => {
    if (!isAIAvailable && !showAIRecommendations) {
      checkAIAvailability("AI recommendations");
      return;
    }
    
    setShowAIRecommendations(!showAIRecommendations);
  };
  
  // Get unique categories from resources
  const categories = ["all", ...Array.from(new Set(resources.map(r => r.resourceType)))];
  
  // Define developmental areas
  const developmentalAreas = [
    { id: "all", label: "All Areas" },
    { id: "language", label: "Language & Communication" },
    { id: "social", label: "Social & Emotional" },
    { id: "cognitive", label: "Cognitive & Learning" },
    { id: "physical", label: "Physical Development" },
    { id: "professional", label: "Professional Development" }
  ];
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Category filter */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Resource Type
            </label>
            <select
              id="category"
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "All Types" : category}
                </option>
              ))}
            </select>
          </div>
          
          {/* Developmental area filter */}
          <div>
            <label htmlFor="developmental-area" className="block text-sm font-medium text-gray-700 mb-1">
              Developmental Area
            </label>
            <select
              id="developmental-area"
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              value={selectedDevelopmentalArea}
              onChange={(e) => setSelectedDevelopmentalArea(e.target.value)}
            >
              {developmentalAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col justify-end space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={savedOnly}
                onChange={() => setSavedOnly(!savedOnly)}
              />
              <span className="ml-2 text-sm text-gray-700">Saved items only</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={showCertificationResources}
                onChange={() => setShowCertificationResources(!showCertificationResources)}
              />
              <span className="ml-2 text-sm text-gray-700">Certification resources</span>
            </label>
          </div>
        </div>
        
        {/* AI Recommendations button */}
        {isAIAvailable && (
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              variant={showAIRecommendations ? "primary" : "outline"}
              onClick={toggleAIRecommendations}
            >
              <svg className="mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              {showAIRecommendations ? "Hide AI Recommendations" : "Show Professional Development Tips"}
            </Button>
          </div>
        )}
      </div>
      
      {/* AI Recommendations */}
      {showAIRecommendations && (
        <div className="bg-indigo-50 shadow rounded-lg p-4">
          <h3 className="text-lg font-medium text-indigo-900 mb-4">AI Professional Development Recommendations</h3>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {aiRecommendations.map((recommendation, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-4 border border-indigo-100">
                <h4 className="text-md font-medium text-indigo-900">{recommendation.title}</h4>
                <p className="mt-1 text-sm text-gray-600">{recommendation.description}</p>
                
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-gray-700">Professional Benefits:</h5>
                  <p className="text-xs text-gray-600">{recommendation.professionalBenefits}</p>
                </div>
                
                <div className="mt-2">
                  <h5 className="text-xs font-medium text-gray-700">Implementation Tips:</h5>
                  <p className="text-xs text-gray-600">{recommendation.implementationTips}</p>
                </div>
                
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 hover:bg-indigo-100"
                  >
                    <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                    </svg>
                    Save Recommendation
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Resources list */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Professional Resources</h3>
          <p className="mt-1 text-sm text-gray-500">
            Browse curated content for childcare professionals and early childhood educators
          </p>
        </div>
        
        {filteredResources.length === 0 ? (
          <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
            No resources match your filters. Try adjusting your search criteria.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredResources.map((resource) => {
              // Parse tags
              const tags = JSON.parse(resource.tags);
              const aiTags = resource.aiTags ? JSON.parse(resource.aiTags) : [];
              
              return (
                <li key={resource.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h4 className="text-md font-medium text-gray-900">{resource.title}</h4>
                        <span className="ml-2 inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                          {resource.resourceType}
                        </span>
                      </div>
                      
                      <p className="mt-1 text-sm text-gray-600">{resource.description}</p>
                      
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.map((tag: string) => (
                          <span key={tag} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {tag}
                          </span>
                        ))}
                        
                        {aiTags.map((tag: string) => (
                          <span key={tag} className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                            {tag}
                          </span>
                        ))}
                        
                        {resource.userTags && resource.userTags.map((tag: string) => (
                          <span key={tag} className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-3 sm:mt-0 sm:ml-4 flex flex-col sm:items-end space-y-2">
                      <a
                        href={resource.contentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      >
                        <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                        View Resource
                      </a>
                      
                      <button
                        type="button"
                        onClick={() => toggleSaveResource(resource.id)}
                        className={`inline-flex items-center rounded-md ${
                          resource.isSaved
                            ? "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-700/10 hover:bg-yellow-100"
                            : "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-700/10 hover:bg-gray-100"
                        } px-2 py-1 text-xs font-medium`}
                      >
                        <svg className="mr-1 h-4 w-4" fill={resource.isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                        </svg>
                        {resource.isSaved ? "Saved" : "Save"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
