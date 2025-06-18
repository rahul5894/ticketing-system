"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link,
  Paperclip,
  Smile,
  AtSign,
  Send,
  Download,
  FileText,
  Image as ImageIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Ticket, Attachment, TicketPriority, Department } from "../models/ticket.schema"

interface TicketDetailProps {
  ticket: Ticket
  isAdmin?: boolean
  onTicketUpdate?: (ticketId: string, updates: Partial<Ticket>) => void
}

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
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

// Dot colors for interactive badges (text colors from above)
const priorityDotColors = {
  low: "bg-gray-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
  urgent: "bg-red-700"
}

const departmentDotColors = {
  sales: "bg-orange-500",
  support: "bg-purple-500",
  marketing: "bg-pink-500",
  technical: "bg-blue-500"
}

// Priority options for dropdown
const priorityOptions: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Low Priority" },
  { value: "medium", label: "Medium Priority" },
  { value: "high", label: "High Priority" },
  { value: "urgent", label: "Urgent Priority" }
]

// Department options for dropdown
const departmentOptions: { value: Department; label: string }[] = [
  { value: "sales", label: "Sales Department" },
  { value: "support", label: "Support Department" },
  { value: "marketing", label: "Marketing Department" },
  { value: "technical", label: "Technical Department" }
]

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
}

function ConfirmationDialog({ open, onOpenChange, title, description, onConfirm }: ConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface InteractivePriorityBadgeProps {
  currentPriority: TicketPriority
  onPriorityChange: (newPriority: TicketPriority) => void
  isAdmin: boolean
}

function InteractivePriorityBadge({ currentPriority, onPriorityChange, isAdmin }: InteractivePriorityBadgeProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    newPriority: TicketPriority | null
  }>({ open: false, newPriority: null })

  const handlePrioritySelect = (newPriority: TicketPriority) => {
    if (newPriority === currentPriority) return

    setConfirmDialog({
      open: true,
      newPriority
    })
  }

  const handleConfirm = () => {
    if (confirmDialog.newPriority) {
      onPriorityChange(confirmDialog.newPriority)
    }
    setConfirmDialog({ open: false, newPriority: null })
  }

  const currentOption = priorityOptions.find(option => option.value === currentPriority)
  const newOption = priorityOptions.find(option => option.value === confirmDialog.newPriority)

  if (!isAdmin) {
    return (
      <Badge className={cn("text-xs", priorityColors[currentPriority])}>
        {currentPriority.charAt(0).toUpperCase() + currentPriority.slice(1)} Priority
      </Badge>
    )
  }

  return (
    <>
      <Select value={currentPriority} onValueChange={handlePrioritySelect}>
        <SelectTrigger
          className={cn(
            "inline-flex items-center justify-center rounded-md h-6! px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition-[color,box-shadow] overflow-hidden",
            "border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            "hover:opacity-80 cursor-pointer"
          )}
        >
          <div className={cn("w-2 h-2 rounded-full", priorityDotColors[currentPriority])} />
          <SelectValue>
            {currentPriority.charAt(0).toUpperCase() + currentPriority.slice(1)} Priority
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {priorityOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className={cn("flex items-center gap-2 text-xs")}>
                <div className={cn("w-2 h-2 rounded-full", priorityDotColors[option.value])} />
                {option.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, newPriority: null })}
        title="Change Priority"
        description={`Change priority from ${currentOption?.label} to ${newOption?.label}?`}
        onConfirm={handleConfirm}
      />
    </>
  )
}

interface InteractiveDepartmentBadgeProps {
  currentDepartment: Department
  onDepartmentChange: (newDepartment: Department) => void
  isAdmin: boolean
}

function InteractiveDepartmentBadge({ currentDepartment, onDepartmentChange, isAdmin }: InteractiveDepartmentBadgeProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    newDepartment: Department | null
  }>({ open: false, newDepartment: null })

  const handleDepartmentSelect = (newDepartment: Department) => {
    if (newDepartment === currentDepartment) return

    setConfirmDialog({
      open: true,
      newDepartment
    })
  }

  const handleConfirm = () => {
    if (confirmDialog.newDepartment) {
      onDepartmentChange(confirmDialog.newDepartment)
    }
    setConfirmDialog({ open: false, newDepartment: null })
  }

  const currentOption = departmentOptions.find(option => option.value === currentDepartment)
  const newOption = departmentOptions.find(option => option.value === confirmDialog.newDepartment)

  if (!isAdmin) {
    return (
      <Badge className={cn("text-xs", departmentColors[currentDepartment])}>
        {currentDepartment.charAt(0).toUpperCase() + currentDepartment.slice(1)} Department
      </Badge>
    )
  }

  return (
    <>
      <Select value={currentDepartment} onValueChange={handleDepartmentSelect}>
        <SelectTrigger
          className={cn(
            "inline-flex items-center justify-center rounded-md h-6! px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition-[color,box-shadow] overflow-hidden",
            "border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            "hover:opacity-80 cursor-pointer"
          )}
        >
          <div className={cn("w-2 h-2 rounded-full", departmentDotColors[currentDepartment])} />
          <SelectValue>
            {currentDepartment.charAt(0).toUpperCase() + currentDepartment.slice(1)} Department
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {departmentOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className={cn("flex items-center gap-2 text-xs")}>
                <div className={cn("w-2 h-2 rounded-full", departmentDotColors[option.value])} />
                {option.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, newDepartment: null })}
        title="Change Department"
        description={`Change department from ${currentOption?.label} to ${newOption?.label}?`}
        onConfirm={handleConfirm}
      />
    </>
  )
}

