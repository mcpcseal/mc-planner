import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { nanoid } from 'nanoid'
import { supabase } from '../lib/supabase'
import type { Project, ProjectInsert } from '../types'

const QUERY_KEY = ['projects']

async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export function useProjects() {
  const queryClient = useQueryClient()

  const query = useQuery({ queryKey: QUERY_KEY, queryFn: fetchProjects })

  useEffect(() => {
    const channel = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  const createProject = useMutation({
    mutationFn: async (input: ProjectInsert) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...input, id: nanoid(11) })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const updateProject = useMutation({
    mutationFn: async ({ id, ...input }: Partial<ProjectInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  return { query, createProject, updateProject, deleteProject }
}
