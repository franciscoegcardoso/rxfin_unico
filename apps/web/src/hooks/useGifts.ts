import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type RelationshipType = 
  | 'mother' 
  | 'father' 
  | 'spouse' 
  | 'partner' 
  | 'son' 
  | 'daughter' 
  | 'brother' 
  | 'sister' 
  | 'grandfather' 
  | 'grandmother' 
  | 'friend' 
  | 'coworker' 
  | 'other';

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  mother: 'Mãe',
  father: 'Pai',
  spouse: 'Cônjuge',
  partner: 'Namorado(a)',
  son: 'Filho',
  daughter: 'Filha',
  brother: 'Irmão',
  sister: 'Irmã',
  grandfather: 'Avô',
  grandmother: 'Avó',
  friend: 'Amigo(a)',
  coworker: 'Colega de Trabalho',
  other: 'Outro',
};

// Maps relationships to suggested event types
export const RELATIONSHIP_OCCASIONS: Record<RelationshipType, string[]> = {
  mother: ['mothers_day', 'birthday', 'christmas'],
  father: ['fathers_day', 'birthday', 'christmas'],
  spouse: ['valentines_day', 'birthday', 'christmas'],
  partner: ['valentines_day', 'birthday', 'christmas'],
  son: ['childrens_day', 'birthday', 'christmas'],
  daughter: ['childrens_day', 'birthday', 'christmas'],
  brother: ['birthday', 'christmas'],
  sister: ['birthday', 'christmas'],
  grandfather: ['birthday', 'christmas'],
  grandmother: ['birthday', 'christmas'],
  friend: ['birthday', 'christmas'],
  coworker: ['birthday'],
  other: ['birthday', 'christmas'],
};

export interface GiftPerson {
  id: string;
  user_id: string;
  name: string;
  birthday_day: number | null;
  birthday_month: number | null;
  relationship: RelationshipType | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GiftEvent {
  id: string;
  user_id: string;
  name: string;
  event_type: 'birthday' | 'christmas' | 'mothers_day' | 'fathers_day' | 'easter' | 'childrens_day' | 'valentines_day' | 'custom';
  event_day: number | null;
  event_month: number | null;
  default_value: number;
  is_system_event: boolean;
  created_at: string;
  updated_at: string;
}

export interface GiftAssignment {
  id: string;
  user_id: string;
  person_id: string;
  event_id: string;
  year: number;
  planned_value: number;
  actual_value: number | null;
  status: 'pending' | 'purchased' | 'delivered';
  gift_description: string | null;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  person?: GiftPerson;
  event?: GiftEvent;
}

export const SYSTEM_EVENTS: Omit<GiftEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  { name: 'Natal', event_type: 'christmas', event_day: 25, event_month: 12, default_value: 150, is_system_event: true },
  { name: 'Dia das Mães', event_type: 'mothers_day', event_day: 11, event_month: 5, default_value: 200, is_system_event: true },
  { name: 'Dia dos Pais', event_type: 'fathers_day', event_day: 10, event_month: 8, default_value: 200, is_system_event: true },
  { name: 'Páscoa', event_type: 'easter', event_day: 20, event_month: 4, default_value: 50, is_system_event: true },
  { name: 'Dia das Crianças', event_type: 'childrens_day', event_day: 12, event_month: 10, default_value: 100, is_system_event: true },
  { name: 'Dia dos Namorados', event_type: 'valentines_day', event_day: 12, event_month: 6, default_value: 150, is_system_event: true },
];

