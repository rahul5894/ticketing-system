'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Badge } from '@/features/shared/components/ui/badge';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

interface UserAutocompleteProps {
  value?: string[] | string;
  onChange?: (value: string[] | string) => void;
  placeholder?: string;
  roleFilter?: string | string[];
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  dropdownOnly?: boolean;
}

export function UserAutocomplete({
  value,
  onChange,
  placeholder = 'Type email to search users...',
  roleFilter,
  multiple = true,
  disabled = false,
  className,
  error,
  dropdownOnly = false,
}: UserAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const normalizedValue = useMemo(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value]
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search users with debouncing
  const searchUsers = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 3) {
        setUsers([]);
        setIsLoading(false);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setHasSearched(false);

      try {
        // Build query parameters
        const params = new URLSearchParams({
          q: searchQuery,
          limit: '10',
        });

        // Add role filters to the API call
        if (roleFilter) {
          const allowedRoles = Array.isArray(roleFilter)
            ? roleFilter
            : [roleFilter];
          allowedRoles.forEach((role) => params.append('role', role));
        }

        const response = await fetch(`/api/users/search?${params.toString()}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Search failed');
        }

        const data = await response.json();
        const users = data.users || [];

        setUsers(users);
        setHasSearched(true);
      } catch {
        setUsers([]);
        setHasSearched(true);
      } finally {
        setIsLoading(false);
      }
    },
    [roleFilter]
  );

  // Handle input change with debouncing
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setQuery(newQuery);

      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Only open dropdown if we have 3+ characters, but don't close it immediately
      if (newQuery.length >= 3) {
        setIsOpen(true);
        setIsLoading(true); // Show loading immediately for better UX

        debounceRef.current = setTimeout(() => {
          searchUsers(newQuery);
        }, 250); // Reduced debounce for faster response
      } else {
        setIsOpen(false);
        setUsers([]);
        setIsLoading(false);
        setHasSearched(false);
      }
    },
    [searchUsers]
  );

  // Handle user selection
  const handleUserSelect = useCallback(
    (user: User) => {
      if (multiple) {
        if (!selectedUsers.find((u) => u.id === user.id)) {
          const newSelected = [...selectedUsers, user];
          setSelectedUsers(newSelected);
          onChange?.(newSelected.map((u) => u.email));
        }
        setQuery('');
        setIsOpen(false);
      } else {
        // Single select mode - immediately show selected user
        setSelectedUsers([user]);
        onChange?.(user.email);
        setQuery(''); // Clear the search query
        setIsOpen(false);
        setUsers([]);
        setHasSearched(false);
      }
    },
    [multiple, selectedUsers, onChange]
  );

  // Handle user removal
  const handleUserRemove = useCallback(
    (userId: string) => {
      const newSelected = selectedUsers.filter((u) => u.id !== userId);
      setSelectedUsers(newSelected);

      if (multiple) {
        onChange?.(newSelected.map((u) => u.email));
      } else {
        // For single select, clear everything
        onChange?.('');
        setQuery('');
        setIsOpen(false);
        setUsers([]);
        setHasSearched(false);
      }
    },
    [selectedUsers, multiple, onChange]
  );

  // Initialize selected users from value
  useEffect(() => {
    if (normalizedValue.length > 0 && selectedUsers.length === 0) {
      const users = normalizedValue.map((email: string) => ({
        id: email,
        email,
        name: email.split('@')[0] || email,
        role: 'user',
        status: 'active',
      }));
      setSelectedUsers(users);
    }
  }, [normalizedValue, selectedUsers.length]);

  // Validate email format
  const isValidEmail = useCallback((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  // Handle manual email entry for CC field
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        (e.key === 'Enter' || e.key === ' ') &&
        query &&
        multiple &&
        !dropdownOnly
      ) {
        e.preventDefault();
        const email = query.trim();
        if (
          isValidEmail(email) &&
          !selectedUsers.find((u) => u.email === email)
        ) {
          const newUser = {
            id: email,
            email,
            name: email.split('@')[0] || email,
            role: 'manual',
            status: 'active',
          };
          const newSelected = [...selectedUsers, newUser];
          setSelectedUsers(newSelected);
          onChange?.(newSelected.map((u) => u.email));
          setQuery('');
          setIsOpen(false);
          setUsers([]);
          setHasSearched(false);
        }
      }
    },
    [query, multiple, dropdownOnly, selectedUsers, onChange, isValidEmail]
  );

  return (
    <div className={cn('relative', className)}>
      {/* Input field with inline tags for multiple mode */}
      <div className='relative'>
        {multiple ? (
          // Multi-select input with inline tags
          <div
            className={cn(
              'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex min-h-10 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-within:border-ring',
              error && 'aria-invalid:border-destructive',
              'flex-wrap gap-1 items-center'
            )}
            onClick={() => inputRef.current?.focus()}
          >
            {/* Selected user tags inside the input */}
            {selectedUsers.map((user) => (
              <Badge
                key={user.id}
                variant='secondary'
                className='flex items-center gap-1 text-xs h-6'
              >
                {user.email}
                <button
                  type='button'
                  className='ml-1 p-0.5 hover:bg-gray-300 rounded-full transition-colors'
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUserRemove(user.id);
                  }}
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            ))}

            {/* Input field */}
            <input
              ref={inputRef}
              type='text'
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                // Only open dropdown if we have 3+ characters and have searched
                if (query.length >= 3 && hasSearched) {
                  setIsOpen(true);
                }
              }}
              onBlur={() => setTimeout(() => setIsOpen(false), 200)}
              placeholder={selectedUsers.length === 0 ? placeholder : ''}
              disabled={disabled}
              className='flex-1 min-w-0 bg-transparent border-0 outline-none text-base md:text-sm placeholder:text-muted-foreground'
            />

            {isLoading && (
              <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
            )}
          </div>
        ) : (
          // Single select input
          <div className='relative'>
            {selectedUsers.length > 0 ? (
              // Show selected user with close button
              <div
                className={cn(
                  'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-10 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring',
                  error && 'aria-invalid:border-destructive',
                  'items-center justify-between'
                )}
              >
                <span className='text-gray-900 dark:text-gray-100'>
                  {selectedUsers[0]?.email}
                </span>
                <X
                  className='h-4 w-4 cursor-pointer hover:bg-gray-300 rounded-full text-gray-500 hover:text-gray-700'
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUserRemove(selectedUsers[0]?.id || '');
                  }}
                />
              </div>
            ) : (
              // Show search input
              <input
                ref={inputRef}
                type='text'
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  // Only open dropdown if we have 3+ characters and have searched
                  if (query.length >= 3 && hasSearched) {
                    setIsOpen(true);
                  }
                }}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-10 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring',
                  error && 'aria-invalid:border-destructive'
                )}
              />
            )}
            {isLoading && (
              <Loader2 className='absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin' />
            )}
          </div>
        )}
      </div>

      {/* Dropdown - only show when we have 3+ characters and have searched */}
      {isOpen && query.length >= 3 && (
        <div className='absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-input rounded-md shadow-lg max-h-60 overflow-auto'>
          {isLoading ? (
            <div className='px-3 py-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Searching...
            </div>
          ) : users.length > 0 ? (
            users.map((user) => (
              <div
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className='px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between'
              >
                <div>
                  <div className='font-medium text-gray-900 dark:text-gray-100'>
                    {user.name}
                  </div>
                  <div className='text-sm text-gray-500 dark:text-gray-400'>
                    {user.email}
                  </div>
                </div>
                <Badge variant='outline' className='text-xs'>
                  {user.role}
                </Badge>
              </div>
            ))
          ) : hasSearched ? (
            <div className='px-3 py-2 text-sm text-gray-500 dark:text-gray-400'>
              No users found matching &ldquo;{query}&rdquo;
            </div>
          ) : null}
        </div>
      )}

      {/* Error message */}
      {error && <p className='mt-1 text-sm text-red-600'>{error}</p>}
    </div>
  );
}

