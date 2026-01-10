import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        // 1. Check if the caller is a SUPER_ADMIN
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: roles, error: rolesError } = await supabaseClient
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);

        if (rolesError) throw rolesError;

        const isSuperAdmin = roles.some((r: any) => r.role === 'SUPER_ADMIN');
        if (!isSuperAdmin) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized: Only Super Admins can create users' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 2. Parse request body
        const { email, password, fullName, role, hotelIds, phone } = await req.json();

        if (!email || !password || !fullName || !role) {
            throw new Error('Missing required fields: email, password, fullName, role');
        }

        // 3. Create user using SERVICE_ROLE key (to access admin API)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            phone,
            email_confirm: true,
            user_metadata: { full_name: fullName, phone }
        });

        if (createError) throw createError;

        // 4. Assign role and hotel access
        if (newUser.user) {
            // Trigger handle_new_user likely created the basic profile in public.users
            // We'll upsert the role in public.user_roles.
            const { error: roleError } = await supabaseAdmin
                .from('user_roles')
                .upsert({
                    user_id: newUser.user.id,
                    role: role,
                    hotel_id: hotelIds?.[0] || null
                });

            if (roleError) throw roleError;
        }

        return new Response(
            JSON.stringify({ user: newUser.user, message: 'User created successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
