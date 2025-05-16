import React from 'react';

interface HealthAndAllergiesTabProps {
  childId: string;
  onUpdate: () => void; // Callback to refetch child details after an update
}

export function HealthAndAllergiesTab({ childId, onUpdate }: HealthAndAllergiesTabProps) {
  // TODO: Fetch specific health and allergy data for the childId
  // TODO: Implement forms for editing this data
  // TODO: Call onUpdate after successful mutation

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Health & Allergies</h3>
      <p className="text-sm text-gray-600">
        Detailed health information and allergy management for child ID: {childId}.
      </p>
      {/* Placeholder content */}
      <div className="mt-4 p-4 border border-dashed border-gray-300 rounded-md">
        <p className="text-gray-500">Editable medical notes and doctor contacts will be displayed here.</p>
      </div>
    </div>
  );
}
