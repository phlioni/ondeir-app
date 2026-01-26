import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        // Cliente Admin (Service Role) - Pode tudo
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Cliente Normal (Para verificar quem está chamando)
        const authHeader = req.headers.get('Authorization')!;
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        );

        // 1. Verificar se quem chama é ADMIN
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("Não autenticado");

        const { data: callerProfile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (callerProfile?.role !== 'admin') {
            return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: corsHeaders });
        }

        const { action, payload } = await req.json();

        // --- LISTAR USUÁRIOS ---
        if (action === 'list') {
            // Pega usuários do Auth (email, last_sign_in)
            const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
            if (authError) throw authError;

            // Pega perfis do Banco (nome, role, avatar)
            const { data: profiles, error: dbError } = await supabaseAdmin.from('profiles').select('*');
            if (dbError) throw dbError;

            // Mescla os dados
            const mergedUsers = users.map(u => {
                const profile = profiles.find(p => p.id === u.id);
                return {
                    id: u.id,
                    email: u.email,
                    last_sign_in_at: u.last_sign_in_at,
                    banned_until: u.banned_until,
                    display_name: profile?.display_name || 'Sem nome',
                    role: profile?.role || 'user',
                    avatar_url: profile?.avatar_url
                };
            });

            // Ordena por último acesso
            mergedUsers.sort((a, b) => {
                return new Date(b.last_sign_in_at || 0).getTime() - new Date(a.last_sign_in_at || 0).getTime();
            });

            return new Response(JSON.stringify({ users: mergedUsers }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // --- CRIAR USUÁRIO ---
        if (action === 'create') {
            const { email, password, name, role } = payload;

            // 1. Cria no Auth
            const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { name }
            });
            if (createError) throw createError;

            // 2. Atualiza Role no Profile (O trigger já criou o profile básico)
            if (authData.user) {
                await supabaseAdmin.from('profiles').update({ role, display_name: name }).eq('id', authData.user.id);
            }

            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // --- EDITAR USUÁRIO ---
        if (action === 'update') {
            const { id, name, role, active, password } = payload;

            // Atualiza Auth (Senha e Banimento)
            const updateAuth: any = {};
            if (password) updateAuth.password = password;
            // Se active for false, banimos por 100 anos. Se true, removemos o ban.
            updateAuth.ban_duration = active ? 'none' : '876000h';

            await supabaseAdmin.auth.admin.updateUserById(id, updateAuth);

            // Atualiza Profile
            await supabaseAdmin.from('profiles').update({ role, display_name: name }).eq('id', id);

            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // --- EXCLUIR USUÁRIO ---
        if (action === 'delete') {
            const { id } = payload;
            const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
            if (error) throw error;
            // O profile é deletado via Cascade no banco se configurado, ou podemos forçar:
            await supabaseAdmin.from('profiles').delete().eq('id', id);

            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        throw new Error("Ação inválida");

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});