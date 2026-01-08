# User Dashboard Documentation

## Overview

The User Dashboard (`/dashboard`) is a personalized hub for authenticated users to manage their bug reports, track activity, and monitor their companies. It provides a comprehensive overview of a user's interaction with the BugRelay platform.

## Purpose

The User Dashboard serves as:
- **Activity Hub**: Central location to view all user activity and contributions
- **Bug Management**: Track reported bugs and their status
- **Company Access**: Quick access to companies the user is a member of
- **Engagement Metrics**: View statistics on reports, comments, and upvotes
- **Quick Actions**: Easy access to common tasks

## Features

### 1. Statistics Overview

Five key metrics displayed in card format:

#### Bugs Reported
- Total number of bugs reported by the user
- Shows count of currently active bugs
- Helps users track their contribution

#### Active Bugs
- Count of bugs that are currently open or under review
- Indicates ongoing issues requiring attention
- Quick insight into pending reports

#### Resolved
- Number of bugs that have been fixed
- Shows resolution rate percentage
- Measures success of bug reports

#### Comments
- Total comments made by the user
- Indicates engagement in discussions
- Shows community participation

#### Upvotes
- Total upvotes given by the user
- Demonstrates support for other bug reports
- Community engagement metric

### 2. Your Companies

Displays companies the user is a member of:
- **Company Name** with verification badge
- **Role** (admin or member)
- **Bug Count** for that company
- **Quick Access** to company dashboard
- Direct link to manage company bugs

**Access Levels:**
- **Admin**: Full access to manage bugs, team, settings
- **Member**: View and respond to bugs

### 3. Tabbed Content Sections

#### My Bugs Tab
- **All Reported Bugs**: Complete list of user's bug reports
- **Status Badges**: Visual indicators for bug status (open, reviewing, fixed)
- **Priority Indicators**: High, medium, low, critical
- **Engagement Metrics**: Vote count and comment count
- **Timestamps**: When bug was reported
- **Quick Actions**: View bug details

**Empty State**: 
- Displays when user has no bugs
- Encourages first bug report
- Direct link to submission form

#### Recent Activity Tab
- **Activity Timeline**: Chronological list of recent actions
- **Activity Types**:
  - Bug reports (new submissions)
  - Comments (discussions participated in)
  - Upvotes (bugs supported)
- **Visual Icons**: Different icon for each activity type
- **Timestamps**: Relative time (e.g., "2h ago", "Yesterday")
- **Bug Links**: Click through to referenced bugs

#### Watching Tab
- **Monitored Bugs**: Bugs the user is following
- **Update Tracking**: See recent updates to watched bugs
- **Status Display**: Current status of watched bugs
- **Quick Access**: Direct links to bug details

**How Watching Works**:
- Upvoting a bug automatically adds it to watched list
- Users get updates when watched bugs change status
- Can manually add/remove from watching

### 4. Quick Actions Panel

Three prominent action cards:

#### Report New Bug
- Direct link to bug submission form
- Primary call-to-action
- Icon: Plus symbol

#### Browse All Bugs
- Link to complete bug listing
- Discover other reported issues
- Icon: Bug symbol

#### Explore Companies
- Navigate to company directory
- Find companies to follow
- Icon: Building symbol

## Authentication & Access

### Requirements
- **Authentication**: Must be logged in to access
- **Redirect**: Unauthenticated users redirected to `/login?redirect=/dashboard`
- **Session**: Uses Zustand auth store for state management

### Data Loading
1. Check authentication status
2. Redirect if not authenticated
3. Load dashboard data from API (currently mocked)
4. Display loading state during fetch
5. Handle errors gracefully

## User Interface

### Layout
- **Full Width Container**: Responsive layout
- **Responsive Grid**: Adjusts for mobile, tablet, desktop
- **Card-Based Design**: Consistent card components
- **Spacing**: 6-unit spacing between sections

