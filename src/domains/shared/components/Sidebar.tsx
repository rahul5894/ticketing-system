"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "./ThemeProvider"
import {
  ChevronRight,
  Search,
  Home,
  MessageSquare,
  Ticket,
  Grid3X3,
  Clock,
  Settings,
  Bell,
  Moon,
  Sun
} from "lucide-react"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const navigationItems = [
  { icon: Home, label: "Dashboard", href: "/" },
  { icon: Search, label: "Search", href: "/search" },
  { icon: MessageSquare, label: "Messages", href: "/messages" },
  { icon: Ticket, label: "Tickets", href: "/tickets", active: true },
  { icon: Grid3X3, label: "Apps", href: "/apps" },
  { icon: Clock, label: "History", href: "/history" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

const bottomNavigationItems = [
  { icon: Bell, label: "Notifications", href: "/notifications" },
]

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { theme, setTheme } = useTheme()
  const [isHovered, setIsHovered] = useState(false)

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-gray-900 transition-all duration-300 ease-in-out flex flex-col",
          isOpen ? "w-64" : "w-[3.125rem]",
          "lg:w-[3.125rem]",
          isHovered && !isOpen && "lg:w-52"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Toggle button - only on mobile */}
        <div className="flex h-16 items-center justify-center px-1 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="text-white hover:bg-gray-800"
          >
            <ChevronRight className={cn("h-1rem w-1rem transition-transform", isOpen && "rotate-180")} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-2 space-y-0.5 px-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isExpanded = isOpen || isHovered
            return (
              <div key={item.href}>
                {!isExpanded ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full text-gray-300 hover:bg-gray-800 hover:text-white h-10 transition-all duration-300",
                          "justify-center px-0",
                          item.active && "bg-blue-600 text-white hover:bg-blue-700 rounded-md"
                        )}
                      >
                        <Icon className="h-1.25rem w-1.25rem shrink-0" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-0.5rem">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full text-gray-300 hover:bg-gray-800 hover:text-white h-10 transition-all duration-300",
                      "justify-start px-3",
                      item.active && "bg-blue-600 text-white hover:bg-blue-700 rounded-md"
                    )}
                  >
                    <Icon className="h-1.25rem w-1.25rem shrink-0" />
                    <span className="ml-3 truncate opacity-100 transition-opacity duration-300">
                      {item.label}
                    </span>
                  </Button>
                )}
              </div>
            )
          })}
        </nav>

        {/* Bottom navigation items */}
        <div className="space-y-0.5 px-1 pb-1">
          {/* Notification icon */}
          {bottomNavigationItems.map((item) => {
            const Icon = item.icon
            const isExpanded = isOpen || isHovered
            return (
              <div key={item.href}>
                {!isExpanded ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full text-gray-300 hover:bg-gray-800 hover:text-white h-10 transition-all duration-300 justify-center px-0"
                      >
                        <Icon className="h-1.25rem w-1.25rem shrink-0" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-0.5rem">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full text-gray-300 hover:bg-gray-800 hover:text-white h-10 transition-all duration-300 justify-start px-3"
                  >
                    <Icon className="h-1.25rem w-1.25rem shrink-0" />
                    <span className="ml-3 truncate opacity-100 transition-opacity duration-300">
                      {item.label}
                    </span>
                  </Button>
                )}
              </div>
            )
          })}

          {/* Theme toggle */}
          <div>
            {!(isOpen || isHovered) ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={toggleTheme}
                    className="w-full text-gray-300 hover:bg-gray-800 hover:text-white h-10 transition-all duration-300 justify-center px-0"
                  >
                    {theme === "light" ? (
                      <Moon className="h-1.25rem w-1.25rem shrink-0" />
                    ) : (
                      <Sun className="h-1.25rem w-1.25rem shrink-0" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-0.5rem">
                  {theme === "light" ? "Dark Mode" : "Light Mode"}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                onClick={toggleTheme}
                className="w-full text-gray-300 hover:bg-gray-800 hover:text-white h-10 transition-all duration-300 justify-start px-3"
              >
                {theme === "light" ? (
                  <Moon className="h-1.25rem w-1.25rem shrink-0" />
                ) : (
                  <Sun className="h-1.25rem w-1.25rem shrink-0" />
                )}
                <span className="ml-3 truncate opacity-100 transition-opacity duration-300">
                  {theme === "light" ? "Dark Mode" : "Light Mode"}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
