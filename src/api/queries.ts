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

export function useCurrentUser() {
  return useQuery<{ user: UserSession | null }>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ user: UserSession }>('/api/auth/me');
        return res;
      } catch (err: any) {
        if (err.status === 401) {
          return { user: null };
        }
        throw err;
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
    mutationFn: (credentials: { email: string; password: string }) =>
      apiRequest<{ user: UserSession }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['currentUser'], { user: data.user });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest('/api/auth/logout', { method: 'POST' }),
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

