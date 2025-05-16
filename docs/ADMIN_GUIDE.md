# Indaba Care Administrator Guide

![Admin Dashboard](images/admin-dashboard.png)

Welcome to the Indaba Care Administrator Guide. This comprehensive resource is designed for system administrators responsible for managing the Indaba Care platform. You'll find detailed instructions for all administrative functions, from user management to system configuration.

## Table of Contents

- [Administrator Role Overview](#administrator-role-overview)
- [Dashboard Overview](#dashboard-overview)
- [User Management](#user-management)
- [Agency Management](#agency-management)
- [Content Moderation](#content-moderation)
- [Resource Management](#resource-management)
- [Reporting and Analytics](#reporting-and-analytics)
- [System Configuration](#system-configuration)
- [Security and Compliance](#security-and-compliance)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)
- [Best Practices](#best-practices)

## Administrator Role Overview

As an administrator, you have comprehensive access to manage the Indaba Care platform. Your responsibilities include:

### Primary Responsibilities

- **User Management** - Create, modify, and deactivate user accounts
- **Content Oversight** - Ensure all content meets community standards
- **System Configuration** - Customize platform settings and features
- **Resource Management** - Curate educational resources for users
- **Reporting** - Generate and analyze platform usage reports
- **Technical Support** - Assist users with platform-related issues
- **Security Monitoring** - Maintain the security and integrity of the platform

### Access Levels

There are three levels of administrative access:

1. **Super Administrator** - Complete access to all system functions
2. **Content Administrator** - Focused on content moderation and resources
3. **Support Administrator** - User management and basic support functions

Your access level determines which features and settings you can modify.

> **Note:** This guide covers all administrative functions. Some sections may not apply to your specific access level.

## Dashboard Overview

The administrator dashboard provides a comprehensive overview of platform activity and quick access to all administrative functions.

![Admin Dashboard Annotated](images/admin-dashboard-annotated.png)

### Dashboard Sections

1. **Main Navigation** - Access all administrative functions
2. **System Metrics** - Key statistics about platform usage
3. **Recent Users** - List of recently active or newly registered users
4. **Activity Feed** - Real-time stream of significant platform events
5. **Flagged Content** - Content requiring moderation attention
6. **Quick Actions** - Buttons for common administrative tasks
7. **System Status** - Health indicators for platform components

### System Metrics Explained

- **Total Users** - Count of all registered users
- **Active Nannies** - Nannies who have logged in within the past 30 days
- **Active Parents** - Parents who have logged in within the past 30 days
- **Observations** - Total number of observations recorded
- **Pending Flags** - Content items flagged for review
- **Active Certifications** - Valid nanny certifications in the system

### Activity Feed

The activity feed shows real-time platform events, including:

- User registrations and logins
- Content creation and modification
- Flagged content
- System configuration changes
- Error events

Filter the activity feed by:
- Event type
- User role
- Time period
- Severity level

## User Management

Administrators are responsible for overseeing all user accounts on the platform.

### Viewing Users

1. Navigate to "Users" in the main menu
2. View the list of all users
3. Filter users by:
   - Role (Nanny, Parent, Administrator)
   - Status (Active, Inactive, Pending)
   - Registration date
   - Last login date
4. Sort by any column header
5. Click on a user to view their detailed profile

### Creating a New User

1. From the Users section, click "Add User"
2. Select the user role
3. Enter the user's information:
   - Email address
   - First and last name
   - Role-specific details
4. Choose whether to send an invitation email
5. Set initial permissions
6. Click "Create User"

![Add User Modal](images/add-user-modal.png)

### Editing User Details

1. Navigate to the user's profile
2. Click "Edit" in the appropriate section
3. Modify the user information
4. Click "Save Changes"

### Managing User Status

To change a user's status:

1. Navigate to the user's profile
2. Click the "Actions" dropdown
3. Select the appropriate action:
   - Deactivate Account
   - Reactivate Account
   - Reset Password
   - Delete Account
4. Confirm your action when prompted

### User Impersonation

For troubleshooting purposes, administrators can view the platform as a specific user:

1. Navigate to the user's profile
2. Click "Impersonate User"
3. Browse the platform from the user's perspective
4. Click "Exit Impersonation" to return to your administrator view

> **Important:** User impersonation is logged for security purposes. Only use this feature when necessary for support or troubleshooting.

## Agency Management

Administrators can manage childcare agencies and their relationships with nannies.

### Viewing Agencies

1. Navigate to "Agencies" in the main menu
2. View the list of all registered agencies
3. Filter by:
   - Location
   - Number of nannies
   - Status
4. Click on an agency to view detailed information

### Adding a New Agency

1. From the Agencies section, click "Add Agency"
2. Enter agency information:
   - Agency name
   - Contact person
   - Contact email and phone
   - Address
   - Description
3. Configure agency settings:
   - Default permissions
   - Service areas
   - Verification status
4. Click "Create Agency"

![Add Agency Modal](images/add-agency-modal.png)

### Managing Agency-Nanny Relationships

To assign nannies to an agency:

1. Navigate to the agency's profile
2. Click the "Nannies" tab
3. Click "Assign Nanny"
4. Search for and select the nanny
5. Set relationship details:
   - Role within agency
   - Start date
   - Payment information (optional)
6. Click "Assign" to create the relationship

To remove a nanny from an agency:

1. Navigate to the agency's profile
2. Click the "Nannies" tab
3. Find the nanny in the list
4. Click "End Assignment"
5. Enter an end date and reason
6. Click "Confirm" to complete the removal

### Agency Verification

Verify an agency's legitimacy:

1. Navigate to the agency's profile
2. Click the "Verification" tab
3. Review submitted documentation
4. Check verification status of:
   - Business license
   - Insurance
   - Background checks
   - References
5. Update verification status as appropriate
6. Add verification notes for internal reference

## Content Moderation

Administrators are responsible for ensuring all content on the platform meets community standards.

### Viewing Flagged Content

1. Navigate to "Moderation" in the main menu
2. View the list of flagged content items
3. Filter by:
   - Content type (Observation, Message, Profile, etc.)
   - Flag reason
   - Severity
   - Date flagged
4. Sort by priority or date
5. Click on an item to review it in detail

### Content Review Process

For each flagged item:

1. Review the content and context
2. Review the reason for flagging
3. Check relevant policies and guidelines
4. Make a moderation decision:
   - Approve (content meets standards)
   - Edit (make minor modifications)
   - Remove (delete inappropriate content)
   - Escalate (refer to senior administrator)
5. Add moderation notes explaining your decision
6. Click "Submit Decision"

![Content Moderation Interface](images/content-moderation-interface.png)

### Setting Up Automated Moderation

Configure automated content filtering:

1. Navigate to "Moderation Settings"
2. Configure keyword filters:
   - Add/remove flagged keywords
   - Set sensitivity levels
   - Define exceptions
3. Set up AI moderation:
   - Enable/disable AI content scanning
   - Configure AI sensitivity
   - Set notification thresholds
4. Define escalation rules:
   - Automatic escalation criteria
   - Notification recipients
   - Response timeframes
5. Click "Save Settings"

### Moderation Reports

Generate reports on moderation activity:

1. Navigate to "Moderation Reports"
2. Select report parameters:
   - Date range
   - Content types
   - Moderation actions
   - Moderator(s)
3. Click "Generate Report"
4. View, download, or share the report

## Resource Management

Administrators curate educational resources for nannies and parents.

### Viewing Resources

1. Navigate to "Resources" in the main menu
2. Browse the resource library
3. Filter by:
   - Resource type (Article, Video, Activity, etc.)
   - Target audience (Nannies, Parents, Both)
   - Age group
   - Developmental domain
   - Tags
4. Click on a resource to view details

### Adding a New Resource

1. From the Resources section, click "Add Resource"
2. Enter resource information:
   - Title
   - Description
   - Resource type
   - Content (text, link, or file upload)
   - Preview image
3. Set categorization:
   - Target audience
   - Age groups
   - Developmental domains
   - Tags
4. Configure visibility:
   - User roles that can access
   - Featured status
   - Publication status (Draft, Published, Scheduled)
5. Click "Create Resource"

![Add Resource Modal](images/add-resource-modal.png)

### Bulk Resource Upload

For adding multiple resources:

1. Navigate to "Resources" > "Bulk Upload"
2. Download the template spreadsheet
3. Fill in resource details in the spreadsheet
4. Upload the completed spreadsheet
5. Review the import preview
6. Click "Confirm Import" to add all resources

### Resource Analytics

Monitor resource usage:

1. Navigate to "Resource Analytics"
2. View metrics for:
   - Most viewed resources
   - User engagement (time spent, completions)
   - Search terms used
   - User ratings and feedback
3. Filter by date range, user role, or resource type
4. Export data for further analysis

## Reporting and Analytics

Generate insights from platform data to inform decision-making.

### Available Reports

Access standard reports:

1. Navigate to "Reports" in the main menu
2. Browse available report templates:
   - User Activity Report
   - Observation Analytics
   - Development Milestone Tracking
   - Platform Usage Statistics
   - Nanny Performance Metrics
   - Resource Utilization
3. Click on a report to configure and generate

### Generating a Custom Report

Create tailored reports:

1. Navigate to "Reports" > "Custom Report"
2. Select data sources:
   - Users
   - Observations
   - Messaging
   - Development tracking
   - Resources
   - System activity
3. Choose metrics and dimensions
4. Set filters and parameters
5. Configure visualization options
6. Click "Generate Report"

![Report Generation Modal](images/report-generation-modal.png)

### Scheduling Regular Reports

Set up automated reporting:

1. Configure a report as described above
2. Click "Schedule Report"
3. Set frequency (Daily, Weekly, Monthly)
4. Choose delivery method:
   - Email
   - Dashboard notification
   - Download link
5. Specify recipients
6. Click "Save Schedule"

### Data Export

Export raw data for external analysis:

1. Navigate to "Reports" > "Data Export"
2. Select the data type to export
3. Set parameters and filters
4. Choose the export format (CSV, Excel, JSON)
5. Click "Export Data"
6. Download the file when processing is complete

> **Note:** All exports comply with privacy settings and data protection regulations. Personal identifiable information may be anonymized based on your access level.

## System Configuration

Customize platform settings to meet organizational needs.

### General Configuration

1. Navigate to "Settings" > "General"
2. Configure:
   - Platform name and branding
   - Default language and localization
   - Time zone settings
   - Contact information
   - Terms of service and privacy policy
3. Click "Save Changes"

### Feature Management

Enable or disable platform features:

1. Navigate to "Settings" > "Features"
2. Toggle features on/off:
   - Development tracking
   - Resource library
   - Messaging
   - Certifications
   - AI assistance
   - Offline mode
3. Configure feature-specific settings
4. Click "Save Configuration"

![System Settings Interface](images/system-settings-interface.png)

### Notification Settings

Configure system notifications:

1. Navigate to "Settings" > "Notifications"
2. Set up:
   - Email notification templates
   - Push notification settings
   - In-app notification preferences
   - Notification frequency limits
3. Test notifications using the "Send Test" button
4. Click "Save Settings"

### Integration Configuration

Set up third-party integrations:

1. Navigate to "Settings" > "Integrations"
2. Configure available integrations:
   - Email service provider
   - SMS gateway
   - Calendar systems
   - Storage providers
   - Authentication services
3. Enter API keys and connection details
4. Test the integration
5. Click "Save Integration"

## Security and Compliance

Maintain the security and regulatory compliance of the platform.

### Security Settings

1. Navigate to "Settings" > "Security"
2. Configure:
   - Password policies
   - Session timeout settings
   - Two-factor authentication requirements
   - IP restriction rules
   - Login attempt limits
3. Review security logs and alerts
4. Click "Save Security Settings"

### User Permissions

Manage role-based access controls:

1. Navigate to "Settings" > "Permissions"
2. Select a user role to modify
3. Adjust permission settings for:
   - Feature access
   - Data visibility
   - Administrative actions
   - Content creation and editing
4. Create custom roles if needed
5. Click "Save Permissions"

### Audit Logs

Review system activity for security monitoring:

1. Navigate to "Security" > "Audit Logs"
2. View logs of:
   - User logins and authentication attempts
   - Administrative actions
   - Data access and modifications
   - Security-related events
3. Filter logs by user, action type, and date range
4. Export logs for compliance reporting

### Data Protection

Manage data retention and protection:

1. Navigate to "Settings" > "Data Protection"
2. Configure:
   - Data retention policies
   - Automatic data purging rules
   - Backup schedules
   - Data anonymization settings
3. Review data protection status
4. Click "Save Data Settings"

## Troubleshooting Common Issues

### User Access Problems

**Issue: User Cannot Log In**
1. Check if the account is active
2. Verify the email address is correct
3. Reset the user's password
4. Check for account locks due to failed attempts
5. Verify the user is using the correct login URL

**Issue: User Has Incorrect Permissions**
1. Review the user's assigned role
2. Check custom permission settings
3. Verify group memberships
4. Clear the user's session cache
5. Have the user log out and log back in

### System Performance Issues

**Issue: Slow Platform Performance**
1. Check system status for ongoing issues
2. Review current user load
3. Check database performance metrics
4. Verify storage capacity
5. Consider implementing temporary access restrictions

**Issue: Failed Data Synchronization**
1. Check network connectivity
2. Review sync logs for specific errors
3. Verify database connection status
4. Check for conflicting updates
5. Manually trigger synchronization

### Content Management Issues

**Issue: Resources Not Displaying**
1. Verify the resource publication status
2. Check role visibility settings
3. Clear the content cache
4. Verify file permissions
5. Check for broken file links

**Issue: Observation Media Not Loading**
1. Verify storage service status
2. Check file format compatibility
3. Verify the media was properly uploaded
4. Check user permissions
5. Try regenerating media thumbnails

## Best Practices

### Effective Administration

- **Regular Monitoring** - Check the dashboard daily for important metrics and alerts
- **Proactive Moderation** - Review flagged content promptly to maintain community standards
- **Documentation** - Keep records of configuration changes and policy decisions
- **User Support** - Respond to support requests within 24 hours
- **Data Backups** - Verify backup integrity monthly

### Security Best Practices

- Enforce strong password policies
- Require two-factor authentication for all administrator accounts
- Review audit logs weekly for suspicious activity
- Update integration credentials quarterly
- Conduct security assessments bi-annually

### Communication Guidelines

- Notify users of significant platform changes at least one week in advance
- Provide clear explanations for moderation decisions
- Maintain a knowledge base of common questions and issues
- Use system announcements sparingly for truly important information
- Collect and incorporate user feedback regularly

## Administrator Support

If you need assistance with your administrative duties:

1. Check the Administrator Knowledge Base
2. Contact the technical support team
3. Join the monthly administrator webinar
4. Participate in the administrator forum
5. Schedule one-on-one training for complex issues

## Thank You for Administering Indaba Care!

Your role is essential to creating a safe, effective platform for childcare providers and families. Through your careful administration, you help facilitate meaningful connections and support child development.

We welcome your feedback on how we can improve the administrative experience. Please share your suggestions through the administrator feedback form or email admin-support@indabacare.com.

---

© 2023 Indaba Care. All rights reserved.
