"use client"

import * as React from "react"
import { Plus, Mail, Trash2, Crown, User, Shield, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/ui/status-badge"
import { LoadingSpinner } from "@/components/ui/loading"

interface TeamManagementProps {
  company?: CompanyTeam
  onInviteMember?: (data: InviteMemberData) => Promise<void>
  onUpdateMemberRole?: (memberId: string, role: "admin" | "member") => Promise<void>
  onRemoveMember?: (memberId: string) => Promise<void>
  isLoading?: boolean
  error?: string
  currentUserRole?: "admin" | "member"
}

export interface CompanyTeam {
  id: string
  name: string
  domain: string
  
  members: {
    id: string
    name: string
    email: string
    role: "admin" | "member"
    avatar?: string
    joinedAt: string
    lastActiveAt: string
    invitedBy?: {
      name: string
    }
    status: "active" | "pending" | "inactive"
  }[]
  
  pendingInvitations: {
    id: string
    email: string
    role: "admin" | "member"
    invitedAt: string
    invitedBy: {
      name: string
    }
    expiresAt: string
  }[]
}

export interface InviteMemberData {
  email: string
  role: "admin" | "member"
}

const roleOptions = [
  {
    value: "member",
    label: "Member",
    description: "Can respond to bugs and update status",
    icon: User
  },
  {
    value: "admin",
    label: "Admin",
    description: "Full access including team management",
    icon: Crown
  }
]

export const TeamManagement: React.FC<TeamManagementProps> = ({
  company,
  onInviteMember,
  onUpdateMemberRole,
  onRemoveMember,
  isLoading = false,
  error,
  currentUserRole = "member"
}) => {
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<"admin" | "member">("member")
  const [isInviting, setIsInviting] = React.useState(false)
  const [emailError, setEmailError] = React.useState("")

  const canManageTeam = currentUserRole === "admin"

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setEmailError("Email is required")
      return false
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email address")
      return false
    }
    if (company && !email.endsWith(`@${company.domain}`)) {
      setEmailError(`Email must be from ${company.domain} domain`)
      return false
    }
    if (company?.members.some(member => member.email === email)) {
      setEmailError("This person is already a team member")
      return false
    }
    if (company?.pendingInvitations.some(invite => invite.email === email)) {
      setEmailError("An invitation has already been sent to this email")
      return false
    }
    setEmailError("")
    return true
  }

  const handleInviteMember = async () => {
    if (!onInviteMember || !validateEmail(inviteEmail)) return
    
    setIsInviting(true)
    try {
      await onInviteMember({
        email: inviteEmail,
        role: inviteRole
      })
      setInviteEmail("")
      setInviteRole("member")
    } catch (err) {
      console.error("Failed to invite member:", err)
    } finally {
      setIsInviting(false)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: "admin" | "member") => {
    if (!onUpdateMemberRole) return
    
    try {
      await onUpdateMemberRole(memberId, newRole)
    } catch (err) {
      console.error("Failed to update member role:", err)
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!onRemoveMember) return
    
    if (confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      try {
        await onRemoveMember(memberId)
      } catch (err) {
        console.error("Failed to remove member:", err)
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600'
      case 'pending': return 'text-yellow-600'
      case 'inactive': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  if (!company) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Company not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Invite New Member */}
      {canManageTeam && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Team Member</CardTitle>
            <CardDescription>
              Invite a colleague to help manage bug reports for {company.name}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label htmlFor="inviteEmail" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder={`colleague@${company.domain}`}
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value)
                    if (emailError) setEmailError("")
                  }}
                  disabled={isInviting}
                  className={emailError ? "border-destructive" : ""}
                />
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as "admin" | "member")}
                  disabled={isInviting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center space-x-2">
                            <Icon className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-muted-foreground">{option.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleInviteMember}
              disabled={isInviting || !inviteEmail}
              className="w-full"
            >
              {isInviting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Sending invitation...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations */}
      {company.pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              Invitations that haven't been accepted yet
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              {company.pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                  <div>
                    <p className="font-medium">{invitation.email}</p>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>Invited by {invitation.invitedBy.name}</span>
                      <span>•</span>
                      <span>{formatDate(invitation.invitedAt)}</span>
                      <span>•</span>
                      <span>Expires {formatDate(invitation.expiresAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <StatusBadge className="text-xs">
                      {invitation.role}
                    </StatusBadge>
                    <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                      Pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({company.members.length})</CardTitle>
          <CardDescription>
            Manage roles and permissions for your team
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {company.members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No team members yet</p>
              {canManageTeam && (
                <p className="text-sm">Invite colleagues to help manage bug reports</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {company.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="font-medium">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{member.name}</p>
                        {member.role === "admin" && (
                          <Crown className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>Joined {formatDate(member.joinedAt)}</span>
                        <span>•</span>
                        <span className={getStatusColor(member.status)}>
                          {member.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <StatusBadge className="text-xs">
                      {member.role}
                    </StatusBadge>
                    
                    {canManageTeam && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role === "member" ? (
                            <DropdownMenuItem
                              onClick={() => handleUpdateRole(member.id, "admin")}
                            >
                              <Crown className="mr-2 h-4 w-4" />
                              Make Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleUpdateRole(member.id, "member")}
                            >
                              <User className="mr-2 h-4 w-4" />
                              Make Member
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove from team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Role Permissions</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="font-medium">Member</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• View and respond to bug reports</li>
                <li>• Update bug status</li>
                <li>• Add company responses</li>
                <li>• View team members</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Crown className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Admin</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• All member permissions</li>
                <li>• Invite and remove team members</li>
                <li>• Change member roles</li>
                <li>• Manage company settings</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}