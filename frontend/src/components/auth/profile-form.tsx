"use client";

import * as React from "react";
import { Camera, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { useAuthStore } from "@/lib/stores";

interface ProfileFormProps {
  user?: UserProfile;
  onSubmit?: (data: UserProfileData) => Promise<void>;
  onAvatarUpload?: (file: File) => Promise<string>;
  isLoading?: boolean;
  error?: string;
  success?: boolean;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  githubUsername?: string;
  twitterUsername?: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface UserProfileData {
  displayName: string;
  bio?: string;
  location?: string;
  website?: string;
  githubUsername?: string;
  twitterUsername?: string;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  onSubmit,
  onAvatarUpload,
  isLoading = false,
  error,
  success = false,
}) => {
  const { user } = useAuthStore();
  const [formData, setFormData] = React.useState<UserProfileData>({
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    location: user?.location || "",
    website: user?.website || "",
    githubUsername: user?.githubUsername || "",
    twitterUsername: user?.twitterUsername || "",
  });
  const [fieldErrors, setFieldErrors] = React.useState<
    Partial<UserProfileData>
  >({});
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (user) {
      const newFormData = {
        displayName: user.displayName,
        bio: user.bio || "",
        location: user.location || "",
        website: user.website || "",
        githubUsername: user.githubUsername || "",
        twitterUsername: user.twitterUsername || "",
      };
      setFormData(newFormData);
    }
  }, [user]);

  React.useEffect(() => {
    if (user) {
      const hasFormChanges =
        formData.displayName !== (user.displayName || "") ||
        formData.bio !== (user.bio || "") ||
        formData.location !== (user.location || "") ||
        formData.website !== (user.website || "") ||
        formData.githubUsername !== (user.githubUsername || "") ||
        formData.twitterUsername !== (user.twitterUsername || "");

      setHasChanges(hasFormChanges);
    }
  }, [formData, user]);

  const validateForm = (): boolean => {
    const errors: Partial<UserProfileData> = {};

    if (!formData.displayName.trim()) {
      errors.displayName = "Name is required";
    } else if (formData.displayName.trim().length < 2) {
      errors.displayName = "Name must be at least 2 characters";
    }

    if (formData.website && !isValidUrl(formData.website)) {
      errors.website = "Please enter a valid URL";
    }

    if (
      formData.githubUsername &&
      !/^[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]$/.test(formData.githubUsername)
    ) {
      errors.githubUsername = "Please enter a valid GitHub username";
    }

    if (
      formData.twitterUsername &&
      !/^[a-zA-Z0-9_]+$/.test(formData.twitterUsername)
    ) {
      errors.twitterUsername = "Please enter a valid Twitter username";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !onSubmit) return;

    try {
      await onSubmit(formData);
      setHasChanges(false);
    } catch (err) {
      // Error handling is managed by parent component
    }
  };

  const handleInputChange = (field: keyof UserProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAvatarUpload) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      alert("Image size must be less than 5MB");
      return;
    }

    try {
      setAvatarUploading(true);
      await onAvatarUpload(file);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setAvatarUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your profile information and manage your public presence
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-semibold text-muted-foreground">
                    {user?.displayName?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                onClick={handleAvatarClick}
                disabled={avatarUploading}
              >
                {avatarUploading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div>
              <h3 className="font-medium">{user?.displayName}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">
                Member since{" "}
                {user?.createdAt ? formatDate(user.createdAt) : "Unknown"}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* Success Message */}
          {success && (
            <div className="p-3 text-sm text-green-800 bg-green-100 border border-green-200 rounded-md">
              Profile updated successfully!
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Display Name *
                </label>
                <Input
                  id="name"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    handleInputChange("displayName", e.target.value)
                  }
                  disabled={isLoading}
                  className={
                    fieldErrors.displayName ? "border-destructive" : ""
                  }
                />
                {fieldErrors.displayName && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.displayName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="location" className="text-sm font-medium">
                  Location
                </label>
                <Input
                  id="location"
                  type="text"
                  placeholder="e.g. San Francisco, CA"
                  value={formData.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="bio" className="text-sm font-medium">
                Bio
              </label>
              <Textarea
                id="bio"
                placeholder="Tell us a bit about yourself..."
                value={formData.bio}
                onChange={(e) => handleInputChange("bio", e.target.value)}
                disabled={isLoading}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {formData.bio?.length || 0}/500 characters
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="website" className="text-sm font-medium">
                Website
              </label>
              <Input
                id="website"
                type="url"
                placeholder="https://yourwebsite.com"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                disabled={isLoading}
                className={fieldErrors.website ? "border-destructive" : ""}
              />
              {fieldErrors.website && (
                <p className="text-sm text-destructive">
                  {fieldErrors.website}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="githubUsername" className="text-sm font-medium">
                  GitHub Username
                </label>
                <Input
                  id="githubUsername"
                  type="text"
                  placeholder="username"
                  value={formData.githubUsername}
                  onChange={(e) =>
                    handleInputChange("githubUsername", e.target.value)
                  }
                  disabled={isLoading}
                  className={
                    fieldErrors.githubUsername ? "border-destructive" : ""
                  }
                />
                {fieldErrors.githubUsername && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.githubUsername}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="twitterUsername"
                  className="text-sm font-medium"
                >
                  Twitter Username
                </label>
                <Input
                  id="twitterUsername"
                  type="text"
                  placeholder="username"
                  value={formData.twitterUsername}
                  onChange={(e) =>
                    handleInputChange("twitterUsername", e.target.value)
                  }
                  disabled={isLoading}
                  className={
                    fieldErrors.twitterUsername ? "border-destructive" : ""
                  }
                />
                {fieldErrors.twitterUsername && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.twitterUsername}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (user) {
                    setFormData({
                      displayName: user.displayName || "",
                      bio: user.bio || "",
                      location: user.location || "",
                      website: user.website || "",
                      githubUsername: user.githubUsername || "",
                      twitterUsername: user.twitterUsername || "",
                    });
                    setHasChanges(false);
                  }
                }}
                disabled={isLoading || !hasChanges}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !hasChanges}>
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
