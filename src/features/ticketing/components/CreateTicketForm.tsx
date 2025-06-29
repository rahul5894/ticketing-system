'use client';

import { useState, useRef, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUser } from '@clerk/nextjs';

import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/shared/components/ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
} from '@/features/shared/components/ui/form';
import { UserAutocomplete } from '@/features/shared/components';
import { RichTextEditor } from '@/features/shared/components/RichTextEditor';
import {
  FileUpload,
  UploadedFile,
} from '@/features/shared/components/FileUpload';
import { cn } from '@/lib/utils';
import { Send, Trash2 } from 'lucide-react';
import { useDraftPersistence } from '../hooks/useDraftPersistence';

// Types will be inferred from Zod schema below

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
  assignedTo: z.string().optional(), // Single agent assignment
  cc: z.array(z.string()), // Multiple users for CC
  attachments: z.array(z.instanceof(File)),
});

// Infer the type from the schema to ensure consistency
export type CreateTicketFormData = z.infer<typeof CreateTicketFormSchema>;

const priorityConfig = {
  low: { color: 'bg-gray-500', label: 'Low Priority' },
  medium: { color: 'bg-yellow-500', label: 'Medium Priority' },
  high: { color: 'bg-red-500', label: 'High Priority' },
  urgent: { color: 'bg-red-700', label: 'Urgent Priority' },
} as const;

const departmentConfig = {
  sales: { color: 'bg-orange-500', label: 'Sales Department' },
  support: { color: 'bg-purple-500', label: 'Support Department' },
  marketing: { color: 'bg-pink-500', label: 'Marketing Department' },
  technical: { color: 'bg-blue-500', label: 'Technical Department' },
} as const;

const DropdownOption = ({
  config,
}: {
  config: { color: string; label: string };
}) => (
  <div className='flex items-center gap-2 text-xs'>
    <div className={cn('w-1.5 h-1.5 mr-1 rounded-full', config.color)} />
    {config.label}
  </div>
);

export function CreateTicketForm({
  onSubmit,
  onSuccess,
  tenantId,
  isSubmitting = false,
}: CreateTicketFormProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form setup
  const form = useForm<CreateTicketFormData>({
    resolver: zodResolver(CreateTicketFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'high',
      department: 'marketing',
      assignedTo: undefined, // Single agent assignment
      cc: [], // Multiple users for CC
      attachments: [],
    },
  });

  // Draft persistence
  const { clearDraft } = useDraftPersistence(form);

  // File upload trigger function
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = useCallback(
    async (data: CreateTicketFormData) => {
      if (!user) return;

      try {
        clearDraft();

        if (onSubmit) {
          const attachments = uploadedFiles.map((f) => f.file);
          onSubmit({ ...data, attachments });
          return;
        }

        const response = await fetch('/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            description: data.description,
            priority: data.priority,
            department: data.department,
            tenant_id: tenantId,
            assigned_to: data.assignedTo,
            cc: data.cc,
          }),
        });

        if (!response.ok) throw new Error('Failed to create ticket');

        const ticket = await response.json();
        form.reset();
        onSuccess?.(ticket.id);
      } catch (error) {
        console.error('Failed to create ticket:', error);
      }
    },
    [user, clearDraft, onSubmit, uploadedFiles, tenantId, form, onSuccess]
  );

  const handleDiscard = () => {
    // Clear draft and reset form
    clearDraft();
    setUploadedFiles([]);
    form.reset({
      title: '',
      description: '',
      priority: 'high',
      department: 'marketing',
      assignedTo: undefined,
      cc: [],
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
                          priorityConfig[field.value].color
                        )}
                      />
                      <SelectValue>
                        {field.value.charAt(0).toUpperCase() +
                          field.value.slice(1)}{' '}
                        Priority
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <DropdownOption config={config} />
                        </SelectItem>
                      ))}
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
                          departmentConfig[field.value].color
                        )}
                      />
                      <SelectValue>
                        {field.value.charAt(0).toUpperCase() +
                          field.value.slice(1)}{' '}
                        Department
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(departmentConfig).map(
                        ([value, config]) => (
                          <SelectItem key={value} value={value}>
                            <DropdownOption config={config} />
                          </SelectItem>
                        )
                      )}
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
                {/* Assign To Field - Admins and Agents */}
                <FormField
                  control={form.control}
                  name='assignedTo'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        Assign To (Admins & Agents)
                      </FormLabel>
                      <UserAutocomplete
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder='Select user to assign...'
                        roleFilter={['admin', 'agent']}
                        multiple={false}
                        dropdownOnly={true}
                        className='h-10 no-focus-ring'
                      />
                    </FormItem>
                  )}
                />

                {/* CC Field - Admins and Agents */}
                <FormField
                  control={form.control}
                  name='cc'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        CC
                      </FormLabel>
                      <UserAutocomplete
                        value={field.value || []}
                        onChange={field.onChange}
                        placeholder='Type email to search users or enter email...'
                        roleFilter={['admin', 'agent']}
                        multiple={true}
                        className='h-10 no-focus-ring'
                      />
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
                      <Input
                        placeholder='Brief description of the issue'
                        className='h-10'
                        {...field}
                      />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        </div>

        {/* Rich Text Editor Section */}
        <div className='border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0'>
          <div className='p-6'>
            <div className='space-y-4'>
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder='Describe the issue in detail...'
                      disabled={isSubmitting}
                      onAttachClick={handleAttachClick}
                    />
                  </FormItem>
                )}
              />

              {/* File Upload */}
              <FileUpload
                files={uploadedFiles}
                onFilesChange={setUploadedFiles}
                disabled={isSubmitting}
                fileInputRef={fileInputRef}
              />

              {/* Submit buttons */}
              <div className='flex items-center justify-end gap-2'>
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
                  disabled={isSubmitting}
                  onClick={form.handleSubmit(handleSubmit)}
                >
                  <Send className='h-4 w-4 mr-1' />
                  {isSubmitting ? 'Creating...' : 'Create Ticket'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
