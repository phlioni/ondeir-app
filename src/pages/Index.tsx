import { useState, useEffect } from "react";
import { Search, ArrowRight, Mic, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapSelector } from "@/components/MapSelector";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AppMenu } from "@/components/AppMenu"; // <--- Importamos o Menu
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('search-places', {
        body: { query }
      });

      if (error) throw error;

      if (data.results && data.results.length > 0) {
        setResults(data.results);
        setMapCenter({ lat: data.results[0].latitude, lng: data.results[0].longitude });
        setIsDrawerOpen(true);
      } else {
        toast({ title: "Ops!", description: "Não encontrei nada com essa descrição." });
      }

    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao processar sua busca.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden flex flex-col bg-background">

      {/* 1. BOTÃO DO MENU (Superior Esquerdo) */}
      <div className="absolute top-4 left-4 z-30">
        <AppMenu />
      </div>

      {/* 2. MAPA DE FUNDO */}
      <div className="absolute inset-0 z-0">
        <MapSelector
          markers={results.map(r => ({
            id: r.id,
            lat: r.latitude,
            lng: r.longitude,
            name: r.name,
            category: r.category
          }))}
          centerLocation={mapCenter}
          onMarkerClick={(id) => navigate(`/place/${id}`)}
        />
      </div>

      {/* 3. BARRA DE BUSCA (Inferior) */}
      <div className="absolute bottom-8 left-4 right-4 z-20 flex flex-col items-center gap-4 pointer-events-none">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-2 pointer-events-auto transition-all focus-within:ring-2 focus-within:ring-primary/50">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary">
            <Mic className="w-5 h-5" />
          </Button>
          <Input
            className="border-0 bg-transparent shadow-none text-lg placeholder:text-gray-400 focus-visible:ring-0 h-10"
            placeholder="Onde ir? (ex: música ao vivo)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button
            size="icon"
            className="rounded-xl bg-primary hover:bg-primary/90 shadow-lg h-10 w-10"
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? <span className="animate-spin">⏳</span> : <ArrowRight className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* 4. DRAWER DE RESULTADOS */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="h-[50vh] max-h-[80vh]">
          <DrawerHeader>
            <DrawerTitle className="text-center">Encontramos {results.length} lugares</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto pb-8 space-y-4">
            {results.map((place) => (
              <Card key={place.id} className="p-3 flex gap-3 hover:bg-gray-50 cursor-pointer transition-colors border-0 shadow-sm bg-gray-50/50" onClick={() => navigate(`/place/${place.id}`)}>
                <div className="w-20 h-20 bg-gray-200 rounded-xl bg-cover bg-center shrink-0 shadow-inner" style={{ backgroundImage: `url(${place.cover_image || '/placeholder.svg'})` }} />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold truncate text-base text-gray-900">{place.name}</h3>
                    <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-md">
                      <Star className="w-3 h-3 mr-1 fill-amber-600" /> {place.rating}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 truncate">{place.category} • {place.address}</p>

                  {(place.matched_item || place.matched_amenity) && (
                    <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md inline-block truncate w-fit max-w-full">
                      ✨ {place.matched_item ? `Tem: ${place.matched_item}` : `Vibe: ${place.matched_amenity}`}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}