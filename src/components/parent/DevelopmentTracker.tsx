import { useState } from "react";
import { Button } from "~/components/ui/Button";

export function DevelopmentTracker() {
  // Demo-only state for toggling milestone checkboxes
  const [observedMilestones, setObservedMilestones] = useState<Record<string, boolean>>({});
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Toggle milestone observed state
  const toggleMilestone = (id: string) => {
    setObservedMilestones(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Demo milestone data organized by category
  const demoMilestones = {
    cognitive: [
      { id: "cog1", text: "Recognizes shapes (circle, square, triangle)" },
      { id: "cog2", text: "Matches simple patterns (AB, ABB)" },
      { id: "cog3", text: "Follows two‐step instructions" }
    ],
    motor: [
      { id: "mot1", text: "Stacks 4–5 blocks" },
      { id: "mot2", text: "Throws a soft ball underhand" },
      { id: "mot3", text: "Uses a crayon with a mature grasp" }
    ],
    language: [
      { id: "lang1", text: "Says five new words per week" },
      { id: "lang2", text: "Uses two‐word phrases (e.g., \"more juice\")" },
      { id: "lang3", text: "Identifies common objects by name" }
    ],
    social: [
      { id: "soc1", text: "Shares a toy with another child" },
      { id: "soc2", text: "Shows basic empathy (comforts a crying friend)" },
      { id: "soc3", text: "Takes turns during a group activity" }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Demo content notice banner */}
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-amber-700">
              <strong>Demo Content:</strong> Placeholder milestones—actual content to be provided by Certified Montessori Teachers.
            </p>
          </div>
        </div>
      </div>

      {/* Cognitive Development Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Cognitive Development</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Milestones related to thinking, learning, and problem-solving
          </p>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {demoMilestones.cognitive.map((milestone) => (
              <li key={milestone.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={observedMilestones[milestone.id] || false}
                    onChange={() => toggleMilestone(milestone.id)}
                  />
                  <label className="ml-3 block text-sm font-medium text-gray-700">
                    {milestone.text}
                  </label>
                  <div className="ml-2 flex-shrink-0">
                    <div 
                      className="text-gray-400 hover:text-gray-500 cursor-help"
                      title="Description coming soon."
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Motor Skills Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Motor Skills</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Milestones related to physical movement and coordination
          </p>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {demoMilestones.motor.map((milestone) => (
              <li key={milestone.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={observedMilestones[milestone.id] || false}
                    onChange={() => toggleMilestone(milestone.id)}
                  />
                  <label className="ml-3 block text-sm font-medium text-gray-700">
                    {milestone.text}
                  </label>
                  <div className="ml-2 flex-shrink-0">
                    <div 
                      className="text-gray-400 hover:text-gray-500 cursor-help"
                      title="Description coming soon."
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Language & Communication Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Language & Communication</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Milestones related to speech, language, and communication skills
          </p>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {demoMilestones.language.map((milestone) => (
              <li key={milestone.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={observedMilestones[milestone.id] || false}
                    onChange={() => toggleMilestone(milestone.id)}
                  />
                  <label className="ml-3 block text-sm font-medium text-gray-700">
                    {milestone.text}
                  </label>
                  <div className="ml-2 flex-shrink-0">
                    <div 
                      className="text-gray-400 hover:text-gray-500 cursor-help"
                      title="Description coming soon."
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Social & Emotional Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Social & Emotional</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Milestones related to social interactions and emotional development
          </p>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {demoMilestones.social.map((milestone) => (
              <li key={milestone.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={observedMilestones[milestone.id] || false}
                    onChange={() => toggleMilestone(milestone.id)}
                  />
                  <label className="ml-3 block text-sm font-medium text-gray-700">
                    {milestone.text}
                  </label>
                  <div className="ml-2 flex-shrink-0">
                    <div 
                      className="text-gray-400 hover:text-gray-500 cursor-help"
                      title="Description coming soon."
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Add Custom Milestone Button */}
      <div className="mt-6 text-right">
        <Button 
          variant="outline" 
          onClick={() => setShowDemoModal(true)}
          disabled={true}
        >
          <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Custom Milestone
        </Button>
      </div>

      {/* Demo Mode Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium text-gray-900">Not Available in Demo</h3>
              <button 
                onClick={() => setShowDemoModal(false)} 
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Custom milestone creation is not available in the demo version.
              </p>
            </div>
            <div className="mt-4">
              <Button onClick={() => setShowDemoModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mt-8">
        <p className="text-sm text-gray-600 text-center">
          Placeholder milestones for demo purposes only. Full content and editing tools will be enabled once Montessori curriculum is integrated.
        </p>
      </div>
    </div>
  );
}
