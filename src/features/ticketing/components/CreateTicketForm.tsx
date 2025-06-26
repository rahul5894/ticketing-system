'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUser } from '@clerk/nextjs';

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

import { Separator } from '@/features/shared/components/ui/separator';
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
  Trash2,
} from 'lucide-react';
import { useDraftPersistence } from '../hooks/useDraftPersistence';

// Types
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type Department = 'sales' | 'support' | 'marketing' | 'technical';

interface CreateTicketFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  department: Department;
  assignedTo: string[];
  cc?: string | undefined;
  attachments: File[];
}

interface CreateTicketFormProps {
  onSubmit?: (data: CreateTicketFormData & { attachments: File[] }) => void;
  onSuccess?: (ticketId: string) => void;
  tenantId: string;
  isSubmitting?: boolean;
}

// Form validation schema
const CreateTicketFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  department: z.enum(['sales', 'support', 'marketing', 'technical']),
  assignedTo: z.array(z.string()),
  cc: z.string().optional(),
  attachments: z.array(z.instanceof(File)),
});

// Dot colors for dropdowns (matching TicketDetail)
const priorityDotColors = {
  low: 'bg-gray-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
  urgent: 'bg-red-700',
};

const departmentDotColors = {
  sales: 'bg-orange-500',
  support: 'bg-purple-500',
  marketing: 'bg-pink-500',
  technical: 'bg-blue-500',
};

