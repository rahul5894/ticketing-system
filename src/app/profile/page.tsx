'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Camera, Save, X } from 'lucide-react';
import { useAuth } from '@/domains/auth/hooks/useAuth';
import { AuthenticatedOnly } from '@/domains/auth/components/RoleGuard';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, isLoading, error } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const handleSave = async () => {
    // TODO: Implement profile update
    console.log('Saving profile:', formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
    });
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'support':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  return (
    <AuthenticatedOnly
      fallback={
        <div className='flex items-center justify-center min-h-screen'>
          <Card className='w-full max-w-md'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <AlertCircle className='h-5 w-5 text-amber-500' />
                Authentication Required
              </CardTitle>
              <CardDescription>
                Please sign in to view your profile.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <div className='container mx-auto py-8 px-4 max-w-4xl'>
        <div className='space-y-6'>
          {/* Header */}
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
                Profile Settings
              </h1>
              <p className='text-gray-600 dark:text-gray-400'>
                Manage your account settings and preferences
              </p>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            ) : (
              <div className='flex gap-2'>
                <Button variant='outline' onClick={handleCancel}>
                  <X className='h-4 w-4 mr-2' />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className='h-4 w-4 mr-2' />
                  Save Changes
                </Button>
              </div>
            )}
          </div>

          {error && (
            <Card className='border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'>
              <CardContent className='pt-6'>
                <div className='flex items-center gap-2 text-red-800 dark:text-red-200'>
                  <AlertCircle className='h-4 w-4' />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue='general' className='space-y-6'>
            <TabsList>
              <TabsTrigger value='general'>General</TabsTrigger>
              <TabsTrigger value='security'>Security</TabsTrigger>
              <TabsTrigger value='preferences'>Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value='general' className='space-y-6'>
              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and profile picture
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                  {/* Avatar Section */}
                  <div className='flex items-center gap-6'>
                    <div className='relative'>
                      <Avatar className='h-20 w-20'>
                        <AvatarImage src={user?.avatarUrl} />
                        <AvatarFallback className='bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-lg font-medium'>
                          {user?.name ? getInitials(user.name) : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {isEditing && (
                        <Button
                          size='sm'
                          variant='outline'
                          className='absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0'
                        >
                          <Camera className='h-4 w-4' />
                        </Button>
                      )}
                    </div>
                    <div className='space-y-2'>
                      <div className='flex items-center gap-2'>
                        <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                          {user?.name}
                        </h3>
                        <Badge className={getRoleColor(user?.role || 'user')}>
                          {(user?.role || 'user').charAt(0).toUpperCase() +
                            (user?.role || 'user').slice(1)}
                        </Badge>
                      </div>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Form Fields */}
                  <div className='grid gap-4'>
                    <div className='grid gap-2'>
                      <Label htmlFor='name'>Full Name</Label>
                      <Input
                        id='name'
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                    <div className='grid gap-2'>
                      <Label htmlFor='email'>Email Address</Label>
                      <Input
                        id='email'
                        type='email'
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    View your account details and status
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <Label className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        User ID
                      </Label>
                      <p className='text-sm font-mono text-gray-900 dark:text-gray-100'>
                        {user?.id}
                      </p>
                    </div>
                    <div>
                      <Label className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        Account Created
                      </Label>
                      <p className='text-sm text-gray-900 dark:text-gray-100'>
                        {user?.createdAt
                          ? format(new Date(user.createdAt), 'PPP')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        Last Updated
                      </Label>
                      <p className='text-sm text-gray-900 dark:text-gray-100'>
                        {user?.updatedAt
                          ? format(new Date(user.updatedAt), 'PPP')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        Role
                      </Label>
                      <div className='mt-1'>
                        <Badge className={getRoleColor(user?.role || 'user')}>
                          {(user?.role || 'user').charAt(0).toUpperCase() +
                            (user?.role || 'user').slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='security' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your account security and authentication
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Security settings are managed through Clerk. Please visit
                    your account settings to update your password, enable
                    two-factor authentication, or manage connected accounts.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='preferences' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>
                    Customize your application experience
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Preference settings will be available in future updates.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthenticatedOnly>
  );
}