### Components Used
- `MainLayout`: Page wrapper with header/footer
- `Card`: Container for sections
- `Button`: Actions and links
- `Tabs`: Content organization
- `StatusBadge`: Visual status indicators
- `LoadingState`: Loading feedback
- `ErrorMessage`: Error handling

### Responsive Design

#### Mobile (< 768px)
- Single column layout
- Stacked statistics cards
- Vertical company list
- Full-width buttons

#### Tablet (768px - 1024px)
- 2-column grid for stats
- 2-column company grid
- Side-by-side layouts

#### Desktop (> 1024px)
- 5-column stats grid
- 3-column quick actions
- Optimized spacing

## Data Structure

### Dashboard Data Schema

```typescript
interface DashboardData {
  stats: {
    totalBugsReported: number;
    activeBugs: number;
    resolvedBugs: number;
    totalComments: number;
    totalUpvotes: number;
  };
  
  recentBugs: Bug[];
  
  recentActivity: Activity[];
  
  companies: CompanyMembership[];
  
  watchedBugs: Bug[];
}

interface Bug {
  id: string;
  title: string;
  status: "open" | "reviewing" | "fixed" | "wont_fix";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
  application: { name: string };
  voteCount: number;
  commentCount: number;
  reporter?: { name: string };
}

interface Activity {
  id: string;
  type: "comment" | "vote" | "bug";
  bugTitle: string;
  createdAt: string;
}

interface CompanyMembership {
  id: string;
  name: string;
  role: "admin" | "member";
  bugCount: number;
  isVerified: boolean;
}
```

## API Integration

### Current Implementation
- Uses mock data for development
- 500ms simulated loading delay
- Data structure matches expected API response

### Future API Endpoints

#### GET /api/dashboard
**Response:**
```json
{
  "stats": { ... },
  "recentBugs": [ ... ],
  "recentActivity": [ ... ],
  "companies": [ ... ],
  "watchedBugs": [ ... ]
}
```

#### GET /api/users/:userId/bugs
**Query Parameters:**
- `status`: Filter by bug status
- `limit`: Number of bugs to return
- `offset`: Pagination offset

#### GET /api/users/:userId/activity
**Query Parameters:**
- `limit`: Number of activities
- `type`: Filter by activity type

#### GET /api/users/:userId/watching
**Returns:** List of bugs user is watching

## State Management

### Zustand Stores Used

#### Auth Store
- `user`: Current user object
- `isAuthenticated`: Authentication status
- `isInitialized`: Store initialization status

#### UI Store (via useToast)
- Error notifications
- Success messages
- Loading states

### Local State
- `isLoading`: Data loading status
- `error`: Error messages
- `dashboardData`: Dashboard content
- `selectedTimeRange`: Time filter (future)

## Navigation

### Internal Links
- `/profile`: User profile settings
- `/submit`: Bug submission form
- `/bugs`: Bug listing
- `/bugs/:id`: Bug details
- `/companies`: Company directory
- `/companies/:id/dashboard`: Company management

### External Navigation
- Redirects unauthenticated users to login
- Preserves return URL for post-login redirect

## Error Handling

### Error States

#### No Authentication
- **Redirect**: To login page
- **Preserve**: Return URL in query string
- **Message**: None (seamless redirect)

#### Data Loading Error
- **Display**: Error message component
- **Action**: "Try again" button
- **Fallback**: Reload page

#### No Dashboard Data
- **Display**: Loading state
- **Timeout**: Shows error after 30s
- **Retry**: Automatic retry (3 attempts)

### Empty States

#### No Bugs Reported
- Encouraging message
- CTA button to report first bug
- Visual icon (bug with 50% opacity)

#### No Activity
- Placeholder message
- Activity icon
- Suggestion to engage

#### No Watched Bugs
- Explanation of watching feature
- Link to browse bugs
- CTA to start watching

## Accessibility

