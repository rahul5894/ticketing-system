'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/features/shared/components/ui/button';
import { Badge } from '@/features/shared/components/ui/badge';
import { X, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// LRU Cache for search results
class SearchCache {
  private cache = new Map<string, { users: User[]; timestamp: number }>();
  private maxSize = 50;
  private maxAge = 5 * 60 * 1000; // 5 minutes

  get(key: string): User[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.users;
  }

  set(key: string, users: User[]): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { users, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const searchCache = new SearchCache();

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

interface UserAutocompleteProps {
  value?: string[] | string | undefined;
  onChange?: (value: string[] | string | undefined) => void;
  placeholder?: string;
  roleFilter?: string; // Filter by specific role (e.g., 'agent')
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
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
}: UserAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);

  // Normalize value to always be an array for internal processing (memoized to prevent infinite loops)
  const normalizedValue = useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : [];
  }, [value]);

  // Get the display value for the input field
  const inputDisplayValue = useMemo(() => {
    if (multiple) {
      // For multi-select, always show the search query
      return query;
    } else {
      // For single-select, only show selected user's email if not actively typing
      if (selectedUsers.length > 0 && query === '' && !isTyping) {
        return selectedUsers[0]?.email || '';
      }
      return query;
    }
  }, [multiple, selectedUsers, query, isTyping]);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Email validation regex
  const isCompleteEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  // Search users with caching and debouncing
  const searchUsers = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setUsers([]);
        setIsOpen(false);
        return;
      }

      // Don't show autocomplete for complete email addresses
      if (isCompleteEmail(searchQuery)) {
        setUsers([]);
        setIsOpen(false);
        return;
      }

      // Create cache key including role filter
      const cacheKey = `${searchQuery}:${roleFilter || 'all'}`;

      // Check cache first
      const cachedUsers = searchCache.get(cacheKey);
      if (cachedUsers) {
        // Filter out already selected users (for both single-select and multi-select)
        const filteredUsers = cachedUsers.filter(
          (user: User) => !normalizedValue.includes(user.id)
        );

        setUsers(filteredUsers);
        setIsOpen(filteredUsers.length > 0);
        setHighlightedIndex(-1);
        return;
      }

      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          q: searchQuery,
          limit: '10',
        });

        if (roleFilter) {
          params.append('role', roleFilter);
        }

        const response = await fetch(`/api/users/search?${params}`);

        if (!response.ok) {
          throw new Error('Failed to search users');
        }

        const data = await response.json();

        // Cache the raw results
        searchCache.set(cacheKey, data.users);

        // Filter out already selected users (for both single-select and multi-select)
        const filteredUsers = data.users.filter(
          (user: User) => !normalizedValue.includes(user.id)
        );

        setUsers(filteredUsers);
        setIsOpen(filteredUsers.length > 0);
        setHighlightedIndex(-1);
      } catch (error) {
        console.error('Error searching users:', error);
        setUsers([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    },
    [roleFilter, normalizedValue]
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchUsers(query);
      // Reset typing state after search completes
      if (query === '') {
        setIsTyping(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchUsers]);

  // Load selected users data (memoized to prevent infinite loops)
  const loadSelectedUsers = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) {
      setSelectedUsers([]);
      return;
    }

    // Only load users that we don't already have
    setSelectedUsers((prev) => {
      const existingIds = prev.map((u) => u.id);
      const missingIds = userIds.filter((id) => !existingIds.includes(id));

      if (missingIds.length === 0) {
        // Filter existing users to match current userIds
        return prev.filter((user) => userIds.includes(user.id));
      }

      // Load missing users asynchronously without blocking UI
      (async () => {
        try {
          const userPromises = missingIds.map(async (userId: string) => {
            const response = await fetch(`/api/users/search?q=${userId}`);
            const data = await response.json();
            return data.users.find((u: User) => u.id === userId);
          });

          const newUsers = await Promise.all(userPromises);
          const validNewUsers = newUsers.filter(Boolean);

          setSelectedUsers((current) => {
            const allUsers = [...current, ...validNewUsers];
            return allUsers.filter((user) => userIds.includes(user.id));
          });
        } catch (error) {
          console.error('Error loading selected users:', error);
        }
      })();

      // Return current users that match userIds
      return prev.filter((user) => userIds.includes(user.id));
    });
  }, []);

  // Load selected users when normalizedValue changes
  useEffect(() => {
    loadSelectedUsers(normalizedValue);
  }, [normalizedValue, loadSelectedUsers]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setIsTyping(true);

    // If user clears the field in single-select mode, clear the selection
    if (!multiple && newQuery === '' && normalizedValue.length > 0) {
      onChange?.(undefined);
    }
  };

  // Handle user selection
  const handleSelectUser = (user: User) => {
    // Immediately update selectedUsers to prevent delay
    if (multiple) {
      const newValue = [...normalizedValue, user.id];
      setSelectedUsers((prev) => [...prev, user]);
      onChange?.(newValue);
    } else {
      setSelectedUsers([user]);
      onChange?.(user.id); // Single value for single-select
    }

    setQuery('');
    setIsTyping(false);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Handle user removal
  const handleRemoveUser = (userId: string) => {
    // Immediately update selectedUsers to prevent delay
    setSelectedUsers((prev) => prev.filter((user) => user.id !== userId));

    if (multiple) {
      const newValue = normalizedValue.filter((id) => id !== userId);
      onChange?.(newValue);
    } else {
      onChange?.(undefined); // Clear single value
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < users.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && users[highlightedIndex]) {
          handleSelectUser(users[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'agent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'user':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Tag-based input container */}
      <div className='relative'>
        <div
          className={cn(
            'flex flex-wrap items-center gap-1 min-h-[2.25rem] w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow]',
            'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
            error &&
              'border-destructive focus-within:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
            disabled && 'cursor-not-allowed opacity-50 pointer-events-none'
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {/* Selected user tags (for multi-select) */}
          {multiple &&
            selectedUsers.map((user) => (
              <Badge
                key={user.id}
                variant='secondary'
                className='flex items-center gap-1 pr-1 bg-gray-100 text-gray-800 hover:bg-gray-200'
              >
                <User className='h-3 w-3' />
                <span className='text-xs'>{user.email}</span>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-4 w-4 p-0 hover:bg-gray-300 rounded-full'
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveUser(user.id);
                  }}
                  disabled={disabled}
                >
                  <X className='h-3 w-3' />
                </Button>
              </Badge>
            ))}

          {/* Input field */}
          <input
            ref={inputRef}
            value={inputDisplayValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              multiple && selectedUsers.length > 0 ? '' : placeholder
            }
            disabled={disabled}
            className='flex-1 min-w-[120px] bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground'
            role='combobox'
            aria-expanded={isOpen}
            aria-controls='user-suggestions'
            aria-haspopup='listbox'
            aria-autocomplete='list'
            aria-describedby={error ? 'error-message' : undefined}
          />

          {/* Loading indicator */}
          {isLoading && (
            <div className='flex-shrink-0'>
              <Loader2 className='h-4 w-4 animate-spin text-gray-400' />
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p
          id='error-message'
          className='text-sm text-red-600 dark:text-red-400 mt-1'
          role='alert'
        >
          {error}
        </p>
      )}

      {/* Dropdown */}
      {isOpen && users.length > 0 && (
        <div
          ref={dropdownRef}
          id='user-suggestions'
          className='absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto'
          role='listbox'
          aria-label='User suggestions'
        >
          {users.map((user, index) => (
            <button
              key={user.id}
              type='button'
              className={cn(
                'w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between',
                highlightedIndex === index && 'bg-gray-50 dark:bg-gray-700'
              )}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                handleSelectUser(user);
              }}
              role='option'
              aria-selected={highlightedIndex === index}
              aria-label={`Select ${user.name} (${user.email})`}
            >
              <div className='flex flex-col'>
                <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                  {user.name}
                </span>
                <span className='text-xs text-gray-500 dark:text-gray-400'>
                  {user.email}
                </span>
              </div>
              <Badge
                variant='outline'
                className={cn('text-xs', getRoleBadgeColor(user.role))}
              >
                {user.role}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

