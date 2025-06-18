"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { Ticket } from "../models/ticket.schema"

interface TicketCardProps {
  ticket: Ticket
  isSelected?: boolean
  onClick?: () => void
}

const priorityColors = {
  low: "bg-gray-100 text-gray-800 ",
  medium: "bg-yellow-100 text-yellow-800 ",
  high: "bg-red-100 text-red-800 ",
  urgent: "bg-red-200 text-red-900"
}

const statusColors = {
  open: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  resolved: "bg-blue-100 text-blue-800"
}

const departmentColors = {
  sales: "bg-orange-100 text-orange-800",
  support: "bg-purple-100 text-purple-800",
  marketing: "bg-pink-100 text-pink-800",
  technical: "bg-blue-100 text-blue-800"
}

export function TicketCard({ ticket, isSelected, onClick }: TicketCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
  }

  const timeAgo = formatDistanceToNow(ticket.createdAt, { addSuffix: true })
    .replace("about ", "")
    .replace(" ago", "")
    .replace("minutes", "mins")
    .replace("hours", "hrs")

  return (
    <div
      className={cn(
        "p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors",
        !isSelected && "hover:bg-gray-50 dark:hover:bg-gray-700",
        isSelected && "bg-blue-50/60 dark:bg-blue-900/30 border-blue-200/50 dark:border-blue-600/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="h-8 w-8 shrink-0 border border-blue-200">
          <AvatarImage src={ticket.userAvatar} />
          <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-medium">
            {getInitials(ticket.userName)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
              {ticket.userName}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 ml-2">
              {timeAgo}
            </span>
          </div>

          {/* Message preview */}
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
            {ticket.description}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            <Badge 
              variant="secondary" 
              className={cn("text-xs", statusColors[ticket.status])}
            >
              {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
            </Badge>
            
            <Badge 
              variant="secondary" 
              className={cn("text-xs", priorityColors[ticket.priority])}
            >
              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
            </Badge>
            
            <Badge 
              variant="secondary" 
              className={cn("text-xs", departmentColors[ticket.department])}
            >
              {ticket.department.charAt(0).toUpperCase() + ticket.department.slice(1)} Department
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
