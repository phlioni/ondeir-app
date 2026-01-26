import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { query } = await req.json();
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        console.log("Buscando por:", query);

        // Estratégia simples de "Keyword Matching" para MVP
        // Num futuro próximo, usaríamos Embeddings da OpenAI aqui para busca semântica real.

        // 1. Buscar nos Menus (O que comer?)
        const { data: menuMatches } = await supabase
            .from('menu_items')
            .select('market_id, name, description')
            .textSearch('description', query, { type: 'websearch', config: 'english' })
            .limit(10);

        // 2. Buscar nas Amenities/Tags (Qual a vibe?)
        const { data: marketMatches } = await supabase
            .from('markets')
            .select('id, name, amenities, description')
            .textSearch('description', query, { type: 'websearch', config: 'english' })
            .limit(10);

        // Coletar IDs únicos
        const marketIds = new Set<string>();
        const matchesMap: Record<string, { item?: string, amenity?: string }> = {};

        menuMatches?.forEach(m => {
            marketIds.add(m.market_id);
            matchesMap[m.market_id] = { ...matchesMap[m.market_id], item: m.name };
        });

        marketMatches?.forEach(m => {
            marketIds.add(m.id);
            matchesMap[m.id] = { ...matchesMap[m.id], amenity: 'Combina com a vibe' };
        });

        if (marketIds.size === 0) {
            return new Response(JSON.stringify({ results: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 3. Pegar os dados completos dos Mercados encontrados
        const { data: finalMarkets } = await supabase
            .from('markets')
            .select('*')
            .in('id', Array.from(marketIds));

        // Combinar com os motivos da busca
        const results = finalMarkets?.map(m => ({
            ...m,
            matched_item: matchesMap[m.id]?.item,
            matched_amenity: matchesMap[m.id]?.amenity
        }));

        return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});