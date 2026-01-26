import { useEffect, useState, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { Loader2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

// Cores dos Pins baseadas na categoria
const PIN_COLORS: Record<string, string> = {
    "Bar": "http://maps.google.com/mapfiles/ms/icons/purple-dot.png",
    "Restaurante": "http://maps.google.com/mapfiles/ms/icons/orange-dot.png",
    "Balada": "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    "Café": "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
    "default": "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
};

interface Location {
    id: string;
    lat: number;
    lng: number;
    name: string;
    category: string;
    cover_image?: string;
    rating?: number;
}

interface MapSelectorProps {
    markers?: Location[];
    onMarkerClick?: (id: string) => void;
    className?: string;
    centerLocation?: { lat: number; lng: number } | null;
}

export function MapSelector({ markers = [], onMarkerClick, className, centerLocation }: MapSelectorProps) {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [selectedMarker, setSelectedMarker] = useState<Location | null>(null);

    // 1. Pegar localização EXATA do usuário ao iniciar
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setUserLocation(pos);
                    // Se não tiver um centro forçado pela IA, usa a localização do usuário
                    if (!centerLocation && map) {
                        map.panTo(pos);
                        map.setZoom(15);
                    }
                },
                (error) => {
                    console.error("Erro GPS:", error);
                    // Fallback para SP
                    setUserLocation({ lat: -23.550520, lng: -46.633308 });
                },
                { enableHighAccuracy: true } // MÁXIMA PRECISÃO
            );
        }
    }, [map]);

    // 2. Reagir a busca da IA (Mudança de centro)
    useEffect(() => {
        if (centerLocation && map) {
            map.panTo(centerLocation);
            map.setZoom(15);
        }
    }, [centerLocation, map]);

    const onLoad = useCallback((map: google.maps.Map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    if (loadError) return <div className="h-full flex items-center justify-center text-red-500">Erro ao carregar mapa</div>;
    if (!isLoaded) return <div className="h-full flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    return (
        <div className={`relative w-full ${className || "h-screen"}`}>
            <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={userLocation || { lat: -23.550520, lng: -46.633308 }}
                zoom={14}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                    disableDefaultUI: true,
                    zoomControl: false,
                    fullscreenControl: false,
                    styles: [
                        {
                            featureType: "poi",
                            elementType: "labels",
                            stylers: [{ visibility: "off" }] // Limpa o mapa, deixa só nossos pins
                        }
                    ]
                }}
            >
                {/* Marcador do Usuário (Bolinha Azul Pulsante) */}
                {userLocation && (
                    <Marker
                        position={userLocation}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: "#4285F4",
                            fillOpacity: 1,
                            strokeColor: "#ffffff",
                            strokeWeight: 2,
                        }}
                        zIndex={999}
                    />
                )}

                {/* Marcadores dos Restaurantes */}
                {markers.map((marker) => (
                    <Marker
                        key={marker.id}
                        position={{ lat: marker.lat, lng: marker.lng }}
                        onClick={() => {
                            setSelectedMarker(marker);
                            if (onMarkerClick) onMarkerClick(marker.id);
                        }}
                        icon={PIN_COLORS[marker.category] || PIN_COLORS["default"]}
                    />
                ))}

                {selectedMarker && (
                    <InfoWindow
                        position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                        onCloseClick={() => setSelectedMarker(null)}
                    >
                        <div className="p-2 min-w-[150px]">
                            <h3 className="font-bold text-sm">{selectedMarker.name}</h3>
                            <p className="text-xs text-gray-500 mb-2">{selectedMarker.category}</p>
                            <button
                                onClick={() => onMarkerClick && onMarkerClick(selectedMarker.id)}
                                className="text-xs bg-primary text-white px-2 py-1 rounded w-full"
                            >
                                Ver Detalhes
                            </button>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>

            {/* Botão para voltar para minha localização */}
            <Button
                className="absolute bottom-32 right-4 rounded-full w-12 h-12 shadow-lg z-10"
                size="icon"
                onClick={() => userLocation && map?.panTo(userLocation)}
            >
                <Navigation className="w-5 h-5" />
            </Button>
        </div>
    );
}