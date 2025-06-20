import { useAuth } from './useAuth'

export function useRolePermissions() {
  const { user, isAdmin, isSupport, isUser } = useAuth()

  const permissions = {
    // Ticket permissions
    canCreateTicket: isUser || isSupport || isAdmin,
    canViewAllTickets: isSupport || isAdmin,
    canEditAnyTicket: isSupport || isAdmin,
    canDeleteTicket: isAdmin,
    canAssignTickets: isSupport || isAdmin,
    canChangeTicketPriority: isSupport || isAdmin,
    canChangeTicketDepartment: isSupport || isAdmin,
    
    // User management permissions
    canViewAllUsers: isSupport || isAdmin,
    canEditUserRoles: isAdmin,
    canDeleteUsers: isAdmin,
    canViewUserProfiles: isSupport || isAdmin,
    
    // System permissions
    canAccessAdminPanel: isAdmin,
    canViewAnalytics: isSupport || isAdmin,
    canManageSettings: isAdmin,
    canViewAuditLogs: isAdmin,
    
    // Message permissions
    canReplyToTickets: isUser || isSupport || isAdmin,
    canViewTicketHistory: isSupport || isAdmin,
    canDeleteMessages: isAdmin,
    
    // File permissions
    canUploadFiles: isUser || isSupport || isAdmin,
    canDeleteFiles: isSupport || isAdmin,
    canViewAllFiles: isSupport || isAdmin,
  }

  const checkPermission = (permission: keyof typeof permissions): boolean => {
    return permissions[permission]
  }

  const hasAnyRole = (roles: Array<'user' | 'admin' | 'support'>): boolean => {
    if (!user) return false
    return roles.includes(user.role)
  }

  const hasRole = (role: 'user' | 'admin' | 'support'): boolean => {
    return user?.role === role
  }

  return {
    permissions,
    checkPermission,
    hasAnyRole,
    hasRole,
    currentRole: user?.role,
    isAuthenticated: !!user,
  }
}
