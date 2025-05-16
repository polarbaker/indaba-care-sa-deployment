# Indaba Care MVP Enhancement: Nanny Profile & Observations

This document provides an overview of the enhancements made to the Indaba Care MVP, focusing on the Nanny Profile and Observations & Notes features.

## 1. Profile Tab Enhancements

### Personal Details
- Added ability to view, add, and update personal information including:
  - Name (first name, last name)
  - Location
  - Availability
  - Phone number
  - Bio
  - Profile image URL

### Family Links
- Created a dedicated tab to view assigned families
- Each family card displays:
  - Parent information (name, contact)
  - Children details (name, age)
  - Home context information

### Certification Management
- Added a comprehensive certification management system:
  - View, add, update, and delete certifications
  - Track certification status (Active, Pending, Expired)
  - Visual progress indicators for certification validity
  - Alerts for upcoming renewals (yellow warning for <30 days, red for expired)
  - Document upload support via URL (with placeholder for direct file uploads)

## 2. Observations & Notes Tab

### Enhanced Observation Types
- Added support for multiple observation formats:
  - Text (basic text observations)
  - Rich Text (formatted text with placeholder for rich text editor)
  - Checklists (interactive items that can be checked/unchecked)
  - Photo, Video, Audio (with placeholders for media uploads)

### Notes to Self
- Added a private notes system that is stored locally:
  - Categorized as "Evergreen" (permanent) or "Child-specific"
  - Support for hashtags to organize notes
  - Full-text search functionality
  - Filter by child or category

### Offline Support
- Enhanced offline-first functionality:
  - Draft saving for observations
  - Local storage for private notes
  - Automatic sync when online for observations
  - Sync operation handling for all new data types

## Technical Implementation

### Database Updates
- Added `CHECKLIST` and `RICHTEXT` to the `ObservationType` enum
- Utilized existing database structure for certifications and family relationships

### Backend Procedures
- Created new tRPC procedures:
  - `getNannyProfile`: Fetches profile with certifications and family data
  - `updateNannyProfile`: Updates personal details
  - `manageCertification`: Handles CRUD operations for certifications
- Updated existing procedures:
  - `createObservation`: Added support for new observation types
  - `syncOperation`: Added handlers for new data models

### State Management
- Created new Zustand stores:
  - `nannyNotesStore`: Manages private notes with localStorage persistence
  - `observationDraftStore`: Handles offline drafts for observations

### UI Components
- Created new components:
  - `ProfileDetails`: Form and display for personal information
  - `FamilyLinks`: Display of assigned families and children
  - `CertificationManager`: Interface for managing certifications
  - `PrivateNoteForm`: Form for creating/editing private notes
- Enhanced existing components:
  - `ObservationForm`: Added support for checklists and rich text

### Navigation
- Updated dashboard navigation to include the new "Observations & Notes" page
- Ensured consistent navigation across all nanny pages

## Future Enhancements

The current implementation includes placeholders for several features that could be enhanced in future iterations:

1. Rich text editor integration for formatted observations
2. Direct file upload for certification documents and media observations
3. More advanced offline sync capabilities
4. Enhanced visualization for certification progress and expiry alerts
5. Real-time notifications for upcoming certification renewals