export function CreateTicketForm({
  onSubmit,
  onSuccess,
  tenantId,
  isSubmitting = false,
}: CreateTicketFormProps) {
  // State
  const [attachments] = useState<File[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useUser();

  // Form setup
  const form = useForm<CreateTicketFormData>({
    resolver: zodResolver(CreateTicketFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'high',
      department: 'marketing',
      assignedTo: [],
      cc: '',
      attachments: [],
    },
  });

  // Draft persistence
  const { clearDraft } = useDraftPersistence(form);

  // Handlers
  const handleSubmit = async (data: CreateTicketFormData) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    setIsCreating(true);

    try {
      // Clear draft before submitting
      clearDraft();

      // If legacy onSubmit is provided, use it (for backward compatibility)
      if (onSubmit) {
        onSubmit({ ...data, attachments });
        return;
      }

      // Otherwise, use the new API
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          priority: data.priority,
          department: data.department,
          tenant_id: tenantId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create ticket');
      }

      const ticket = await response.json();

      // Reset form
      form.reset();

      // Call success callback
      onSuccess?.(ticket.id);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      // TODO: Add proper error handling/toast notification
    } finally {
      setIsCreating(false);
    }
  };

  const handleDiscard = () => {
    // Clear draft and reset form
    clearDraft();
    form.reset({
      title: '',
      description: '',
      priority: 'high',
      department: 'marketing',
      assignedTo: [],
      cc: '',
      attachments: [],
    });
  };

  return (
    <div className='flex-1 h-[calc(100%-3rem)] my-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-auto'>
        {/* Header */}
        <div className='p-6 border-b border-gray-200 dark:border-gray-700 shrink-0'>
          <div className='flex items-center justify-between'>
            <h1 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
              Create New Ticket
            </h1>
            <div className='flex items-center gap-2'>
              {/* Priority Dropdown */}
              <FormField
                control={form.control}
                name='priority'
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      className={cn(
                        'inline-flex items-center justify-center rounded-md h-6 px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition-[color,box-shadow] overflow-hidden',
                        'border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                        'hover:opacity-80 cursor-pointer'
                      )}
                    >
                      <div
                        className={cn(
                          'w-1.5 h-1.5 rounded-full mr-1',
                          priorityDotColors[field.value]
                        )}
                      />
                      <SelectValue>
                        {field.value.charAt(0).toUpperCase() +
                          field.value.slice(1)}{' '}
                        Priority
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='low'>
                        <div className='flex items-center gap-2 text-xs'>
                          <div className='w-1.5 h-1.5 rounded-full mr-1 bg-gray-500' />
                          Low Priority
                        </div>
                      </SelectItem>
                      <SelectItem value='medium'>
                        <div className='flex items-center gap-2 text-xs'>
                          <div className='w-1.5 h-1.5 rounded-full mr-1 bg-yellow-500' />
                          Medium Priority
                        </div>
                      </SelectItem>
                      <SelectItem value='high'>
                        <div className='flex items-center gap-2 text-xs'>
                          <div className='w-1.5 h-1.5 rounded-full mr-1 bg-red-500' />
                          High Priority
                        </div>
                      </SelectItem>
                      <SelectItem value='urgent'>
                        <div className='flex items-center gap-2 text-xs'>
                          <div className='w-1.5 h-1.5 rounded-full mr-1 bg-red-700' />
                          Urgent Priority
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />

              {/* Department Dropdown */}
              <FormField
                control={form.control}
                name='department'
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      className={cn(
                        'inline-flex items-center justify-center rounded-md h-6 px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition-[color,box-shadow] overflow-hidden',
                        'border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                        'hover:opacity-80 cursor-pointer'
                      )}
                    >
                      <div
                        className={cn(
                          'w-1.5 h-1.5 mr-1 rounded-full',
                          departmentDotColors[field.value]
                        )}
                      />
                      <SelectValue>
                        {field.value.charAt(0).toUpperCase() +
                          field.value.slice(1)}{' '}
                        Department
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='sales'>
                        <div className='flex items-center gap-2 text-xs'>
                          <div className='w-1.5 h-1.5 mr-1 rounded-full bg-orange-500' />
                          Sales Department
                        </div>
                      </SelectItem>
                      <SelectItem value='support'>
                        <div className='flex items-center gap-2 text-xs'>
                          <div className='w-1.5 h-1.5 mr-1 rounded-full bg-purple-500' />
                          Support Department
                        </div>
                      </SelectItem>
                      <SelectItem value='marketing'>
                        <div className='flex items-center gap-2 text-xs'>
                          <div className='w-1.5 h-1.5 mr-1 rounded-full bg-pink-500' />
                          Marketing Department
                        </div>
                      </SelectItem>
                      <SelectItem value='technical'>
                        <div className='flex items-center gap-2 text-xs'>
                          <div className='w-1.5 h-1.5 mr-1 rounded-full bg-blue-500' />
                          Technical Department
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </div>

        {/* Form Content - Scrollable */}
        <div className='flex-1 overflow-y-auto min-h-0'>
          <div className='p-6'>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className='space-y-4'
              >
                {/* Assign To Field */}
                <div>
                  <label className='text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2'>
                    Assign To
                  </label>
                  <Input
                    placeholder='Type @ to mention users'
                    className='h-10'
                  />
                </div>

                {/* CC Field */}
                <FormField
                  control={form.control}
                  name='cc'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        CC (Email addresses)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='email1@example.com, email2@example.com'
                          className='h-10'
                          value={field.value || ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Title Field */}
                <FormField
                  control={form.control}
                  name='title'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        Title *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Brief description of the issue'
                          className='h-10'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        </div>

        {/* Rich Text Editor Section - Fixed at bottom (matching TicketDetail) */}
        <div className='border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0'>
          <div className='p-6'>
            <div className='space-y-4'>
              {/* Clean two-line formatting toolbar (exactly like TicketDetail) */}
              <div className='space-y-2'>
                {/* First line - Paragraph selector and text formatting */}
                <div className='flex items-center gap-1'>
                  <Select defaultValue='paragraph'>
                    <SelectTrigger className='w-32 h-8'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='paragraph'>Paragraph</SelectItem>
                      <SelectItem value='heading1'>Heading 1</SelectItem>
                      <SelectItem value='heading2'>Heading 2</SelectItem>
                    </SelectContent>
                  </Select>

                  <Separator orientation='vertical' className='h-6 mx-1' />

                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
                  >
                    <Bold className='h-4 w-4' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
                  >
                    <Italic className='h-4 w-4' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
                  >
                    <Underline className='h-4 w-4' />
                  </Button>

                  <Separator orientation='vertical' className='h-6 mx-1' />

                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
                  >
                    <AlignLeft className='h-4 w-4' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
                  >
                    <AlignCenter className='h-4 w-4' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
                  >
                    <AlignRight className='h-4 w-4' />
                  </Button>

                  <Separator orientation='vertical' className='h-6 mx-1' />

                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
                  >
                    <List className='h-4 w-4' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
                  >
                    <ListOrdered className='h-4 w-4' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700'
                  >
                    <Link className='h-4 w-4' />
                  </Button>
                </div>
              </div>

              {/* Text area (exactly like TicketDetail) */}
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder='Describe the issue in detail...'
                    className='min-h-32 resize-none border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                  />
                )}
              />

              {/* Action buttons (exactly like TicketDetail) */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='hover:bg-gray-100 dark:hover:bg-gray-700'
                  >
                    <Paperclip className='h-4 w-4' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='hover:bg-gray-100 dark:hover:bg-gray-700'
                  >
                    <Smile className='h-4 w-4' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='hover:bg-gray-100 dark:hover:bg-gray-700'
                  >
                    <AtSign className='h-4 w-4' />
                  </Button>
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleDiscard}
                    disabled={isSubmitting}
                  >
                    <Trash2 className='h-4 w-4 mr-1' />
                    Discard
                  </Button>
                  <Button
                    type='submit'
                    disabled={isSubmitting || isCreating}
                    onClick={form.handleSubmit(handleSubmit)}
                  >
                    <Send className='h-4 w-4 mr-1' />
                    {isSubmitting || isCreating
                      ? 'Creating...'
                      : 'Create Ticket'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
