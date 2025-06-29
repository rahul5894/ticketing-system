'use client';

import { useState, useCallback, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

interface UseUserSearchOptions {
  roleFilter?: string;
  limit?: number;
}

interface UseUserSearchReturn {
  users: User[];
  isLoading: boolean;
  error: string | null;
  searchUsers: (query: string) => Promise<void>;
  clearUsers: () => void;
}

export function useUserSearch(
  options: UseUserSearchOptions = {}
): UseUserSearchReturn {
  const { roleFilter, limit = 10 } = options;
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchUsers = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setUsers([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: query,
          limit: limit.toString(),
        });

        if (roleFilter) {
          params.append('role', roleFilter);
        }

        const response = await fetch(`/api/users/search?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to search users');
        }

        const data = await response.json();
        setUsers(data.users || []);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    },
    [roleFilter, limit]
  );

  const clearUsers = useCallback(() => {
    setUsers([]);
    setError(null);
  }, []);

  return {
    users,
    isLoading,
    error,
    searchUsers,
    clearUsers,
  };
}

/**
 * Hook for getting user details by IDs
 */
export function useUserDetails(userIds: string[]) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setUsers([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userPromises = ids.map(async (id) => {
        const response = await fetch(`/api/users/search?q=${id}&limit=1`);
        if (!response.ok) throw new Error('Failed to fetch user details');
        const data = await response.json();
        return data.users.find((u: User) => u.id === id);
      });

      const userResults = await Promise.all(userPromises);
      setUsers(userResults.filter(Boolean) as User[]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load users when userIds change
  useEffect(() => {
    loadUsers(userIds);
  }, [userIds, loadUsers]);

  return {
    users,
    isLoading,
    error,
    loadUsers,
  };
}

