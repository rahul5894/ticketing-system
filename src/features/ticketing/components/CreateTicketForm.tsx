'use client';

import { useState, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Textarea } from '@/features/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/shared/components/ui/select';
import { Badge } from '@/features/shared/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/features/shared/components/ui/form';
import { cn } from '@/lib/utils';
import {
  X,
  Paperclip,
  Send,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  ChevronDown,
} from 'lucide-react';

// Types
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type Department = 'sales' | 'support' | 'marketing' | 'technical';

interface AssignedUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface CreateTicketFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  department: Department;
  assignedTo: string[];
  cc?: string | undefined;
}

interface CreateTicketFormProps {
  onSubmit: (data: CreateTicketFormData & { attachments: File[] }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// Form validation schema
const CreateTicketFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(5000, 'Description too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  department: z.enum(['sales', 'support', 'marketing', 'technical']),
  assignedTo: z.array(z.string()),
  cc: z.string().optional(),
});

// Mock users for assignment autocomplete
const mockUsers: AssignedUser[] = [
  { id: 'user1', name: 'Sarah Johnson', email: 'sarah.johnson@company.com' },
  { id: 'user2', name: 'Mike Chen', email: 'mike.chen@company.com' },
  { id: 'user3', name: 'Emily Davis', email: 'emily.davis@company.com' },
  { id: 'user4', name: 'Alex Rodriguez', email: 'alex.rodriguez@company.com' },
  { id: 'user5', name: 'David Wilson', email: 'david.wilson@company.com' },
  { id: 'user6', name: 'Lisa Thompson', email: 'lisa.thompson@company.com' },
  { id: 'user7', name: 'James Brown', email: 'james.brown@company.com' },
  { id: 'user8', name: 'Maria Garcia', email: 'maria.garcia@company.com' },
];

// Priority options
const priorityOptions = [
  {
    value: 'low' as const,
    label: 'Low Priority',
    description: 'Standard support requests',
  },
  {
    value: 'medium' as const,
    label: 'Medium Priority',
    description: 'Important but not urgent',
  },
  {
    value: 'high' as const,
    label: 'High Priority',
    description: 'Urgent business impact',
  },
  {
    value: 'urgent' as const,
    label: 'Urgent',
    description: 'Critical system issues',
  },
];

// Department options
const departmentOptions = [
  {
    value: 'sales' as const,
    label: 'Sales Department',
    description: 'Sales inquiries and support',
  },
  {
    value: 'support' as const,
    label: 'Support Department',
    description: 'Technical support requests',
  },
  {
    value: 'marketing' as const,
    label: 'Marketing Department',
    description: 'Marketing and campaigns',
  },
  {
    value: 'technical' as const,
    label: 'Technical Department',
    description: 'Development and infrastructure',
  },
];

// Color mappings
const priorityColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  medium:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const departmentColors = {
  sales:
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  support: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  marketing: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  technical: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

export function CreateTicketForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CreateTicketFormProps) {
  // State
  const [attachments, setAttachments] = useState<File[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [assigneeInput, setAssigneeInput] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const assigneeInputRef = useRef<HTMLInputElement>(null);

  // Form setup
  const form = useForm<CreateTicketFormData>({
    resolver: zodResolver(CreateTicketFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      department: 'support',
      assignedTo: [],
      cc: '',
    },
  });

  // Handlers
  const handleSubmit = (data: CreateTicketFormData) => {
    onSubmit({ ...data, attachments });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className='h-4 w-4 text-blue-600 dark:text-blue-400' />;
    }
    return <FileText className='h-4 w-4 text-gray-600 dark:text-gray-400' />;
  };

  // Assignee management
  const filteredUsers = mockUsers
    .filter(
      (user) =>
        user.name.toLowerCase().includes(assigneeInput.toLowerCase()) ||
        user.email.toLowerCase().includes(assigneeInput.toLowerCase())
    )
    .filter(
      (user) => !assignedUsers.some((assigned) => assigned.id === user.id)
    );

  const handleAssigneeInputChange = (value: string) => {
    setAssigneeInput(value);
    setShowAssigneeDropdown(value.includes('@') && value.length > 1);
  };

  const addAssignedUser = (user: AssignedUser) => {
    const newAssignedUsers = [...assignedUsers, user];
    setAssignedUsers(newAssignedUsers);
    form.setValue(
      'assignedTo',
      newAssignedUsers.map((u) => u.id)
    );
    setAssigneeInput('');
    setShowAssigneeDropdown(false);
    assigneeInputRef.current?.focus();
  };

  const removeAssignedUser = (userId: string) => {
    const newAssignedUsers = assignedUsers.filter((user) => user.id !== userId);
    setAssignedUsers(newAssignedUsers);
    form.setValue(
      'assignedTo',
      newAssignedUsers.map((u) => u.id)
    );
  };

  const handleAssigneeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '@' && !assigneeInput.includes('@')) {
      setAssigneeInput(assigneeInput + '@');
      setShowAssigneeDropdown(true);
    } else if (e.key === 'Escape') {
      setShowAssigneeDropdown(false);
    }
  };

  const selectedPriority = form.watch('priority');
  const selectedDepartment = form.watch('department');

  return (
    <div className='flex-1 h-[calc(100%-3rem)] my-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden'>
      {/* Header */}
      <div className='p-6 border-b border-gray-200 dark:border-gray-700 shrink-0'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              size='sm'
              onClick={onCancel}
              className='hover:bg-gray-100 dark:hover:bg-gray-700'
            >
              <ArrowLeft className='h-4 w-4 mr-2' />
              Back
            </Button>
            <h1 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
              Create New Ticket
            </h1>
          </div>
        </div>

        {/* Preview badges */}
        <div className='flex flex-wrap gap-2'>
          <Badge className={cn('text-xs', priorityColors[selectedPriority])}>
            {selectedPriority.charAt(0).toUpperCase() +
              selectedPriority.slice(1)}{' '}
            Priority
          </Badge>
          <Badge
            className={cn('text-xs', departmentColors[selectedDepartment])}
          >
            {selectedDepartment.charAt(0).toUpperCase() +
              selectedDepartment.slice(1)}{' '}
            Department
          </Badge>
        </div>
      </div>

      {/* Form Content - Scrollable */}
      <div className='flex-1 overflow-y-auto min-h-0'>
        <div className='p-6'>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className='space-y-6'
            >
              {/* Title Field */}
              <FormField
                control={form.control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                      Title *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Brief description of the issue'
                        {...field}
                        className='h-10'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description Field */}
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                      Description *
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Provide detailed information about your request or issue...'
                        className='min-h-[120px] resize-none'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Priority and Department Row */}
              <div className='flex gap-3'>
                <FormField
                  control={form.control}
                  name='priority'
                  render={({ field }) => (
                    <FormItem className='flex-1'>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className='border-0 bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'>
                            <SelectValue placeholder='Select priority' />
                            <ChevronDown className='h-4 w-4 opacity-50' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priorityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className='flex flex-col'>
                                <span className='font-medium'>
                                  {option.label}
                                </span>
                                <span className='text-xs text-gray-500 dark:text-gray-400'>
                                  {option.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='department'
                  render={({ field }) => (
                    <FormItem className='flex-1'>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className='border-0 bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'>
                            <SelectValue placeholder='Select department' />
                            <ChevronDown className='h-4 w-4 opacity-50' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departmentOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className='flex flex-col'>
                                <span className='font-medium'>
                                  {option.label}
                                </span>
                                <span className='text-xs text-gray-500 dark:text-gray-400'>
                                  {option.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Assigned To Field */}
              <div className='space-y-3'>
                <FormLabel className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                  Assign To
                </FormLabel>

                {/* Assignee Input */}
                <div className='relative'>
                  <div className='flex items-center gap-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600 min-h-[44px] flex-wrap'>
                    {/* Assigned Users Tags */}
                    {assignedUsers.map((user) => (
                      <div
                        key={user.id}
                        className='flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md text-sm'
                      >
                        <span>{user.name}</span>
                        <button
                          type='button'
                          onClick={() => removeAssignedUser(user.id)}
                          className='hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5'
                        >
                          <X className='h-3 w-3' />
                        </button>
                      </div>
                    ))}

                    {/* Input Field */}
                    <input
                      ref={assigneeInputRef}
                      type='text'
                      value={assigneeInput}
                      onChange={(e) =>
                        handleAssigneeInputChange(e.target.value)
                      }
                      onKeyDown={handleAssigneeKeyDown}
                      placeholder={
                        assignedUsers.length === 0
                          ? 'Type @ to mention users'
                          : ''
                      }
                      className='flex-1 min-w-[120px] bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400'
                    />
                  </div>

                  {/* Autocomplete Dropdown */}
                  {showAssigneeDropdown && filteredUsers.length > 0 && (
                    <div className='absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto'>
                      {filteredUsers.slice(0, 6).map((user) => (
                        <button
                          key={user.id}
                          type='button'
                          onClick={() => addAssignedUser(user)}
                          className='w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0'
                        >
                          <div className='w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 text-sm font-medium'>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                              {user.name}
                            </p>
                            <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                              {user.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* CC Field */}
              <FormField
                control={form.control}
                name='cc'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                      CC (Email addresses)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='email1@example.com, email2@example.com'
                        {...field}
                        className='h-10'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Attachments */}
              <div className='space-y-3'>
                <FormLabel className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                  Attachments
                </FormLabel>

                {/* File Upload Button */}
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      document.getElementById('file-upload')?.click()
                    }
                    className='hover:bg-gray-50 dark:hover:bg-gray-700'
                  >
                    <Paperclip className='h-4 w-4 mr-2' />
                    Add Files
                  </Button>
                  <span className='text-xs text-gray-500 dark:text-gray-400'>
                    Max 10MB per file
                  </span>
                </div>

                <input
                  id='file-upload'
                  type='file'
                  multiple
                  className='hidden'
                  onChange={handleFileUpload}
                  accept='image/*,.pdf,.doc,.docx,.txt'
                />

                {/* Attachment List */}
                {attachments.length > 0 && (
                  <div className='space-y-2'>
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className='flex items-center gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600'
                      >
                        <div className='flex items-center justify-center w-8 h-8 rounded bg-gray-100 dark:bg-gray-600'>
                          {getFileIcon(file)}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                            {file.name}
                          </p>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => removeAttachment(index)}
                          className='shrink-0 hover:bg-gray-200 dark:hover:bg-gray-600'
                        >
                          <X className='h-4 w-4' />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className='flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700'>
                <Button
                  type='submit'
                  disabled={isSubmitting}
                  className='bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700'
                >
                  {isSubmitting ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <Send className='h-4 w-4 mr-2' />
                      Create Ticket
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

