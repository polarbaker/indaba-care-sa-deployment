import { useState } from "react";
import { useAIStore } from "~/stores/aiStore";
import { Button } from "~/components/ui/Button";

/**
 * An enhanced banner that displays when AI features are unavailable.
 * This helps users understand that certain AI features are in demo mode
 * and provides information about which features are affected.
 */
export function AIStatusBanner() {
  const { isAIAvailable } = useAIStore();
  const [expanded, setExpanded] = useState(false);
  
  // Only show banner when AI is not available
  if (isAIAvailable) {
    return null;
  }
  
  return (
    <div className="bg-blue-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto py-2 px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center">
            <span className="flex p-2 rounded-lg bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </span>
            <p className="ml-3 font-medium text-blue-700 truncate">
              <span className="md:hidden">AI features are in demo mode</span>
              <span className="hidden md:inline">AI features are currently in demo mode. All other features are fully functional.</span>
            </p>
          </div>
          <div className="flex-shrink-0 order-2 mt-0 w-auto">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-blue-600 bg-blue-100 hover:bg-blue-200"
            >
              {expanded ? "Hide details" : "Learn more"}
            </button>
          </div>
        </div>
        
        {expanded && (
          <div className="mt-2 pt-2 border-t border-blue-200">
            <div className="text-sm text-blue-700">
              <p className="mb-2">The following AI features are currently in demo mode:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>AI-assisted message drafting</li>
                <li>Automatic message summarization</li>
                <li>Observation tag generation</li>
                <li>Child development recommendations</li>
              </ul>
              <p className="mt-2">
                In demo mode, these features will use simplified fallbacks instead of AI-generated content.
                To enable full AI functionality, an OpenAI API key needs to be configured.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}