export const useGifts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all people
  const { data: people = [], isLoading: isLoadingPeople } = useQuery({
    queryKey: ['gift-people', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('gift_people')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      if (error) throw error;
      return data as GiftPerson[];
    },
    enabled: !!user?.id,
  });

  // Fetch all events
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ['gift-events', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('gift_events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_month', { ascending: true })
        .order('event_day', { ascending: true });
      if (error) throw error;
      return data as GiftEvent[];
    },
    enabled: !!user?.id,
  });

  // Fetch all assignments with joins
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['gift-assignments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('gift_assignments')
        .select(`
          *,
          person:gift_people(*),
          event:gift_events(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as GiftAssignment[];
    },
    enabled: !!user?.id,
  });

  // Initialize system events for new users
  const initializeSystemEvents = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Check if system events already exist
      const { data: existing } = await supabase
        .from('gift_events')
        .select('event_type')
        .eq('user_id', user.id)
        .eq('is_system_event', true);
      
      const existingTypes = new Set(existing?.map(e => e.event_type) || []);
      const eventsToCreate = SYSTEM_EVENTS.filter(e => !existingTypes.has(e.event_type));
      
      if (eventsToCreate.length === 0) return;
      
      // Insert events one by one to avoid type issues
      for (const event of eventsToCreate) {
        await supabase
          .from('gift_events')
          .insert({
            name: event.name,
            event_type: event.event_type,
            event_day: event.event_day,
            event_month: event.event_month,
            default_value: event.default_value,
            is_system_event: event.is_system_event,
            user_id: user.id,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-events'] });
    },
  });

  // Add person
  const addPerson = useMutation({
    mutationFn: async (data: { name: string; birthday_day?: number; birthday_month?: number; relationship?: RelationshipType; notes?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      const { data: result, error } = await supabase
        .from('gift_people')
        .insert({ ...data, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return result as GiftPerson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-people'] });
      toast.success('Pessoa adicionada!');
    },
    onError: () => toast.error('Erro ao adicionar pessoa'),
  });

  // Update person
  const updatePerson = useMutation({
    mutationFn: async ({ id, ...data }: Partial<GiftPerson> & { id: string }) => {
      const { error } = await supabase
        .from('gift_people')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-people'] });
      queryClient.invalidateQueries({ queryKey: ['gift-assignments'] });
      toast.success('Pessoa atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar pessoa'),
  });

  // Delete person
  const deletePerson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gift_people')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-people'] });
      queryClient.invalidateQueries({ queryKey: ['gift-assignments'] });
      toast.success('Pessoa removida!');
    },
    onError: () => toast.error('Erro ao remover pessoa'),
  });

  // Add/update event
  const upsertEvent = useMutation({
    mutationFn: async (data: Partial<GiftEvent> & { id?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      if (data.id) {
        const { error } = await supabase
          .from('gift_events')
          .update({
            name: data.name,
            event_type: data.event_type,
            event_day: data.event_day,
            event_month: data.event_month,
            default_value: data.default_value,
            is_system_event: data.is_system_event,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gift_events')
          .insert({
            name: data.name!,
            event_type: data.event_type!,
            event_day: data.event_day,
            event_month: data.event_month,
            default_value: data.default_value || 100,
            is_system_event: data.is_system_event || false,
            user_id: user.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-events'] });
      toast.success('Evento salvo!');
    },
    onError: () => toast.error('Erro ao salvar evento'),
  });

  // Delete event
  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gift_events')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-events'] });
      queryClient.invalidateQueries({ queryKey: ['gift-assignments'] });
      toast.success('Evento removido!');
    },
    onError: () => toast.error('Erro ao remover evento'),
  });

  // Create assignment
  const createAssignment = useMutation({
    mutationFn: async (data: { 
      person_id: string; 
      event_id: string; 
      year: number; 
      planned_value: number;
      gift_description?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('gift_assignments')
        .insert({ ...data, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-assignments'] });
      toast.success('Presente agendado!');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Este presente já foi agendado para esta pessoa neste ano');
      } else {
        toast.error('Erro ao agendar presente');
      }
    },
  });

  // Update assignment
  const updateAssignment = useMutation({
    mutationFn: async ({ id, ...data }: Partial<GiftAssignment> & { id: string }) => {
      const { error } = await supabase
        .from('gift_assignments')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-assignments'] });
      toast.success('Presente atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar presente'),
  });

  // Delete assignment
  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gift_assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-assignments'] });
      toast.success('Presente removido!');
    },
    onError: () => toast.error('Erro ao remover presente'),
  });

  // Bulk upsert birthday assignments
  const bulkUpsertBirthdayAssignments = useMutation({
    mutationFn: async (data: {
      personId: string;
      plannedValue: number;
      description: string;
      existingAssignmentId: string | null;
      year: number;
    }[]) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Find or create the general birthday event
      let birthdayEvent = events.find(e => e.event_type === 'birthday' && e.is_system_event);
      
      if (!birthdayEvent) {
        // Create the birthday system event if it doesn't exist
        const { data: newEvent, error: eventError } = await supabase
          .from('gift_events')
          .insert({
            name: 'Aniversário',
            event_type: 'birthday',
            event_day: null,
            event_month: null,
            default_value: 100,
            is_system_event: true,
            user_id: user.id,
          })
          .select()
          .single();
        
        if (eventError) throw eventError;
        birthdayEvent = newEvent as GiftEvent;
      }
      
      // Process each person
      for (const item of data) {
        if (item.existingAssignmentId) {
          // Update existing assignment
          const { error } = await supabase
            .from('gift_assignments')
            .update({
              planned_value: item.plannedValue,
              gift_description: item.description || null,
            })
            .eq('id', item.existingAssignmentId);
          if (error) throw error;
        } else {
          // Create new assignment
          const { error } = await supabase
            .from('gift_assignments')
            .insert({
              user_id: user.id,
              person_id: item.personId,
              event_id: birthdayEvent.id,
              year: item.year,
              planned_value: item.plannedValue,
              gift_description: item.description || null,
              status: 'pending',
            });
          if (error && error.code !== '23505') throw error; // Ignore duplicate key errors
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['gift-events'] });
      toast.success('Aniversários salvos com sucesso!');
    },
    onError: () => toast.error('Erro ao salvar aniversários'),
  });

  // Bulk upsert assignments for a specific occasion (person x event)
  const bulkUpsertOccasionAssignments = useMutation({
    mutationFn: async (data: {
      eventId: string;
      year: number;
      assignments: {
        personId: string;
        plannedValue: number;
        description: string;
        existingAssignmentId: string | null;
      }[];
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      for (const item of data.assignments) {
        if (item.existingAssignmentId) {
          // Update existing assignment
          const { error } = await supabase
            .from('gift_assignments')
            .update({
              planned_value: item.plannedValue,
              gift_description: item.description || null,
            })
            .eq('id', item.existingAssignmentId);
          if (error) throw error;
        } else {
          // Create new assignment
          const { error } = await supabase
            .from('gift_assignments')
            .insert({
              user_id: user.id,
              person_id: item.personId,
              event_id: data.eventId,
              year: data.year,
              planned_value: item.plannedValue,
              gift_description: item.description || null,
              status: 'pending',
            });
          if (error && error.code !== '23505') throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-assignments'] });
      toast.success('Presentes salvos com sucesso!');
    },
    onError: () => toast.error('Erro ao salvar presentes'),
  });

  // Bulk add people
  const addPeopleBulk = useMutation({
    mutationFn: async (names: string[]) => {
      if (!user?.id) throw new Error('User not authenticated');
      const rows = names.map(name => ({ name, user_id: user.id }));
      const { error } = await supabase
        .from('gift_people')
        .insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-people'] });
      toast.success('Pessoas adicionadas!');
    },
    onError: () => toast.error('Erro ao adicionar pessoas'),
  });

  return {
    people,
    events,
    assignments,
    isLoading: isLoadingPeople || isLoadingEvents || isLoadingAssignments,
    initializeSystemEvents,
    addPerson,
    addPeopleBulk,
    updatePerson,
    deletePerson,
    upsertEvent,
    deleteEvent,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    bulkUpsertBirthdayAssignments,
    bulkUpsertOccasionAssignments,
  };
};
