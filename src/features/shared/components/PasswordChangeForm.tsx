'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Eye, EyeOff, Lock, CheckCircle, XCircle } from 'lucide-react';

interface PasswordChangeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PasswordChangeForm({
  onSuccess,
  onCancel,
}: PasswordChangeFormProps) {
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isValid:
        minLength &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumbers &&
        hasSpecialChar,
    };
  };

  const passwordValidation = validatePassword(newPassword);
  const passwordsMatch =
    newPassword === confirmPassword && confirmPassword !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('User not found');
      return;
    }

    if (!passwordValidation.isValid) {
      setError('Password does not meet requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
      });

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err: unknown) {
      const error = err as { errors?: { message: string }[] };
      setError(error.errors?.[0]?.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className='w-full max-w-md mx-auto'>
        <CardContent className='pt-6'>
          <div className='text-center'>
            <CheckCircle className='w-12 h-12 text-green-500 mx-auto mb-4' />
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              Password Updated Successfully
            </h3>
            <p className='text-gray-600'>
              Your password has been changed successfully.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='w-full max-w-md mx-auto'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Lock className='w-5 h-5' />
          Change Password
        </CardTitle>
        <CardDescription>
          Update your password to keep your account secure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-4'>
          {error && (
            <Alert variant='destructive'>
              <XCircle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current Password */}
          <div className='space-y-2'>
            <Label htmlFor='currentPassword'>Current Password</Label>
            <div className='relative'>
              <Input
                id='currentPassword'
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder='Enter your current password'
                required
                className='pr-10'
              />
              <button
                type='button'
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700'
              >
                {showCurrentPassword ? (
                  <EyeOff className='w-4 h-4' />
                ) : (
                  <Eye className='w-4 h-4' />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className='space-y-2'>
            <Label htmlFor='newPassword'>New Password</Label>
            <div className='relative'>
              <Input
                id='newPassword'
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder='Enter your new password'
                required
                className='pr-10'
              />
              <button
                type='button'
                onClick={() => setShowNewPassword(!showNewPassword)}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700'
              >
                {showNewPassword ? (
                  <EyeOff className='w-4 h-4' />
                ) : (
                  <Eye className='w-4 h-4' />
                )}
              </button>
            </div>

            {/* Password Requirements */}
            {newPassword && (
              <div className='text-xs space-y-1'>
                <div
                  className={`flex items-center gap-1 ${
                    passwordValidation.minLength
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {passwordValidation.minLength ? (
                    <CheckCircle className='w-3 h-3' />
                  ) : (
                    <XCircle className='w-3 h-3' />
                  )}
                  At least 8 characters
                </div>
                <div
                  className={`flex items-center gap-1 ${
                    passwordValidation.hasUpperCase
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {passwordValidation.hasUpperCase ? (
                    <CheckCircle className='w-3 h-3' />
                  ) : (
                    <XCircle className='w-3 h-3' />
                  )}
                  One uppercase letter
                </div>
                <div
                  className={`flex items-center gap-1 ${
                    passwordValidation.hasLowerCase
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {passwordValidation.hasLowerCase ? (
                    <CheckCircle className='w-3 h-3' />
                  ) : (
                    <XCircle className='w-3 h-3' />
                  )}
                  One lowercase letter
                </div>
                <div
                  className={`flex items-center gap-1 ${
                    passwordValidation.hasNumbers
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {passwordValidation.hasNumbers ? (
                    <CheckCircle className='w-3 h-3' />
                  ) : (
                    <XCircle className='w-3 h-3' />
                  )}
                  One number
                </div>
                <div
                  className={`flex items-center gap-1 ${
                    passwordValidation.hasSpecialChar
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {passwordValidation.hasSpecialChar ? (
                    <CheckCircle className='w-3 h-3' />
                  ) : (
                    <XCircle className='w-3 h-3' />
                  )}
                  One special character
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className='space-y-2'>
            <Label htmlFor='confirmPassword'>Confirm New Password</Label>
            <div className='relative'>
              <Input
                id='confirmPassword'
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder='Confirm your new password'
                required
                className='pr-10'
              />
              <button
                type='button'
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700'
              >
                {showConfirmPassword ? (
                  <EyeOff className='w-4 h-4' />
                ) : (
                  <Eye className='w-4 h-4' />
                )}
              </button>
            </div>

            {confirmPassword && (
              <div
                className={`text-xs flex items-center gap-1 ${
                  passwordsMatch ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {passwordsMatch ? (
                  <CheckCircle className='w-3 h-3' />
                ) : (
                  <XCircle className='w-3 h-3' />
                )}
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className='flex gap-3 pt-4'>
            <Button
              type='submit'
              disabled={
                isLoading || !passwordValidation.isValid || !passwordsMatch
              }
              className='flex-1'
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>
            {onCancel && (
              <Button type='button' variant='outline' onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

