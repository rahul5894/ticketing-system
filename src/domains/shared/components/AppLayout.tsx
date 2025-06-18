"use client"

import { useState } from "react"
import { Sidebar } from "./Sidebar"

interface AppLayoutProps {
  children: React.ReactNode
  rightSidebar?: React.ReactNode
}

export function AppLayout({ children, rightSidebar }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main content area */}
      <div className="lg:pl-[3.125rem]">
        <div className="flex h-screen overflow-hidden">
          {/* Main content */}
          <main className="flex-1 overflow-hidden">
            {children}
          </main>

          {/* Right sidebar - Visitor Information */}
          {rightSidebar && (
            <aside className="hidden xl:block w-80 overflow-hidden">
              {rightSidebar}
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
