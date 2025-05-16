# Indaba Care Offline Sync Guide

![Offline Sync Banner](images/offline-sync-banner.png)

Indaba Care is designed to work seamlessly even when your internet connection is unavailable or unreliable. This guide explains how to use the offline features, ensuring you can continue your important work regardless of connectivity challenges.

## Table of Contents

- [Understanding Offline Mode](#understanding-offline-mode)
- [Preparing for Offline Use](#preparing-for-offline-use)
- [Working Offline](#working-offline)
- [Synchronization Process](#synchronization-process)
- [Troubleshooting Sync Issues](#troubleshooting-sync-issues)
- [Offline Mode FAQ](#offline-mode-faq)

## Understanding Offline Mode

Indaba Care's offline capabilities allow you to continue working when internet connectivity is limited or unavailable.

### How It Works

![Offline Mode Diagram](images/offline-mode-diagram.png)

1. **Local Data Storage**: Essential information is stored on your device
2. **Connection Monitoring**: The app automatically detects your connection status
3. **Offline Queue**: Changes made while offline are stored in a queue
4. **Background Sync**: When connection returns, changes are automatically uploaded
5. **Conflict Resolution**: If conflicts occur, they're resolved based on predetermined rules

### What Works Offline

Most essential features continue to function without an internet connection:

| Feature | Offline Capability |
|---------|-------------------|
| Viewing existing data | ✅ Full access to previously loaded data |
| Creating observations | ✅ Complete functionality |
| Logging hours | ✅ Complete functionality |
| Drafting messages | ✅ Messages saved for later sending |
| Accessing resources | ✅ Previously viewed resources available |
| Viewing profiles | ✅ Previously loaded profiles visible |
| Updating profiles | ✅ Changes queued for synchronization |
| AI-powered features | ⚠️ Limited functionality |
| Downloading new resources | ❌ Requires internet connection |
| Sending messages | ❌ Requires internet connection |
| Initial login | ❌ Requires internet connection |

### Connection Status Indicators

The app clearly shows your current connection status:

![Connection Status Indicators](images/connection-status-indicators.png)

- **Green indicator**: Fully connected
- **Yellow indicator**: Limited connectivity
- **Red indicator**: Offline
- **Sync icon**: Shows pending changes waiting to be synchronized

## Preparing for Offline Use

If you know you'll be working in an area with limited connectivity, take these steps to prepare:

### Before Going Offline

1. **Ensure Full Synchronization**
   - Open the app while connected to reliable internet
   - Navigate to Settings > Sync
   - Click "Sync Now" to force a complete synchronization
   - Wait for the confirmation that sync is complete

2. **Pre-load Important Data**
   - Open profiles of children you'll be working with
   - Browse recent observations
   - Access resources you might need
   - Check your schedule for the offline period

3. **Adjust Offline Settings**
   - Navigate to Settings > Offline Mode
   - Set your offline storage limit (higher = more data available offline)
   - Choose which types of data to prioritize for offline access
   - Enable "Enhanced Offline Mode" for extended offline capabilities

![Offline Preparation Steps](images/offline-preparation-steps.png)

### Storage Considerations

Offline mode uses your device's storage to keep data available. Consider:

- **Storage Usage**: Check how much space Indaba Care is using in Settings > Storage
- **Media Settings**: Configure whether to store high-resolution photos offline
- **Cleanup Options**: Use "Optimize Storage" to free space while keeping essential data
- **Device Limitations**: Be aware of your device's storage capacity

> **Tip:** If you have limited device storage, focus on pre-loading text-based content rather than media-heavy resources.

## Working Offline

When you lose internet connection, Indaba Care automatically switches to offline mode.

### Creating Content Offline

#### Recording Observations

1. Navigate to the Observations section as normal
2. Create a new observation
3. Fill in all details as you would online
4. Click "Save"
5. Notice the "Pending Sync" indicator showing the observation is saved locally

![Creating Observations Offline](images/creating-observations-offline.png)

#### Logging Hours

1. Go to the Hours Log section
2. Record your hours as normal
3. Submit the entry
4. The entry will be marked as "Pending" until synchronized

#### Drafting Messages

1. Navigate to Messages
2. Compose your message
3. Click "Send"
4. The message will be saved in "Outbox" until you're back online

### Accessing Offline Data

#### Viewing Recent Information

- Browse through previously loaded observations, profiles, and resources
- All data that was synchronized before going offline is available
- Some images or attachments may show placeholders if not pre-loaded

#### Searching Offline Content

- Use the search function as normal
- Search results will be limited to data available offline
- A notice will indicate you're searching offline content only

![Offline Data Access](images/offline-data-access.png)

### Offline Limitations

Be aware of these limitations when working offline:

- **Media Access**: New photos and videos cannot be uploaded until online
- **Real-time Features**: Features requiring real-time data will be disabled
- **Search Limitations**: Search only works for locally stored data
- **AI Features**: Some AI-powered features may use simplified alternatives
- **New Connections**: Cannot connect with new families or children

## Synchronization Process

When your connection is restored, Indaba Care automatically synchronizes your offline changes with the server.

### Automatic Synchronization

![Sync Process Visualization](images/sync-process-visualization.png)

1. **Connection Detection**
   - The app detects when internet connectivity returns
   - A notification appears indicating sync is beginning

2. **Background Synchronization**
   - Changes are uploaded in the background
   - You can continue using the app during synchronization
   - A progress indicator shows sync status

3. **Completion Notification**
   - When sync is complete, a confirmation appears
   - The sync queue is cleared
   - All data is now up-to-date

### Manual Synchronization

You can also trigger synchronization manually:

1. Navigate to Settings > Sync
2. Click "Sync Now"
3. View the sync progress and results
4. Check the "Sync History" to see details of synchronized items

### Sync Priority

Items are synchronized in this order:

1. Critical updates (hours logs, important observations)
2. New content creation (observations, notes)
3. Profile and setting changes
4. Media uploads (photos, videos)
5. Draft messages

This ensures the most important information is synchronized first if you have a brief or unstable connection.

## Troubleshooting Sync Issues

Occasionally, you may encounter challenges with the synchronization process.

### Common Sync Problems

#### Sync Not Starting

**Symptoms:**
- "Pending" indicator remains after reconnecting
- No sync progress visible

**Solutions:**
1. Check that you're truly back online (try opening a website)
2. Go to Settings > Sync and click "Sync Now"
3. Restart the application
4. Check your device's date and time settings are correct

#### Sync Errors

**Symptoms:**
- Error notifications during sync
- Red indicators on specific items

**Solutions:**
1. Check your internet connection stability
2. Try syncing again when you have a stronger connection
3. Sync individual items by opening them and selecting "Retry Sync"
4. Contact support if errors persist

![Troubleshooting Sync Issues](images/troubleshooting-sync.png)

#### Sync Conflicts

**Symptoms:**
- Notifications about conflicting changes
- Prompts to choose between versions

**Solutions:**
1. Review the differences between versions carefully
2. Select which version to keep, or merge changes if prompted
3. For complex conflicts, save both versions when possible

### Checking Sync Status

To verify your sync status:

1. Navigate to Settings > Sync
2. View the "Sync Status" section showing:
   - Last successful sync time
   - Pending items count
   - Failed items (if any)
3. Check the "Sync History" for detailed logs

### When to Contact Support

Reach out to support if:
- Sync fails repeatedly despite good connectivity
- You notice missing data after synchronization
- Conflicts cannot be resolved through the app
- Sync appears stuck for more than 24 hours

## Offline Mode FAQ

### General Questions

**Q: How do I know if I'm working offline?**
A: Look for the connection indicator in the top right corner of the app. Red indicates offline mode, yellow shows limited connectivity, and green means you're fully connected.

**Q: Will I lose my work if my device shuts down while offline?**
A: No, all offline changes are stored persistently on your device and will remain available when you restart the app.

**Q: How much data can I store offline?**
A: This depends on your device's available storage and your offline settings. You can adjust storage limits in Settings > Offline Mode.

**Q: Can I use offline mode on multiple devices?**
A: Yes, each device maintains its own offline storage and sync queue. Changes made on different devices will be reconciled during synchronization.

### Functionality Questions

**Q: Can I view photos and videos offline?**
A: You can view media that was previously loaded while online. New media cannot be downloaded while offline.

**Q: Do AI features work offline?**
A: Some AI features have offline alternatives that provide basic functionality. More advanced AI features require an internet connection.

**Q: Can I send messages while offline?**
A: You can compose messages offline, but they'll be stored in your outbox until you're back online.

**Q: Will notifications work offline?**
A: Local notifications based on your device's clock will work. Notifications from the server require an internet connection.

### Synchronization Questions

**Q: How long does synchronization take?**
A: Sync time depends on the amount of data to synchronize and your connection speed. Text data syncs quickly, while media files take longer.

**Q: What happens if I make changes to the same item online and offline?**
A: The system will detect the conflict and either automatically resolve it based on timestamps or prompt you to choose which version to keep.

**Q: Can I prioritize certain items to sync first?**
A: Yes, in Settings > Sync, you can mark specific items as high priority for synchronization.

**Q: Is there a limit to how long I can work offline?**
A: There's no strict time limit, but prolonged offline use may eventually lead to storage limitations or increased sync complexity.

![Offline FAQ Visual Guide](images/offline-faq-visual-guide.png)

## Best Practices for Offline Work

Follow these tips to make the most of Indaba Care's offline capabilities:

### Preparation Best Practices

- **Regular Syncing**: Sync frequently when connected to prevent large backlogs
- **Prioritize Content**: Pre-load the most important information before going offline
- **Storage Management**: Regularly check and optimize your offline storage
- **Battery Awareness**: Offline mode uses less battery, but sync operations are battery-intensive

### Working Offline Effectively

- **Complete One Task at a Time**: Finish and save each observation or entry before starting another
- **Add Detailed Notes**: Include extra context when working offline to aid in potential conflict resolution
- **Organize by Priority**: Handle critical documentation first in case of limited reconnection opportunities
- **Save Frequently**: Use the "Save Draft" option regularly for long-form content

### Synchronization Best Practices

- **Stable Connections**: When possible, sync over stable Wi-Fi rather than weak cellular connections
- **Battery Level**: Ensure your device has sufficient battery before starting a large sync
- **Review Changes**: After synchronization, briefly review your recent entries to confirm successful sync
- **Scheduled Syncs**: If working in areas with predictable connectivity, schedule your sync times accordingly

---

Remember that Indaba Care's offline capabilities are designed to be intuitive and require minimal special handling. In most cases, you can simply use the application as normal, and the system will manage the offline/online transitions seamlessly.

---

© 2023 Indaba Care. All rights reserved.