### ARIA Labels
- Proper heading hierarchy (h1 → h4)
- Descriptive link text
- Icon alt text via aria-label

### Keyboard Navigation
- All interactive elements keyboard accessible
- Tab order follows visual flow
- Focus indicators visible

### Screen Readers
- Meaningful section labels
- Status announcements for loading
- Error message announcements

## Performance

### Optimization Strategies
- Lazy data loading (load on mount)
- Memoized date formatting
- Conditional rendering (tabs)
- Optimized re-renders with React hooks

### Loading Strategy
1. Show loading state immediately
2. Check authentication (synchronous)
3. Fetch dashboard data (async)
4. Update UI with data
5. Handle errors gracefully

## Testing

### Unit Tests
```typescript
// Test authentication redirect
test('redirects unauthenticated users to login', () => {
  // Mock unauthenticated state
  // Render component
  // Expect redirect to /login
});

// Test data display
test('displays user statistics correctly', () => {
  // Mock dashboard data
  // Render component
  // Assert stats are displayed
});

// Test empty states
test('shows empty state when no bugs reported', () => {
  // Mock empty bugs array
  // Render component
  // Assert empty state message
});
```

### Integration Tests
- Full authentication flow
- Data loading and display
- Tab switching
- Link navigation
- Error handling

### E2E Tests
```typescript
test('user can view and interact with dashboard', async () => {
  // Login as user
  // Navigate to /dashboard
  // Verify stats display
  // Click tabs
  // Verify content changes
  // Click bug link
  // Verify navigation
});
```

## Future Enhancements

### Planned Features
1. **Time Range Filter**: Filter stats by 7d, 30d, 90d
2. **Charts & Graphs**: Visual data representation
3. **Notifications**: In-app notification center
4. **Export Data**: Download bug reports as CSV
5. **Customizable Layout**: Drag-and-drop dashboard widgets
6. **Real-time Updates**: WebSocket for live data
7. **Advanced Filters**: Filter bugs by multiple criteria
8. **Bulk Actions**: Manage multiple bugs at once
9. **Saved Views**: Save custom filter combinations
10. **Activity Feed**: Infinite scroll for activity

### Analytics Integration
- Track page views
- Monitor engagement metrics
- A/B test dashboard layouts
- User behavior analytics

### Personalization
- Customizable widget order
- Hide/show sections
- Theme preferences
- Notification settings

## Troubleshooting

### Common Issues

#### Dashboard Not Loading
**Symptom**: Stuck on loading screen
**Solutions**:
1. Check network connection
2. Verify authentication token
3. Clear browser cache
4. Check API endpoint status

#### No Data Displaying
**Symptom**: Empty dashboard with no content
**Solutions**:
1. Verify user has reported bugs
2. Check API response format
3. Review console for errors
4. Ensure proper data mapping

#### Slow Performance
**Symptom**: Dashboard loads slowly
**Solutions**:
1. Optimize data queries
2. Implement pagination
3. Add data caching
4. Reduce API calls

## Best Practices

### For Users
- Report bugs with detailed information
- Engage with community (comments, votes)
- Keep profile information updated
- Monitor watched bugs regularly

### For Developers
- Keep mock data in sync with API schema
- Handle all error states
- Optimize for performance
- Maintain accessibility standards
- Write comprehensive tests
- Document API changes

## Related Documentation

- [Authentication Guide](../docs/authentication/)
- [Bug Submission](./BUG_SUBMISSION.md)
- [Company Dashboard](./COMPANY_DASHBOARD.md)
- [API Reference](../docs/api/)
- [Component Library](./CUSTOM_COMPONENTS.md)

## Support

For issues or questions:
- Check [troubleshooting section](#troubleshooting)
- Review [API documentation](../docs/api/)
- Submit bug report
- Contact support team

---

**Last Updated:** January 4, 2024  
**Version:** 1.0.0  
**Status:** ✅ Production Ready