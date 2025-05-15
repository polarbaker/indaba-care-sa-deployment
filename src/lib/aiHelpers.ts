import toast from "react-hot-toast";
import { isAIAvailable } from "~/env";

/**
 * Shows an enhanced toast notification when an AI feature is attempted but unavailable
 * @param featureName The name of the AI feature being attempted
 * @param alternativeAction Optional suggestion for an alternative action
 */
export function showAIUnavailableMessage(
  featureName: string = "This AI feature",
  alternativeAction?: string
) {
  const baseMessage = `${featureName} is not available in demo mode.`;
  const actionMessage = alternativeAction 
    ? ` ${alternativeAction}` 
    : " Basic fallback functionality will be used instead.";
  
  toast.error(
    baseMessage + actionMessage,
    { 
      duration: 5000,
      style: {
        maxWidth: '500px',
        padding: '12px 16px'
      }
    }
  );
}

/**
 * Checks if AI is available and shows a message if it's not
 * @param featureName The name of the AI feature being checked
 * @returns Whether AI is available
 */
export function checkAIAvailability(featureName: string = "This AI feature"): boolean {
  const aiAvailable = isAIAvailable();
  
  if (!aiAvailable) {
    showAIUnavailableMessage(featureName);
  }
  
  return aiAvailable;
}

/**
 * Provides improved fallback values for AI-generated content when AI is unavailable
 * @param type The type of content to generate fallbacks for
 * @param context Optional context to make fallbacks more relevant
 * @returns Appropriate fallback content
 */
export function getAIFallbackContent(
  type: 'tags' | 'summary' | 'recommendation' | 'assistance',
  context?: {
    content?: string;
    childName?: string;
    childAge?: number;
    interests?: string[];
  }
) {
  switch (type) {
    case 'tags':
      // Generate basic tags based on content if available
      if (context?.content) {
        const content = context.content.toLowerCase();
        const possibleTags = [
          { term: "play", tags: ["play", "social development", "recreation"] },
          { term: "read", tags: ["reading", "literacy", "language development"] },
          { term: "draw", tags: ["art", "fine motor", "creativity"] },
          { term: "talk", tags: ["communication", "language development", "social"] },
          { term: "eat", tags: ["nutrition", "self-care", "routine"] },
          { term: "sleep", tags: ["rest", "routine", "self-regulation"] },
          { term: "share", tags: ["sharing", "social development", "emotional development"] },
          { term: "build", tags: ["construction", "fine motor", "problem solving"] },
          { term: "run", tags: ["physical activity", "gross motor", "outdoor play"] },
          { term: "sing", tags: ["music", "language development", "expression"] },
        ];
        
        // Find matching tags based on content
        const matchingTags = possibleTags
          .filter(item => content.includes(item.term))
          .flatMap(item => item.tags);
        
        // Add default tags if no matches
        if (matchingTags.length === 0) {
          return ["observation", "development", "activity"];
        }
        
        // Return unique tags
        return [...new Set(matchingTags)];
      }
      return ["observation", "development", "activity"];
      
    case 'summary':
      // Create a basic summary that mentions the child if available
      if (context?.childName) {
        return `This conversation contains updates about ${context.childName}'s activities and development.`;
      }
      return "This conversation contains updates about the child's activities and development.";
      
    case 'recommendation':
      // Provide age-appropriate recommendations if age is available
      if (context?.childAge !== undefined) {
        if (context.childAge < 12) { // Under 1 year
          return [
            {
              title: "Sensory play activities",
              description: "Simple sensory experiences like touching different textures or looking at high-contrast images.",
              developmentalBenefits: "Sensory development, cognitive development",
              materialsNeeded: "Household items with different textures, high-contrast cards"
            },
            {
              title: "Tummy time",
              description: "Supervised time on their tummy to strengthen neck and upper body muscles.",
              developmentalBenefits: "Physical development, motor skills",
              materialsNeeded: "Clean, flat surface with a thin mat or blanket"
            }
          ];
        } else if (context.childAge < 36) { // 1-3 years
          return [
            {
              title: "Simple puzzles and stacking toys",
              description: "Age-appropriate puzzles with large pieces and stacking/nesting toys.",
              developmentalBenefits: "Fine motor skills, problem-solving, spatial awareness",
              materialsNeeded: "Simple puzzles, stacking cups or blocks"
            },
            {
              title: "Picture books and storytelling",
              description: "Reading picture books together and talking about the images.",
              developmentalBenefits: "Language development, attention span, bonding",
              materialsNeeded: "Age-appropriate picture books"
            }
          ];
        } else { // 3+ years
          return [
            {
              title: "Pretend play scenarios",
              description: "Role-playing different scenarios like store, doctor, or house.",
              developmentalBenefits: "Social-emotional development, language, creativity",
              materialsNeeded: "Simple props related to the chosen scenario"
            },
            {
              title: "Outdoor exploration",
              description: "Nature walks with opportunities to observe and collect natural items.",
              developmentalBenefits: "Physical activity, scientific thinking, sensory development",
              materialsNeeded: "Safe outdoor space, collection container"
            }
          ];
        }
      }
      
      // Default recommendations
      return [
        {
          title: "Age-appropriate activity",
          description: "Activities appropriate for this age group focus on key developmental milestones.",
          developmentalBenefits: "General development",
          materialsNeeded: "Basic household items"
        },
        {
          title: "Reading time",
          description: "Regular reading supports language development at any age.",
          developmentalBenefits: "Language development, bonding",
          materialsNeeded: "Age-appropriate books"
        }
      ];
      
    case 'assistance':
      // Provide simple enhancement to the original content if available
      if (context?.content) {
        const content = context.content.trim();
        // If content is very short, suggest expanding it
        if (content.length < 30) {
          return `${content}\n\nYou might want to add more details about specific activities or behaviors you observed.`;
        }
        // If content doesn't end with punctuation, add a closing sentence
        if (!content.match(/[.!?]$/)) {
          return `${content}. Please let me know if you have any questions about this update.`;
        }
        // Otherwise just return a slightly enhanced version
        return `${content}\n\nPlease let me know if you have any questions about this update.`;
      }
      return "I would recommend providing specific details about what you observed, including any notable behaviors or activities.";
      
    default:
      return null;
  }
}

/**
 * Checks if content might contain sensitive information that should be handled carefully
 * This is a simple implementation that could be expanded with more sophisticated checks
 * @param content The content to check
 * @returns Whether the content appears to contain sensitive information
 */
export function containsSensitiveInformation(content: string): boolean {
  const sensitivePatterns = [
    /\b(?:medication|diagnos(?:is|ed)|allerg(?:y|ic|ies))\b/i,  // Medical terms
    /\b(?:concern|worried|problem|issue|behavior)\b/i,          // Concern indicators
    /\b(?:confiden[ct]ial|private|sensitive)\b/i,               // Privacy indicators
    /\b(?:incident|accident|injury|hurt)\b/i,                   // Incident indicators
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(content));
}