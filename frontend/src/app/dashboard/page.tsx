"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bug,
  Users,
  Building2,
  TrendingUp,
  MessageSquare,
  ThumbsUp,
  Plus,
  Settings,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { MainLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingState } from "@/components/ui/loading";
import { ErrorMessage } from "@/components/ui/error-boundary";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Mock data - replace with actual API calls
  const [dashboardData, setDashboardData] = React.useState<any>(null);

  React.useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push("/login?redirect=/dashboard");
      return;
    }

    if (isInitialized && isAuthenticated) {
      // Simulate data loading
      setTimeout(() => {
        setDashboardData({
          stats: {
            totalBugsReported: 12,
            activeBugs: 8,
            resolvedBugs: 4,
            totalComments: 25,
            totalUpvotes: 48,
          },
          recentBugs: [
            {
              id: "1",
              title: "Login button not responsive on mobile devices",
              status: "open",
              priority: "high",
              createdAt: "2024-01-03T10:00:00Z",
              application: { name: "MyApp" },
              voteCount: 5,
              commentCount: 3,
            },
            {
              id: "2",
              title: "Dashboard charts not loading correctly",
              status: "reviewing",
              priority: "medium",
              createdAt: "2024-01-02T15:30:00Z",
              application: { name: "Analytics Pro" },
              voteCount: 8,
              commentCount: 2,
            },
            {
              id: "3",
              title: "Email notifications are delayed",
              status: "fixed",
              priority: "low",
              createdAt: "2024-01-01T09:15:00Z",
              application: { name: "MailHub" },
              voteCount: 3,
              commentCount: 1,
            },
          ],
          recentActivity: [
            {
              id: "1",
              type: "comment",
              bugTitle: "Search function returns incorrect results",
              createdAt: "2024-01-03T14:22:00Z",
            },
            {
              id: "2",
              type: "vote",
              bugTitle: "Dark mode toggle not saving preference",
              createdAt: "2024-01-03T12:10:00Z",
            },
            {
              id: "3",
              type: "bug",
              bugTitle: "Login button not responsive on mobile devices",
              createdAt: "2024-01-03T10:00:00Z",
            },
          ],
          companies: [
            {
              id: "1",
              name: "TechCorp Inc",
              role: "admin",
              bugCount: 15,
              isVerified: true,
            },
            {
              id: "2",
              name: "StartupXYZ",
              role: "member",
              bugCount: 8,
              isVerified: false,
            },
          ],
          watchedBugs: [
            {
              id: "4",
              title: "API timeout on large data requests",
              status: "reviewing",
              application: { name: "DataAPI" },
              updatedAt: "2024-01-03T16:45:00Z",
            },
            {
              id: "5",
              title: "Image upload fails for files over 5MB",
              status: "open",
              application: { name: "PhotoShare" },
              updatedAt: "2024-01-03T11:20:00Z",
            },
          ],
        });
        setIsLoading(false);
      }, 500);
    }
  }, [isAuthenticated, isInitialized, router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "comment":
        return <MessageSquare className="h-4 w-4" />;
      case "vote":
        return <ThumbsUp className="h-4 w-4" />;
      case "bug":
        return <Bug className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityText = (type: string) => {
    switch (type) {
      case "comment":
        return "Commented on";
      case "vote":
        return "Upvoted";
      case "bug":
        return "Reported";
      default:
        return "Activity on";
    }
  };

  if (!isInitialized || isLoading) {
    return (
      <MainLayout>
        <LoadingState message="Loading your dashboard..." />
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container py-8">
          <ErrorMessage
            title="Failed to load dashboard"
            message={error}
            action={{
              label: "Try again",
              onClick: () => window.location.reload(),
            }}
          />
        </div>
      </MainLayout>
    );
  }

  if (!dashboardData) {
    return (
      <MainLayout>
        <LoadingState message="Loading dashboard data..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, {user?.displayName || "User"}!
            </h1>
            <p className="text-muted-foreground">
              Here's an overview of your bug tracking activity
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" asChild>
              <Link href="/profile">
                <Settings className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </Button>
            <Button asChild>
              <Link href="/submit">
                <Plus className="mr-2 h-4 w-4" />
                Report Bug
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Bugs Reported
              </CardTitle>
              <Bug className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.stats.totalBugsReported}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.stats.activeBugs} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Bugs</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.stats.activeBugs}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently open or reviewing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.stats.resolvedBugs}
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(
                  (dashboardData.stats.resolvedBugs /
                    dashboardData.stats.totalBugsReported) *
                    100,
                )}
                % resolution rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comments</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.stats.totalComments}
              </div>
              <p className="text-xs text-muted-foreground">
                On bug discussions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upvotes</CardTitle>
              <ThumbsUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.stats.totalUpvotes}
              </div>
              <p className="text-xs text-muted-foreground">
                Community engagement
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Companies */}
        {dashboardData.companies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Companies</CardTitle>
              <CardDescription>Companies you're a member of</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboardData.companies.map((company: any) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Building2 className="h-8 w-8 text-primary" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{company.name}</h4>
                          {company.isVerified && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {company.bugCount} bugs · {company.role}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/companies/${company.id}/dashboard`}>
                        Manage
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="bugs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bugs">My Bugs</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="watching">Watching</TabsTrigger>
          </TabsList>

          <TabsContent value="bugs" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Bug Reports</CardTitle>
                    <CardDescription>
                      Bugs you've reported and their current status
                    </CardDescription>
                  </div>
                  <Button asChild>
                    <Link href="/submit">
                      <Plus className="mr-2 h-4 w-4" />
                      Report New Bug
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dashboardData.recentBugs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bug className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>You haven't reported any bugs yet</p>
                    <Button className="mt-4" asChild>
                      <Link href="/submit">Report Your First Bug</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.recentBugs.map((bug: any) => (
                      <div
                        key={bug.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center space-x-2">
                            <StatusBadge status={bug.status} />
                            <StatusBadge priority={bug.priority} />
                          </div>
                          <Link
                            href={`/bugs/${bug.id}`}
                            className="block hover:underline"
                          >
                            <h4 className="font-medium">{bug.title}</h4>
                          </Link>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{bug.application.name}</span>
                            <span className="flex items-center space-x-1">
                              <ThumbsUp className="h-3 w-3" />
                              <span>{bug.voteCount}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>{bug.commentCount}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(bug.createdAt)}</span>
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/bugs/${bug.id}`}>View</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your recent actions on BugRelay
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.recentActivity.map((activity: any) => (
                      <div
                        key={activity.id}
                        className="flex items-center space-x-4 p-3 border-l-2 border-primary/20"
                      >
                        <div className="p-2 rounded-full bg-primary/10">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            {getActivityText(activity.type)}{" "}
                            <span className="font-medium">
                              {activity.bugTitle}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="watching" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bugs You're Watching</CardTitle>
                <CardDescription>
                  Stay updated on bugs you're interested in
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.watchedBugs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bug className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>You're not watching any bugs</p>
                    <p className="text-sm mt-1">
                      Upvote bugs to watch them and get updates
                    </p>
                    <Button className="mt-4" variant="outline" asChild>
                      <Link href="/bugs">Browse Bugs</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.watchedBugs.map((bug: any) => (
                      <div
                        key={bug.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center space-x-2">
                            <StatusBadge status={bug.status} />
                          </div>
                          <Link
                            href={`/bugs/${bug.id}`}
                            className="block hover:underline"
                          >
                            <h4 className="font-medium">{bug.title}</h4>
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {bug.application.name} · Updated{" "}
                            {formatDate(bug.updatedAt)}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/bugs/${bug.id}`}>View</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto p-4" asChild>
                <Link
                  href="/submit"
                  className="flex flex-col items-center space-y-2"
                >
                  <Plus className="h-6 w-6" />
                  <span className="font-medium">Report New Bug</span>
                  <span className="text-xs text-muted-foreground">
                    Found something broken?
                  </span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto p-4" asChild>
                <Link
                  href="/bugs"
                  className="flex flex-col items-center space-y-2"
                >
                  <Bug className="h-6 w-6" />
                  <span className="font-medium">Browse All Bugs</span>
                  <span className="text-xs text-muted-foreground">
                    See what others found
                  </span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto p-4" asChild>
                <Link
                  href="/companies"
                  className="flex flex-col items-center space-y-2"
                >
                  <Building2 className="h-6 w-6" />
                  <span className="font-medium">Explore Companies</span>
                  <span className="text-xs text-muted-foreground">
                    Find your favorite apps
                  </span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
