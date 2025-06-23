'use client';

import { Button } from '@/features/shared/components/ui/button';
import { Separator } from '@/features/shared/components/ui/separator';
import { FileText, Image as ImageIcon, ExternalLink, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VisitorData {
  email: string;
  phone: string;
  location: string;
  localTime: string;
  language: string;
  ip: string;
  os: string;
  browser: string;
  files: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
    sharedDate: string;
  }>;
}

const mockVisitorData: VisitorData = {
  email: 'dean.taylor@gmail.com',
  phone: 'Unknown',
  location: 'Colombo',
  localTime: '06.30 am (+5.30 GMT)',
  language: 'English',
  ip: '107.116.91.201',
  os: 'Windows 10',
  browser: 'Mozilla Firefox',
  files: [
    {
      id: '1',
      name: 'image.jpg',
      type: 'image',
      size: '30 KB',
      sharedDate: 'Shared with Agent Lisa on May 25th',
    },
    {
      id: '2',
      name: 'doc.pdf',
      type: 'pdf',
      size: '29 KB',
      sharedDate: 'Shared with Agent Lisa on May 25th',
    },
    {
      id: '3',
      name: 'error-number.jpg',
      type: 'image',
      size: '45 KB',
      sharedDate: 'Shared with Agent Lisa on May 25th',
    },
  ],
};

function FileItem({ file }: { file: VisitorData['files'][0] }) {
  const isImage = file.type === 'image';
  const isPdf = file.type === 'pdf';

  return (
    <div className='flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer'>
      <div
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded',
          isPdf
            ? 'bg-red-100 dark:bg-red-900/20'
            : isImage
            ? 'bg-blue-100 dark:bg-blue-900/20'
            : 'bg-gray-100 dark:bg-gray-700'
        )}
      >
        {isPdf ? (
          <FileText className='h-4 w-4 text-red-600 dark:text-red-400' />
        ) : isImage ? (
          <ImageIcon className='h-4 w-4 text-blue-600 dark:text-blue-400' />
        ) : (
          <FileText className='h-4 w-4 text-gray-600 dark:text-gray-400' />
        )}
      </div>
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2'>
          <p className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
            {file.name}
          </p>
          <span className='text-xs text-gray-500 dark:text-gray-400 shrink-0'>
            {file.size}
          </span>
        </div>
        <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
          {file.sharedDate}
        </p>
      </div>
    </div>
  );
}

export function VisitorInformation() {
  return (
    <div className='w-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full flex flex-col shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50'>
      {/* Header */}
      <div className='p-6 border-b border-gray-200 dark:border-gray-700 shrink-0'>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
          Visitor Information
        </h2>
      </div>

      <div className='flex-1 p-6 space-y-6 overflow-y-auto min-h-0'>
        {/* Basic Details */}
        <div>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              Basic Details
            </h3>
            <Button
              variant='ghost'
              size='sm'
              className='text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
            >
              <Edit className='h-3 w-3 mr-1' />
              Edit
            </Button>
          </div>

          <div className='space-y-3'>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>
                Email
              </span>
              <a
                href={`mailto:${mockVisitorData.email}`}
                className='text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
              >
                {mockVisitorData.email}
              </a>
            </div>

            <div className='flex justify-between items-center'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>
                Phone
              </span>
              <span className='text-sm text-gray-900 dark:text-gray-100'>
                {mockVisitorData.phone}
              </span>
            </div>

            <div className='flex justify-between items-center'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>
                Location
              </span>
              <div className='flex items-center gap-1'>
                <span className='text-sm text-gray-900 dark:text-gray-100'>
                  {mockVisitorData.location}
                </span>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-4 w-4 p-0 text-blue-600 dark:text-blue-400'
                >
                  <ExternalLink className='h-3 w-3' />
                </Button>
              </div>
            </div>

            <div className='flex justify-between items-center'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>
                Local time
              </span>
              <span className='text-sm text-gray-900 dark:text-gray-100'>
                {mockVisitorData.localTime}
              </span>
            </div>

            <div className='flex justify-between items-center'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>
                Language
              </span>
              <span className='text-sm text-blue-600 dark:text-blue-400'>
                {mockVisitorData.language}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Device Info */}
        <div>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              Device Info
            </h3>
            <Button
              variant='ghost'
              size='sm'
              className='text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
            >
              <Edit className='h-3 w-3 mr-1' />
              Edit
            </Button>
          </div>

          <div className='space-y-3'>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>
                IP
              </span>
              <span className='text-sm text-gray-900 dark:text-gray-100'>
                {mockVisitorData.ip}
              </span>
            </div>

            <div className='flex justify-between items-center'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>
                OS
              </span>
              <span className='text-sm text-gray-900 dark:text-gray-100'>
                {mockVisitorData.os}
              </span>
            </div>

            <div className='flex justify-between items-center'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>
                Browser
              </span>
              <span className='text-sm text-gray-900 dark:text-gray-100'>
                {mockVisitorData.browser}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Files Shared */}
        <div className='flex flex-col min-h-0'>
          <h3 className='text-sm font-medium text-gray-900 dark:text-gray-100 mb-4 shrink-0'>
            Files Shared
          </h3>

          <div className='flex-1 overflow-y-auto min-h-0'>
            <div className='space-y-0'>
              {mockVisitorData.files.map((file) => (
                <FileItem key={file.id} file={file} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
