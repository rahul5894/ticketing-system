"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Search, Filter, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { TicketCard } from "./TicketCard"
import { mockTickets } from "../models/ticket.schema"

interface RecentTicketsProps {
  selectedTicketId?: string
  onTicketSelect?: (ticketId: string) => void
}

export function RecentTickets({ selectedTicketId, onTicketSelect }: RecentTicketsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(true)

  const openTickets = mockTickets.filter(ticket => ticket.status === "open")
  const filteredTickets = openTickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.userName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-full max-w-md bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Tickets</h2>

        {/* Search and Filter */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <Button variant="outline" className="px-3 h-10">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Collapsible Tickets Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex-1 flex flex-col min-h-0">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-4 h-auto font-normal shrink-0 hover:bg-transparent rounded-none cursor-pointer"
            >
              <span className="text-sm text-gray-600 dark:text-gray-400">
                My Open tickets ({filteredTickets.length})
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-0">
              {filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  isSelected={selectedTicketId === ticket.id}
                  onClick={() => onTicketSelect?.(ticket.id)}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}
