import { MainLayout } from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Settings, User, Bell, Shield, Key, Trash2, Save, Eye, EyeOff } from "lucide-react"

export default function SettingsPage() {
    return (
        <MainLayout>
            <div className="container py-8 max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2 flex items-center space-x-2">
                        <Settings className="h-8 w-8" />
                        <span>Account Settings</span>
                    </h1>
                    <p className="text-muted-foreground">
                        Manage your account preferences and privacy settings
                    </p>
                </div>

                <div className="space-y-8">
                    {/* Profile Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <User className="h-5 w-5" />
                                <span>Profile Information</span>
                            </CardTitle>
                            <CardDescription>
                                Update your public profile information
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center space-x-6">
                                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
                                    <User className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Button variant="outline" size="sm">
                                        Upload Photo
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                        JPG, PNG or GIF. Max size 2MB.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="displayName" className="text-sm font-medium">
                                        Display Name
                                    </label>
                                    <Input id="displayName" placeholder="Your display name" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium">
                                        Email Address
                                    </label>
                                    <Input id="email" type="email" placeholder="your@email.com" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="bio" className="text-sm font-medium">
                                    Bio (Optional)
                                </label>
                                <Textarea
                                    id="bio"
                                    placeholder="Tell us a bit about yourself..."
                                    rows={3}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Brief description for your profile. Maximum 160 characters.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="website" className="text-sm font-medium">
                                    Website (Optional)
                                </label>
                                <Input id="website" type="url" placeholder="https://yourwebsite.com" />
                            </div>

                            <Button>
                                <Save className="mr-2 h-4 w-4" />
                                Save Profile
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Notification Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Bell className="h-5 w-5" />
                                <span>Notification Preferences</span>
                            </CardTitle>
                            <CardDescription>
                                Choose how you want to be notified about activity
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium">Email Notifications</label>
                                        <p className="text-xs text-muted-foreground">
                                            Receive email updates about your bug reports and comments
                                        </p>
                                    </div>
                                    <Switch />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium">Bug Status Updates</label>
                                        <p className="text-xs text-muted-foreground">
                                            Get notified when companies update the status of your bug reports
                                        </p>
                                    </div>
                                    <Switch checked={true} />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium">New Comments</label>
                                        <p className="text-xs text-muted-foreground">
                                            Receive notifications when someone comments on your bug reports
                                        </p>
                                    </div>
                                    <Switch checked={true} />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium">Weekly Digest</label>
                                        <p className="text-xs text-muted-foreground">
                                            Get a weekly summary of activity on your bug reports
                                        </p>
                                    </div>
                                    <Switch />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium">Marketing Emails</label>
                                        <p className="text-xs text-muted-foreground">
                                            Receive updates about new features and BugRelay news
                                        </p>
                                    </div>
                                    <Switch />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="emailFrequency" className="text-sm font-medium">
                                    Email Frequency
                                </label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="immediate">Immediate</SelectItem>
                                        <SelectItem value="daily">Daily Digest</SelectItem>
                                        <SelectItem value="weekly">Weekly Digest</SelectItem>
                                        <SelectItem value="never">Never</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button>
                                <Save className="mr-2 h-4 w-4" />
                                Save Preferences
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Privacy Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Shield className="h-5 w-5" />
                                <span>Privacy & Visibility</span>
                            </CardTitle>
                            <CardDescription>
                                Control how your information is displayed publicly
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-blue-800 font-medium mb-2">Public Platform Notice</p>
                                <p className="text-blue-700 text-sm">
                                    BugRelay is a public platform. Your bug reports, comments, and display name
                                    are always visible to help improve software quality.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium">Show Profile in Search</label>
                                        <p className="text-xs text-muted-foreground">
                                            Allow your profile to appear in user search results
                                        </p>
                                    </div>
                                    <Switch checked={true} />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium">Show Activity Stats</label>
                                        <p className="text-xs text-muted-foreground">
                                            Display your bug report and comment statistics on your profile
                                        </p>
                                    </div>
                                    <Switch checked={true} />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium">Show Company Affiliations</label>
                                        <p className="text-xs text-muted-foreground">
                                            Display companies you're verified with on your profile
                                        </p>
                                    </div>
                                    <Switch checked={true} />
                                </div>
                            </div>

                            <Button>
                                <Save className="mr-2 h-4 w-4" />
                                Save Privacy Settings
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Security Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Key className="h-5 w-5" />
                                <span>Security</span>
                            </CardTitle>
                            <CardDescription>
                                Manage your account security and authentication
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Password</h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Last changed 3 months ago
                                    </p>
                                    <Button variant="outline">
                                        Change Password
                                    </Button>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">Two-Factor Authentication</h3>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Add an extra layer of security to your account
                                            </p>
                                            <Badge variant="outline" className="mt-1">
                                                Not Enabled
                                            </Badge>
                                        </div>
                                        <Button variant="outline">
                                            Enable 2FA
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">API Keys</h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Manage API keys for integrating with external services
                                    </p>
                                    <Button variant="outline">
                                        Manage API Keys
                                    </Button>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">Active Sessions</h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        View and manage your active login sessions
                                    </p>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-3 border rounded-lg">
                                            <div>
                                                <p className="font-medium text-sm">Current Session</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Chrome on macOS • San Francisco, CA • Active now
                                                </p>
                                            </div>
                                            <Badge variant="secondary">Current</Badge>
                                        </div>
                                        <div className="flex items-center justify-between p-3 border rounded-lg">
                                            <div>
                                                <p className="font-medium text-sm">Mobile Session</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Safari on iOS • Last active 2 hours ago
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="sm">
                                                Revoke
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Data & Export */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Data & Export</CardTitle>
                            <CardDescription>
                                Download your data or delete your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="font-semibold mb-2">Export Your Data</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Download a copy of all your bug reports, comments, and account data
                                </p>
                                <Button variant="outline">
                                    Request Data Export
                                </Button>
                            </div>

                            <div className="border-t pt-6">
                                <h3 className="font-semibold mb-2 text-red-600">Delete Account</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Permanently delete your account and all associated data. This action cannot be undone.
                                </p>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                    <p className="text-red-800 font-medium mb-2">⚠️ Important</p>
                                    <ul className="text-red-700 text-sm space-y-1">
                                        <li>• Your bug reports and comments will remain public but anonymized</li>
                                        <li>• Your personal information will be permanently deleted</li>
                                        <li>• Company affiliations will be removed</li>
                                        <li>• This action cannot be reversed</li>
                                    </ul>
                                </div>
                                <Button variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Account
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MainLayout>
    )
}