function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.type.startsWith('image/')
  const isPdf = attachment.type === 'application/pdf'

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${Math.round(bytes / (1024 * 1024))} MB`
  }

  return (
    <div className="inline-flex items-center gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 min-w-0 max-w-xs">
      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded",
        isPdf ? "bg-red-100 dark:bg-red-900/20" : isImage ? "bg-blue-100 dark:bg-blue-900/20" : "bg-gray-100 dark:bg-gray-600"
      )}>
        {isPdf ? (
          <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
        ) : isImage ? (
          <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        ) : (
          <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {attachment.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatFileSize(attachment.size)}
        </p>
      </div>
      <Button variant="ghost" size="sm" className="shrink-0 hover:bg-gray-200 dark:hover:bg-gray-600">
        <Download className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function TicketDetail({ ticket, isAdmin = false, onTicketUpdate }: TicketDetailProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
  }

  const handlePriorityChange = (newPriority: TicketPriority) => {
    onTicketUpdate?.(ticket.id, { priority: newPriority })
  }

  const handleDepartmentChange = (newDepartment: Department) => {
    onTicketUpdate?.(ticket.id, { department: newDepartment })
  }

  const mainMessage = ticket.messages[0]

  return (
<div
  className="
    flex-1
    h-[calc(100%-3rem)]
    my-6

    bg-white dark:bg-gray-800
    rounded-lg
    border border-gray-200 dark:border-gray-700
    shadow-sm

    flex flex-col

    overflow-hidden
  "
>
  {/* now if you need scrolling: */}
  <div className="flex-1 overflow-auto ">
    {/* your actual content */}

   
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {ticket.title}
          </h1>
          <Select defaultValue="ticket-actions">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Ticket actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ticket-actions">Ticket actions</SelectItem>
              <SelectItem value="close">Close ticket</SelectItem>
              <SelectItem value="assign">Assign to agent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <Badge className={cn("text-xs", statusColors[ticket.status])}>
            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
          </Badge>
          <InteractivePriorityBadge
            currentPriority={ticket.priority}
            onPriorityChange={handlePriorityChange}
            isAdmin={isAdmin}
          />
          <InteractiveDepartmentBadge
            currentDepartment={ticket.department}
            onDepartmentChange={handleDepartmentChange}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      {/* Message thread - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6">
          {mainMessage && (
            <div className="mb-6">
              {/* User info */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={ticket.userAvatar} />
                  <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-medium">
                    {getInitials(ticket.userName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{ticket.userName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {format(ticket.createdAt, "do 'of' MMMM 'at' h a")}
                  </p>
                </div>
              </div>

            {/* Message content */}
            <div className="prose prose-sm max-w-none mb-4 ml-13">
              <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {mainMessage.content}
              </p>
            </div>

            {/* Attachments */}
            {mainMessage.attachments.length > 0 && (
              <div className="mb-6 ml-13">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  {mainMessage.attachments.length} Attachments
                </h4>
                <div className="flex flex-wrap gap-3">
                  {mainMessage.attachments.map((attachment) => (
                    <AttachmentItem key={attachment.id} attachment={attachment} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Reply section - Fixed at bottom */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
        <div className="p-6">
          <div className="space-y-4">
            {/* Reply to */}
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <Avatar className="h-8 w-8">
                <AvatarImage src={ticket.userAvatar} />
                <AvatarFallback className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium">
                  {getInitials(ticket.userName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <span>Reply to:</span>
                <span className="font-medium">{ticket.userName} ({ticket.userEmail})</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                  ×
                </Button>
              </div>
            </div>

          {/* Clean two-line formatting toolbar */}
          <div className="space-y-2">
            {/* First line - Paragraph selector and text formatting */}
            <div className="flex items-center gap-1">
              <Select defaultValue="paragraph">
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paragraph">Paragraph</SelectItem>
                  <SelectItem value="heading1">Heading 1</SelectItem>
                  <SelectItem value="heading2">Heading 2</SelectItem>
                </SelectContent>
              </Select>

              <Separator orientation="vertical" className="h-6 mx-1" />

              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700">
                <Bold className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700">
                <Italic className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700">
                <Underline className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6 mx-1" />

              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700">
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700">
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700">
                <AlignRight className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6 mx-1" />

              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700">
                <List className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700">
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700">
                <Link className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Text area */}
          <Textarea
            placeholder="Hi Dean,

Thank you for contacting us. We sure can help you. Shall we schedule a call tomorrow around 12.00pm. We can help you better if we are on a call.

Please let us know your availability.

Thanks

Lisa"
            className="min-h-32 resize-none border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
            defaultValue="Hi Dean,

Thank you for contacting us. We sure can help you. Shall we schedule a call tomorrow around 12.00pm. We can help you better if we are on a call.

Please let us know your availability.

Thanks

Lisa"
          />

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="hover:bg-gray-100 dark:hover:bg-gray-700">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="hover:bg-gray-100 dark:hover:bg-gray-700">
                <Smile className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="hover:bg-gray-100 dark:hover:bg-gray-700">
                <AtSign className="h-4 w-4" />
              </Button>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white dark:text-white">
              <Send className="h-4 w-4 mr-1 text-white dark:text-white" />
              Send
            </Button>
          </div>
        </div>
        </div>
      </div>
            </div>
      </div>
    
  )
}
