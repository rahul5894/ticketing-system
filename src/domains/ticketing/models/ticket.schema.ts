import { z } from "zod"

export const TicketStatusSchema = z.enum(["open", "closed", "pending", "resolved"])
export const TicketPrioritySchema = z.enum(["low", "medium", "high", "urgent"])
export const DepartmentSchema = z.enum(["sales", "support", "marketing", "technical"])

export const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  url: z.string(),
  uploadedAt: z.date(),
})

export const TicketMessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  authorAvatar: z.string().optional(),
  createdAt: z.date(),
  attachments: z.array(AttachmentSchema).default([]),
})

export const TicketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: TicketStatusSchema,
  priority: TicketPrioritySchema,
  department: DepartmentSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  userAvatar: z.string().optional(),
  messages: z.array(TicketMessageSchema).default([]),
  attachments: z.array(AttachmentSchema).default([]),
})

export type Ticket = z.infer<typeof TicketSchema>
export type TicketStatus = z.infer<typeof TicketStatusSchema>
export type TicketPriority = z.infer<typeof TicketPrioritySchema>
export type Department = z.infer<typeof DepartmentSchema>
export type Attachment = z.infer<typeof AttachmentSchema>
export type TicketMessage = z.infer<typeof TicketMessageSchema>

// Mock data for development
export const mockTickets: Ticket[] = [
  {
    id: "1",
    title: "Help needed for payment failure",
    description: "I need help to process the payment via my VISA card.",
    status: "open",
    priority: "high",
    department: "sales",
    createdAt: new Date("2024-06-23T08:00:00Z"),
    updatedAt: new Date("2024-06-23T08:00:00Z"),
    userId: "user1",
    userName: "Dean Taylor",
    userEmail: "dean.taylor@gmail.com",
    userAvatar: undefined,
    messages: [
      {
        id: "msg1",
        content: "Hi,\n\nI need help to process the payment via my VISA card.\n\nIts returning failed payment after the checkout. I need to send out this campaign within today. can you please help ASAP.\n\nThanks",
        authorId: "user1",
        authorName: "Dean Taylor",
        createdAt: new Date("2024-06-23T08:00:00Z"),
        attachments: [
          {
            id: "att1",
            name: "doc.pdf",
            type: "application/pdf",
            size: 29000,
            url: "/files/doc.pdf",
            uploadedAt: new Date("2024-06-23T08:00:00Z"),
          },
          {
            id: "att2",
            name: "image.jpg",
            type: "image/jpeg",
            size: 30000,
            url: "/files/image.jpg",
            uploadedAt: new Date("2024-06-23T08:00:00Z"),
          }
        ]
      }
    ],
    attachments: []
  },
  {
    id: "2",
    title: "Account access issue",
    description: "Hi, I have recently come across your website...",
    status: "open",
    priority: "high",
    department: "marketing",
    createdAt: new Date("2024-06-23T07:55:00Z"),
    updatedAt: new Date("2024-06-23T07:55:00Z"),
    userId: "user2",
    userName: "Jenny Wilson",
    userEmail: "jenny.wilson@example.com",
    messages: [],
    attachments: []
  },
  {
    id: "3",
    title: "Account locked out",
    description: "Hi, I am locked out of my account. It says...",
    status: "open",
    priority: "high",
    department: "support",
    createdAt: new Date("2024-06-23T07:52:00Z"),
    updatedAt: new Date("2024-06-23T07:52:00Z"),
    userId: "user3",
    userName: "Blake Gilmore",
    userEmail: "blake.gilmore@example.com",
    messages: [],
    attachments: []
  },
  {
    id: "4",
    title: "Account upgrade help",
    description: "Hi, I need help to upgrade my account. I...",
    status: "open",
    priority: "medium",
    department: "sales",
    createdAt: new Date("2024-06-23T07:50:00Z"),
    updatedAt: new Date("2024-06-23T07:50:00Z"),
    userId: "user4",
    userName: "Robert Gulliver",
    userEmail: "robert.gulliver@example.com",
    messages: [],
    attachments: []
  }
]
