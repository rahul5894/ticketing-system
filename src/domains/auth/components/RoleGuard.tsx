'use client'

import { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: Array<'user' | 'admin' | 'support'>
  fallback?: ReactNode
  requireAuth?: boolean
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback = null,
  requireAuth = true 
}: RoleGuardProps) {
  const { user, isSignedIn, isLoading } = useAuth()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // If authentication is required but user is not signed in
  if (requireAuth && !isSignedIn) {
    return fallback
  }

  // If user is signed in, check role permissions
  if (isSignedIn && user) {
    const hasPermission = allowedRoles.includes(user.role)
    if (hasPermission) {
      return <>{children}</>
    }
  }

  // If no permission or not signed in, show fallback
  return fallback
}

// Specific role guard components for common use cases
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['admin']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function SupportOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['admin', 'support']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function AuthenticatedOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['user', 'admin', 'support']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}
