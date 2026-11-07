/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './client';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  title: string;
  role: 'ProjectManager' | 'SiteSupervisor' | 'FinanceManager' | 'SafetyOfficer' | 'Executive';
  memberships: Array<{ projectId: string; projectName: string; role: string }>;
}

export const DEMO_SESSIONS: Record<string, UserSession> = {
  'pm@constructiq.demo': {
    id: 'user-pm-001',
    email: 'pm@constructiq.demo',
    name: 'Rahul Sharma',
    title: 'Senior Project Manager',
    role: 'ProjectManager',
    memberships: [{ projectId: 'proj-demo-001', projectName: 'Skyline Metro Tower - Phase 2', role: 'ProjectManager' }],
  },
  'supervisor@constructiq.demo': {
    id: 'user-sup-002',
    email: 'supervisor@constructiq.demo',
    name: 'Priya Patel',
    title: 'Site Superintendent',
    role: 'SiteSupervisor',
    memberships: [{ projectId: 'proj-demo-001', projectName: 'Skyline Metro Tower - Phase 2', role: 'SiteSupervisor' }],
  },
  'finance@constructiq.demo': {
    id: 'user-fin-003',
    email: 'finance@constructiq.demo',
    name: 'Project Coordinator',
    title: 'Financial Controller',
    role: 'FinanceManager',
    memberships: [{ projectId: 'proj-demo-001', projectName: 'Skyline Metro Tower - Phase 2', role: 'FinanceManager' }],
  },
  'safety@constructiq.demo': {
    id: 'user-safe-004',
    email: 'safety@constructiq.demo',
    name: 'Vikram Singh',
    title: 'EHS Director',
    role: 'SafetyOfficer',
    memberships: [{ projectId: 'proj-demo-001', projectName: 'Skyline Metro Tower - Phase 2', role: 'SafetyOfficer' }],
  },
  'exec@constructiq.demo': {
    id: 'user-exec-005',
    email: 'exec@constructiq.demo',
    name: 'Neha Gupta',
    title: 'VP Operations',
    role: 'Executive',
    memberships: [{ projectId: 'proj-demo-001', projectName: 'Skyline Metro Tower - Phase 2', role: 'Executive' }],
  },
};

const DEMO_STORAGE_KEY = 'constructiq_demo_session';

export function useCurrentUser() {
  return useQuery<{ user: UserSession | null }>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ user: UserSession }>('/api/auth/me');
        return res;
      } catch (err: any) {
        if (err.status === 401) {
          localStorage.removeItem(DEMO_STORAGE_KEY);
          return { user: null };
        }
        const stored = localStorage.getItem(DEMO_STORAGE_KEY);
        if (stored) {
          try {
            const user = JSON.parse(stored) as UserSession;
            return { user };
          } catch {
            localStorage.removeItem(DEMO_STORAGE_KEY);
          }
        }
        return { user: null };
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => apiRequest<{ projects: any[] }>('/api/projects'),
  });
}

export function useProjectDetail(projectId: string | null) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiRequest<{ project: any }>(`/api/projects/${projectId}`),
    enabled: Boolean(projectId),
    refetchInterval: 10_000, // Sync background updates every 10 seconds
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const emailKey = credentials.email.trim().toLowerCase();
      const demoUser = DEMO_SESSIONS[emailKey];

      try {
        const data = await apiRequest<{ user: UserSession }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        });
        localStorage.removeItem(DEMO_STORAGE_KEY);
        return data;
      } catch (err: any) {
        const isOfflineOrUnavailable = !err.status || [404, 500, 502, 503, 504].includes(err.status);
        if (demoUser && isOfflineOrUnavailable) {
          if (!credentials.password || (credentials.password !== 'DemoPass123!' && err.status === 401)) {
            throw err;
          }
          localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoUser));
          return { user: demoUser };
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['currentUser'], { user: data.user });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      try {
        return await apiRequest('/api/auth/logout', { method: 'POST' });
      } catch {
        return { message: 'Logged out' };
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['currentUser'], { user: null });
      queryClient.clear();
    },
  });
}

export function useUpdateTaskProgressMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, progress, status, notes }: { id: string; progress: number; status: string; notes?: string }) =>
      apiRequest(`/api/tasks/${id}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({ progress, status, notes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useCreateTaskMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ ...payload, projectId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useDeleteTaskMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      apiRequest(`/api/tasks/${taskId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useCreateInvoiceMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({ ...payload, projectId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useUpdateInvoiceStatusMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      apiRequest(`/api/invoices/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useCreateIncidentMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiRequest('/api/incidents', {
        method: 'POST',
        body: JSON.stringify({ ...payload, projectId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useResolveIncidentMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actionTaken }: { id: string; actionTaken: string }) =>
      apiRequest(`/api/incidents/${id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ actionTaken }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useCreatePunchItemMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiRequest('/api/punch-items', {
        method: 'POST',
        body: JSON.stringify({ ...payload, projectId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useUpdatePunchStatusMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, resolutionNotes }: { id: string; status: string; resolutionNotes?: string }) =>
      apiRequest(`/api/punch-items/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, resolutionNotes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useClearCraneHaltMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest(`/api/projects/${projectId}/clear-crane-halt`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useAddLogMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { type: string; severity: 'info' | 'warning' | 'alert' | 'success'; message: string }) =>
      apiRequest('/api/logs', {
        method: 'POST',
        body: JSON.stringify({ ...payload, projectId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

