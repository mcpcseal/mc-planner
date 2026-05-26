import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Material, MaterialInsert } from '../types'

function queryKey(projectId: string) {
  return ['materials', projectId]
}

export function useMaterials(projectId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKey(projectId),
    queryFn: async (): Promise<Material[]> => {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('project_id', projectId)
        .order('position')
      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })

  useEffect(() => {
    const channel = supabase
      .channel(`materials-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'materials', filter: `project_id=eq.${projectId}` },
        (payload) => {
          queryClient.setQueryData<Material[]>(queryKey(projectId), (prev = []) => {
            if (payload.eventType === 'INSERT') {
              if (prev.some(m => m.id === payload.new.id)) return prev
              return [...prev, payload.new as Material]
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(m => m.id === payload.new.id ? payload.new as Material : m)
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter(m => m.id !== payload.old.id)
            }
            return prev
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [projectId, queryClient])

  const addMaterial = useMutation({
    mutationFn: async (input: MaterialInsert) => {
      const currentMaterials = queryClient.getQueryData<Material[]>(queryKey(projectId)) ?? []
      const position = input.position ?? currentMaterials.length
      const { data, error } = await supabase
        .from('materials')
        .insert({ ...input, position })
        .select()
        .single()
      if (error) throw error
      return data as Material
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData<Material[]>(queryKey(projectId), prev => [...(prev ?? []), newItem])
    },
  })

  const updateCount = useMutation({
    mutationFn: async ({ id, current_count }: { id: string; current_count: number }) => {
      const { data, error } = await supabase
        .from('materials')
        .update({ current_count, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Material
    },
    onMutate: async ({ id, current_count }) => {
      await queryClient.cancelQueries({ queryKey: queryKey(projectId) })
      const prev = queryClient.getQueryData<Material[]>(queryKey(projectId))
      queryClient.setQueryData<Material[]>(queryKey(projectId), old =>
        old?.map(m => m.id === id ? { ...m, current_count } : m) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey(projectId), ctx.prev)
    },
  })

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('materials').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Material[]>(queryKey(projectId), prev =>
        prev?.filter(m => m.id !== id) ?? []
      )
    },
  })

  const updateMaterial = useMutation({
    mutationFn: async ({ id, name, required_count, image_url }: { id: string; name: string; required_count: number; image_url: string | null }) => {
      const { data, error } = await supabase
        .from('materials')
        .update({ name, required_count, image_url, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Material
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Material[]>(queryKey(projectId), prev =>
        prev?.map(m => m.id === updated.id ? updated : m) ?? []
      )
    },
  })

  const reorderMaterials = useMutation({
    mutationFn: async (updates: { id: string; position: number }[]) => {
      const { error } = await supabase
        .from('materials')
        .upsert(updates, { onConflict: 'id' })
      if (error) throw error
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: queryKey(projectId) })
      const prev = queryClient.getQueryData<Material[]>(queryKey(projectId))
      const posMap = new Map(updates.map(u => [u.id, u.position]))
      queryClient.setQueryData<Material[]>(queryKey(projectId), old =>
        old?.map(m => posMap.has(m.id) ? { ...m, position: posMap.get(m.id)! } : m) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey(projectId), ctx.prev)
    },
  })

  return { query, addMaterial, updateCount, updateMaterial, deleteMaterial, reorderMaterials }
}
