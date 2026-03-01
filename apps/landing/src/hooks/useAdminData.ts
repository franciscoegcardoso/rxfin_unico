import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface PageView {
  id: string;
  page: string;
  referrer: string | null;
  user_agent: string | null;
  session_id: string | null;
  created_at: string;
}

interface ConversionEvent {
  id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  page: string | null;
  session_id: string | null;
  created_at: string;
}

interface Lead {
  id: string;
  email: string;
  source: string;
  created_at: string;
}

interface Profile {
  id: string;
  email: string;
}

interface WorkspaceOwner {
  owner_id: string;
  plan_id: string | null;
}

export interface UnconvertedLead {
  id: string;
  email: string;
  source: string;
  created_at: string;
}

export interface LeadJourneyRow {
  id: string;
  email: string;
  source: string;
  created_at: string;
  is_visitor: boolean;
  is_lead: boolean;
  clicked_signup: boolean;
  signup_complete: boolean;
  plan_configured: boolean;
}

export const useAdminData = (startDate: Date, endDate: Date) => {
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const pageViewsQuery = useQuery({
    queryKey: ['admin-page-views', startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_views' as any)
        .select('*')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PageView[];
    },
  });

  const conversionEventsQuery = useQuery({
    queryKey: ['admin-conversion-events', startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversion_events' as any)
        .select('*')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ConversionEvent[];
    },
  });

  const leadsQuery = useQuery({
    queryKey: ['admin-leads', startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  // Fetch all profile emails (no date filter — we want to check if lead ever registered)
  const profilesQuery = useQuery({
    queryKey: ['admin-profiles-emails'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email');
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const workspacesQuery = useQuery({
    queryKey: ['admin-workspaces-owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('owner_id, plan_id');
      if (error) throw error;
      return (data ?? []) as WorkspaceOwner[];
    },
  });

  const pageViewsByDay = (pageViewsQuery.data ?? []).reduce<Record<string, number>>((acc, pv) => {
    const day = format(new Date(pv.created_at), 'dd/MM');
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const events = conversionEventsQuery.data ?? [];

  const eventsByType = events.reduce<Record<string, number>>((acc, ev) => {
    acc[ev.event_type] = (acc[ev.event_type] || 0) + 1;
    return acc;
  }, {});

  // Card/feature access tracking
  const cardAccessCounts = events
    .filter(ev => ['feature_preview', 'simulator_start', 'cta_click'].includes(ev.event_type))
    .reduce<Record<string, number>>((acc, ev) => {
      const label = (ev.event_data as any)?.feature_name
        || (ev.event_data as any)?.simulator_name
        || (ev.event_data as any)?.cta_name
        || ev.event_type;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

  const leadsBySource = (leadsQuery.data ?? []).reduce<Record<string, number>>((acc, lead) => {
    const source = lead.source || 'direto';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  // Funnel calculations
  const profileEmails = new Set(
    (profilesQuery.data ?? []).map(p => p.email?.toLowerCase()).filter(Boolean)
  );

  // Profile id lookup by email
  const profileIdByEmail = new Map(
    (profilesQuery.data ?? []).map(p => [p.email?.toLowerCase(), p.id] as const).filter(([e]) => !!e)
  );

  // Workspace owners set (users who have a workspace with a plan)
  const workspaceOwnerIds = new Set(
    (workspacesQuery.data ?? []).filter(w => w.plan_id).map(w => w.owner_id)
  );

  // Sign-up intent emails from conversion events
  const signUpIntentEmails = new Set(
    events
      .filter(e => e.event_type === 'sign_up_intent')
      .map(e => ((e.event_data as any)?.email as string)?.toLowerCase())
      .filter(Boolean)
  );

  const allLeads = leadsQuery.data ?? [];
  const uniqueVisitors = new Set(
    (pageViewsQuery.data ?? []).map(pv => pv.session_id).filter(Boolean)
  ).size;

  const convertedLeads = allLeads.filter(l => profileEmails.has(l.email?.toLowerCase()));
  const unconvertedLeads: UnconvertedLead[] = allLeads.filter(l => !profileEmails.has(l.email?.toLowerCase()));

  const totalPageViews = pageViewsQuery.data?.length ?? 0;
  const totalLeads = allLeads.length;
  const totalConversions = events.filter(e => e.event_type === 'sign_up_intent').length;
  const conversionRate = totalPageViews > 0 ? ((totalLeads / totalPageViews) * 100).toFixed(1) : '0';
  const leadToSignupRate = totalLeads > 0 ? ((convertedLeads.length / totalLeads) * 100).toFixed(1) : '0';

  // Lead journey table data
  const leadJourney: LeadJourneyRow[] = allLeads.map(lead => {
    const emailLower = lead.email?.toLowerCase();
    const profileId = profileIdByEmail.get(emailLower);
    const hasProfile = profileEmails.has(emailLower);
    const hasClickedSignup = signUpIntentEmails.has(emailLower) || hasProfile; // if they completed signup, they clicked too
    const hasPlan = profileId ? workspaceOwnerIds.has(profileId) : false;

    return {
      id: lead.id,
      email: lead.email,
      source: lead.source,
      created_at: lead.created_at,
      is_visitor: true, // all leads are visitors
      is_lead: true, // they're in the leads table
      clicked_signup: hasClickedSignup,
      signup_complete: hasProfile,
      plan_configured: hasPlan,
    };
  });

  return {
    loading: pageViewsQuery.isLoading || conversionEventsQuery.isLoading || leadsQuery.isLoading || profilesQuery.isLoading || workspacesQuery.isLoading,
    totalPageViews,
    totalLeads,
    totalConversions,
    conversionRate,
    pageViewsByDay,
    eventsByType,
    cardAccessCounts,
    leadsBySource,
    leads: allLeads,
    // Funnel data
    uniqueVisitors,
    convertedLeadsCount: convertedLeads.length,
    unconvertedLeads,
    leadToSignupRate,
    leadJourney,
    refetch: () => {
      pageViewsQuery.refetch();
      conversionEventsQuery.refetch();
      leadsQuery.refetch();
      profilesQuery.refetch();
      workspacesQuery.refetch();
    },
  };
};
