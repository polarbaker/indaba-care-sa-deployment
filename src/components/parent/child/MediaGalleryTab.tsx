import React from 'react';

interface MediaGalleryTabProps {
  childId: string;
}

export function MediaGalleryTab({ childId }: MediaGalleryTabProps) {
  // TODO: Fetch media (photos, audio clips) for the childId
  // TODO: Implement display of media items

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Media Gallery</h3>
      <p className="text-sm text-gray-600">
        View photos and audio clips for child ID: {childId}.
      </p>
      {/* Placeholder content */}
      <div className="mt-4 p-4 border border-dashed border-gray-300 rounded-md">
        <p className="text-gray-500">Media gallery (photos, audio clips) will be displayed here.</p>
      </div>
    </div>
  );
}
