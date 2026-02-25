import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InviteGuestRequest {
  guest_email: string;
  guest_name?: string;
}

interface AcceptInvitationRequest {
  token: string;
  action: 'accept' | 'reject';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    // Client with user's auth
    const authHeader = req.headers.get('Authorization')
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    })
    
    // Admin client for operations that need elevated privileges
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // ============ INVITE GUEST ============
    if (action === 'invite' && req.method === 'POST') {
      const { guest_email, guest_name }: InviteGuestRequest = await req.json()

      if (!guest_email) {
        return new Response(
          JSON.stringify({ error: 'Email do convidado é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const email = guest_email.toLowerCase().trim()

      // Check if principal user has premium/enterprise plan
      const { data: principalProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, user_type')
        .eq('id', user.id)
        .single()

      if (!principalProfile || principalProfile.user_type !== 'principal') {
        return new Response(
          JSON.stringify({ error: 'Apenas usuários principais podem convidar' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check guest limit (3 for premium plans)
      const { count: currentGuests } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('principal_user_id', user.id)

      if ((currentGuests || 0) >= 3) {
        return new Response(
          JSON.stringify({ error: 'Limite de 3 convidados atingido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if email already exists in profiles
      const { data: existingUser } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, user_type, principal_user_id')
        .eq('email', email)
        .single()

      let invitationType: 'new_user' | 'existing_user' | 'transfer'
      let guestUserId: string | null = null
      let previousPrincipalId: string | null = null

      if (existingUser) {
        guestUserId = existingUser.id

        if (existingUser.principal_user_id === user.id) {
          return new Response(
            JSON.stringify({ error: 'Este usuário já é seu convidado' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (existingUser.principal_user_id) {
          // User is linked to another principal - needs transfer confirmation
          invitationType = 'transfer'
          previousPrincipalId = existingUser.principal_user_id
        } else if (existingUser.user_type === 'principal') {
          return new Response(
            JSON.stringify({ error: 'Este usuário é titular de uma conta e não pode ser convidado' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          // User exists but not linked - direct link
          invitationType = 'existing_user'
        }
      } else {
        // New user - will need to sign up
        invitationType = 'new_user'
      }

      // Check for existing pending invitation
      const { data: existingInvitation } = await supabaseAdmin
        .from('guest_invitations')
        .select('id, status')
        .eq('principal_user_id', user.id)
        .eq('guest_email', email)
        .eq('status', 'pending')
        .single()

      if (existingInvitation) {
        return new Response(
          JSON.stringify({ error: 'Já existe um convite pendente para este email' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create invitation
      const { data: invitation, error: inviteError } = await supabaseAdmin
        .from('guest_invitations')
        .insert({
          principal_user_id: user.id,
          guest_email: email,
          guest_user_id: guestUserId,
          invitation_type: invitationType,
          previous_principal_id: previousPrincipalId,
        })
        .select()
        .single()

      if (inviteError) {
        console.error('Error creating invitation:', inviteError)
        return new Response(
          JSON.stringify({ error: 'Erro ao criar convite' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // For existing_user type (not transfer), link directly but set as pending
      if (invitationType === 'existing_user' && guestUserId) {
        await supabaseAdmin
          .from('profiles')
          .update({
            user_type: 'convidado',
            principal_user_id: user.id,
            invitation_status: 'pending'
          })
          .eq('id', guestUserId)

        // Mark invitation as accepted since it's direct link
        await supabaseAdmin
          .from('guest_invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', invitation.id)
      }

      // TODO: Send email notification (via Resend or other service)
      // For now, we'll just return success

      return new Response(
        JSON.stringify({
          success: true,
          invitation_type: invitationType,
          message: invitationType === 'new_user'
            ? 'Convite enviado. O usuário precisará criar uma conta.'
            : invitationType === 'transfer'
            ? 'Convite enviado. O usuário precisa confirmar a transferência.'
            : 'Usuário vinculado com sucesso. Aguardando primeiro acesso.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ ACCEPT/REJECT INVITATION ============
    if (action === 'respond' && req.method === 'POST') {
      const { token, action: responseAction }: AcceptInvitationRequest = await req.json()

      if (!token || !responseAction) {
        return new Response(
          JSON.stringify({ error: 'Token e ação são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: invitation, error: inviteError } = await supabaseAdmin
        .from('guest_invitations')
        .select('*, principal:principal_user_id(full_name)')
        .eq('token', token)
        .eq('status', 'pending')
        .single()

      if (inviteError || !invitation) {
        return new Response(
          JSON.stringify({ error: 'Convite não encontrado ou expirado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        await supabaseAdmin
          .from('guest_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id)

        return new Response(
          JSON.stringify({ error: 'Convite expirado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (responseAction === 'accept') {
        // Link user to new principal
        await supabaseAdmin
          .from('profiles')
          .update({
            user_type: 'convidado',
            principal_user_id: invitation.principal_user_id,
            invitation_status: 'pending' // Will be active after first login
          })
          .eq('id', user.id)

        await supabaseAdmin
          .from('guest_invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', invitation.id)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Convite aceito! Você agora está vinculado a esta conta.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // Reject invitation
        await supabaseAdmin
          .from('guest_invitations')
          .update({ status: 'rejected' })
          .eq('id', invitation.id)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Convite recusado.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ============ GET PENDING INVITATIONS FOR GUEST ============
    if (action === 'my-invitations' && req.method === 'GET') {
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single()

      if (!userProfile?.email) {
        return new Response(
          JSON.stringify({ invitations: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: invitations } = await supabaseAdmin
        .from('guest_invitations')
        .select('*, principal:principal_user_id(full_name, email)')
        .eq('guest_email', userProfile.email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())

      return new Response(
        JSON.stringify({ invitations: invitations || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ ACTIVATE USER ON FIRST LOGIN ============
    if (action === 'activate' && req.method === 'POST') {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('invitation_status, user_type')
        .eq('id', user.id)
        .single()

      if (profile?.invitation_status === 'pending') {
        await supabaseAdmin
          .from('profiles')
          .update({ invitation_status: 'active' })
          .eq('id', user.id)

        return new Response(
          JSON.stringify({ success: true, activated: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, activated: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Ação não reconhecida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in manage-guest-invitation:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
