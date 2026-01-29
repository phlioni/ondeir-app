import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, useJsApiLoader, MarkerF, MarkerClustererF } from "@react-google-maps/api";
import { Search, Mic, Star, ArrowRight, Navigation, DollarSign, Trophy, X, MapPin, Store, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { AppMenu } from "@/components/AppMenu";
import { getMarkerIcon, mapStyles } from "@/utils/mapStyles";
import { ActiveOrderBanner } from "@/components/ActiveOrderBanner";

// --- CONFIGURAÇÕES ---
const mapContainerStyle = { width: '100%', height: '100%' };
const GOOGLE_MAPS_LIBRARIES: ("places" | "marker")[] = ["places", "marker"];

// Estilo dos Clusters
const clusterStyles = [{
  textColor: 'white',
  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
    <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <circle cx="25" cy="25" r="20" fill="#0F172A" stroke="white" stroke-width="2"/>
    </svg>
  `),
  height: 50,
  width: 50,
  textSize: 14,
  fontFamily: 'Arial',
  fontWeight: 'bold'
}];

const SEARCH_PHRASES = [
  "🍔 Hambúrguer artesanal?",
  "🍻 Barzinho com música?",
  "🍕 Pizza barata perto?",
  "☕ Café para trabalhar?",
  "🍣 Rodízio japonês?",
  "🍦 Açaí gelado?"
];

const QUICK_FILTERS = [
  { label: "Todos", value: "all" },
  { label: "🍔 Lanches", value: "Restaurante" },
  { label: "🍻 Bares", value: "Bar" },
  { label: "🎵 Baladas", value: "Balada" },
  { label: "☕ Cafés", value: "Café" },
];

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // --- MAPA ---
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [center, setCenter] = useState({ lat: -23.550520, lng: -46.633308 });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  // --- DADOS ---
  const [results, setResults] = useState<any[]>([]);
  const [places, setPlaces] = useState<any[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [userCoins, setUserCoins] = useState<number | null>(null); // NOVO: Saldo de Coins

  // --- BUSCA ---
  const [query, setQuery] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [resultType, setResultType] = useState<'venues' | 'products'>('venues');
  const [sortOrder, setSortOrder] = useState<'default' | 'cheapest' | 'rated'>('default');

  // --- FUNÇÃO AUXILIAR DE DISTÂNCIA ---
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return "";
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    if (d < 1) return `${Math.round(d * 1000)}m`;
    return `${d.toFixed(1)}km`;
  };

  // 1. EFEITO DE DIGITAÇÃO
  useEffect(() => {
    let currentPhraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timer: NodeJS.Timeout;

    const typeWriter = () => {
      const currentPhrase = SEARCH_PHRASES[currentPhraseIndex];
      if (isDeleting) {
        setPlaceholder(currentPhrase.substring(0, charIndex - 1));
        charIndex--;
      } else {
        setPlaceholder(currentPhrase.substring(0, charIndex + 1));
        charIndex++;
      }
      let speed = isDeleting ? 30 : 80;
      if (!isDeleting && charIndex === currentPhrase.length) {
        isDeleting = true;
        speed = 2000;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        currentPhraseIndex = (currentPhraseIndex + 1) % SEARCH_PHRASES.length;
        speed = 500;
      }
      timer = setTimeout(typeWriter, speed);
    };
    typeWriter();
    return () => clearTimeout(timer);
  }, []);

  // 2. INICIALIZAÇÃO E COINS
  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      setLoadingLocation(true);
      await fetchNearbyPlaces();

      // Busca Coins do Usuário
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('coin_balance').eq('id', session.user.id).single();
        if (profile) setUserCoins(profile.coin_balance);
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isMounted) return;
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            if (loc.lat && loc.lng) {
              setUserLocation(loc);
              setCenter(loc);
              if (mapRef.current) { mapRef.current.panTo(loc); mapRef.current.setZoom(15); }
            }
            setLoadingLocation(false);
          },
          () => { if (isMounted) setLoadingLocation(false); },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } else {
        if (isMounted) setLoadingLocation(false);
      }
    };
    initialize();
    return () => { isMounted = false; };
  }, []);

  const fetchNearbyPlaces = async () => {
    try {
      const { data } = await supabase.from('markets').select('*');
      if (data) {
        const venues = data.map(m => ({
          ...m,
          type: 'venue',
          market_name: m.name,
          market_id: m.id
        })).filter(m => m.latitude && m.longitude);

        setPlaces(venues);
        setFilteredPlaces(venues);
        setResults(venues);
      }
    } catch (error) { console.error(error); }
  };

  const handleIASearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSelectedPlace(null);
    setSortOrder('default');

    try {
      const { data, error } = await supabase.functions.invoke('search-places', {
        body: { query, userLocation }
      });

      if (error) throw error;

      if (data.results && data.results.length > 0) {
        const validResults = data.results.filter((r: any) => {
          if (r.type === 'product') return r.market?.latitude && r.market?.longitude;
          return r.latitude && r.longitude;
        });

        setResults(validResults);
        setFilteredPlaces(validResults);
        setResultType(data.type);
        setIsDrawerOpen(true);

        const first = validResults[0];
        if (first && mapRef.current) {
          const lat = first.type === 'product' ? first.market.latitude : first.latitude;
          const lng = first.type === 'product' ? first.market.longitude : first.longitude;
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(16);
        }
      } else {
        toast({ title: "Ops!", description: "Nada encontrado." });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha na busca.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleDrawerChange = (isOpen: boolean) => {
    setIsDrawerOpen(isOpen);
    if (!isOpen) {
      setFilteredPlaces(places);
    }
  };

  const navigateToPlace = (item: any) => {
    if (item.type === 'product') {
      const marketId = item.market_id || item.market?.id;
      if (marketId) {
        navigate(`/place/${marketId}`, { state: { openProductId: item.id } });
      } else {
        console.error("Produto sem market_id vinculado:", item);
        toast({ title: "Erro", description: "Restaurante não encontrado.", variant: "destructive" });
      }
      return;
    }
    const targetId = item.market_id || (item.type === 'venue' ? item.id : null);
    if (targetId) {
      navigate(`/place/${targetId}`);
    } else {
      console.error("ID do local inválido:", item);
      toast({ title: "Erro", description: "Não foi possível abrir este local.", variant: "destructive" });
    }
  };

  const handleSort = (type: 'cheapest' | 'rated') => {
    setSortOrder(type);
    const sorted = [...results];
    if (type === 'cheapest') sorted.sort((a, b) => (a.price || 99999) - (b.price || 99999));
    if (type === 'rated') sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    setResults(sorted);
  };

  const handleFilterClick = (category: string) => {
    setActiveFilter(category);
    setSelectedPlace(null);
    if (category === "all") {
      setFilteredPlaces(places);
    } else {
      setFilteredPlaces(places.filter(p => p.category === category));
    }
  };

  const onLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);

  const renderCardContent = (item: any) => {
    const imageSource = item.type === 'product' && item.image_url
      ? item.image_url
      : (item.cover_image || item.market?.cover_image || '/placeholder.svg');

    const venueName = item.market_name || item.market?.name || "Restaurante";

    const distanceText = userLocation
      ? calculateDistance(
        userLocation.lat,
        userLocation.lng,
        item.type === 'product' ? item.market?.latitude : item.latitude,
        item.type === 'product' ? item.market?.longitude : item.longitude
      )
      : "";

    return (
      <div className="flex p-3 gap-3 w-full bg-white">
        <div
          className="w-20 h-20 rounded-xl bg-cover bg-center shrink-0 shadow-sm border border-gray-100"
          style={{ backgroundImage: `url(${imageSource})` }}
        />

        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex justify-between items-start gap-1">
              <h3 className="font-bold text-base text-gray-900 line-clamp-1 leading-tight">
                {item.type === 'product' ? item.name : venueName}
              </h3>
              <div className="flex flex-col items-end">
                <span className="flex items-center text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md shrink-0">
                  <Star className="w-3 h-3 mr-1 fill-amber-600" />
                  {item.type === 'product' ? (item.market?.rating || 4.5) : (item.rating || 4.5)}
                </span>
                {distanceText && (
                  <span className="text-[10px] text-gray-400 mt-0.5 font-medium">{distanceText}</span>
                )}
              </div>
            </div>

            {item.type === 'product' ? (
              <>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide flex items-center gap-1 mt-0.5">
                  <Store className="w-3 h-3" /> {venueName}
                </p>
                <p className="text-xs text-gray-400 line-clamp-1 mt-0.5 leading-tight">{item.description}</p>
              </>
            ) : (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.category} • {item.address}</p>
            )}
          </div>

          <div className="flex items-end justify-between mt-2">
            {item.type === 'product' ? (
              <span className="text-lg font-bold text-primary">R$ {item.price.toFixed(2)}</span>
            ) : (
              <span className="text-xs text-primary font-medium">Ver Cardápio</span>
            )}

            <Button size="sm" className="h-7 text-xs px-4 rounded-full shadow-none bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors" onClick={(e) => {
              e.stopPropagation();
              navigateToPlace(item);
            }}>
              Ver
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-gray-100"><span className="animate-pulse text-primary font-bold">Carregando...</span></div>;

  return (
    <div className="relative h-screen w-full overflow-hidden flex flex-col bg-background font-sans">

      {/* HEADER */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-white/90 to-transparent pointer-events-none">
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="flex gap-2">
            <AppMenu />

            {/* NOVO: BANNER DE COINS */}
            {userCoins !== null && userCoins > 0 && (
              <div
                className="flex items-center gap-1.5 bg-yellow-400 text-yellow-900 px-3 py-2 rounded-full shadow-md cursor-pointer animate-in fade-in slide-in-from-top-2"
                onClick={() => navigate('/profile')}
              >
                <Coins className="w-4 h-4 fill-yellow-100 text-yellow-800" />
                <span className="text-xs font-bold">{userCoins}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-[65%] pb-2 px-1">
            {QUICK_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleFilterClick(filter.value)}
                className={`
                  whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold shadow-md transition-all
                  ${activeFilter === filter.value
                    ? "bg-primary text-white scale-105"
                    : "bg-white text-gray-700 hover:bg-gray-50"}
                `}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAPA */}
      <div className="absolute inset-0 z-0">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={14}
          onLoad={onLoad}
          options={{ disableDefaultUI: true, zoomControl: false, styles: mapStyles, minZoom: 4, maxZoom: 20 }}
        >
          {userLocation && userLocation.lat && userLocation.lng && (
            <MarkerF position={userLocation} zIndex={999} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#3B82F6", fillOpacity: 1, strokeColor: "white", strokeWeight: 3 }} />
          )}

          <MarkerClustererF styles={clusterStyles}>
            {(clusterer) => (
              <>
                {filteredPlaces.map((item) => {
                  const isProduct = item.type === 'product';
                  const lat = isProduct ? item.market?.latitude : item.latitude;
                  const lng = isProduct ? item.market?.longitude : item.longitude;
                  const category = isProduct ? item.market?.category : item.category;

                  if (!lat || !lng) return null;

                  return (
                    <MarkerF
                      key={isProduct ? `p-${item.id}` : `v-${item.id}`}
                      position={{ lat, lng }}
                      icon={getMarkerIcon(category || 'Default')}
                      clusterer={clusterer}
                      onClick={() => {
                        setSelectedPlace(item);
                        mapRef.current?.panTo({ lat, lng });
                        mapRef.current?.setZoom(16);
                      }}
                    />
                  );
                })}
              </>
            )}
          </MarkerClustererF>
        </GoogleMap>
      </div>

      {/* BOTÃO GPS */}
      <Button
        className="absolute bottom-36 right-4 rounded-full w-12 h-12 shadow-lg z-20 bg-white text-gray-700 hover:bg-gray-50 transition-transform active:scale-95"
        size="icon"
        onClick={() => userLocation && mapRef.current?.panTo(userLocation)}
      >
        {loadingLocation ? <span className="animate-spin text-primary">⏳</span> : <Navigation className="w-5 h-5 text-blue-500" />}
      </Button>

      {/* CARD FLUTUANTE */}
      <div className="absolute bottom-8 left-4 right-4 z-20 flex flex-col items-center gap-3 pointer-events-none">

        {selectedPlace && !isDrawerOpen && (
          <Card
            className="w-full max-w-md p-3 shadow-xl border-0 bg-white/95 backdrop-blur rounded-2xl cursor-pointer pointer-events-auto animate-in slide-in-from-bottom-5 active:scale-95 transition-transform"
            onClick={() => navigateToPlace(selectedPlace)}
          >
            <div className="flex gap-3 items-center">
              <div
                className="w-14 h-14 rounded-full bg-cover bg-center shrink-0 border-2 border-white shadow-sm"
                style={{ backgroundImage: `url(${selectedPlace.type === 'product' && selectedPlace.image_url ? selectedPlace.image_url : (selectedPlace.cover_image || selectedPlace.market?.cover_image || '/placeholder.svg')})` }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <h3 className="font-bold text-base text-gray-900 truncate">
                    {selectedPlace.type === 'product' ? selectedPlace.name : selectedPlace.market_name}
                  </h3>
                  <span className="flex items-center text-xs font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded ml-2">
                    <Star className="w-3 h-3 fill-current mr-1" />
                    {selectedPlace.type === 'product' ? (selectedPlace.market?.rating || 4.5) : (selectedPlace.rating || 4.5)}
                  </span>
                </div>

                {selectedPlace.type === 'product' ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-primary">R$ {selectedPlace.price.toFixed(2)}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500 truncate">No {selectedPlace.market?.name}</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                    {selectedPlace.category} <span className="text-gray-300">•</span> {selectedPlace.address}
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-gray-600 -mr-1"
                onClick={(e) => { e.stopPropagation(); setSelectedPlace(null); }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </Card>
        )}

        {/* INPUT DE BUSCA */}
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl p-2 rounded-2xl shadow-xl border border-white/50 flex items-center gap-2 transition-all focus-within:ring-2 focus-within:ring-primary/50 focus-within:scale-105 pointer-events-auto">
          <Button variant="ghost" size="icon" className="text-gray-400">
            <Mic className="w-5 h-5" />
          </Button>
          <Input
            className="border-0 bg-transparent shadow-none text-base placeholder:text-gray-400 focus-visible:ring-0 h-12"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleIASearch()}
          />
          <Button
            size="icon"
            className={`rounded-xl h-10 w-10 transition-all ${isSearching ? 'bg-gray-200' : 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30'}`}
            onClick={handleIASearch}
            disabled={isSearching}
          >
            {isSearching ? <span className="animate-spin text-gray-500">⏳</span> : <ArrowRight className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* DRAWER DE RESULTADOS */}
      <Drawer open={isDrawerOpen} onOpenChange={handleDrawerChange}>
        <DrawerContent className="h-[75vh] max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center flex flex-col items-center justify-center gap-1">
              <span className="text-lg">Resultados para <span className="text-primary">"{query}"</span></span>
              <span className="text-xs text-gray-400 font-normal">{results.length} encontrados</span>
            </DrawerTitle>

            <div className="flex justify-center gap-3 mt-4">
              <Button
                variant={sortOrder === 'cheapest' ? "default" : "outline"}
                size="sm"
                className="rounded-full h-8 text-xs gap-1"
                onClick={() => handleSort('cheapest')}
                disabled={resultType === 'venues'}
              >
                <DollarSign className="w-3 h-3" /> Mais Baratos
              </Button>
              <Button
                variant={sortOrder === 'rated' ? "default" : "outline"}
                size="sm"
                className="rounded-full h-8 text-xs gap-1"
                onClick={() => handleSort('rated')}
              >
                <Trophy className="w-3 h-3" /> Bem Avaliados
              </Button>
            </div>
          </DrawerHeader>

          <div className="px-4 overflow-y-auto pb-8 space-y-3 bg-gray-50 pt-4 h-full">
            {results.map((item) => (
              <Card
                key={item.type === 'product' ? `p-${item.id}` : `v-${item.id}`}
                className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white group"
                onClick={() => navigateToPlace(item)}
              >
                {renderCardContent(item)}
              </Card>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
      <ActiveOrderBanner />
    </div>
  );
}