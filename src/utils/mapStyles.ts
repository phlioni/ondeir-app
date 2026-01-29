// Estilo "Silver/Clean"
export const mapStyles = [
    {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
    },
    {
        featureType: "transit",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ lightness: 100 }, { visibility: "simplified" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#c9c9c9" }],
    },
];

const CATEGORY_COLORS: Record<string, string> = {
    Bar: "#F59E0B",        // Amber-500
    Restaurante: "#EF4444", // Red-500
    Balada: "#8B5CF6",      // Violet-500
    Café: "#78350F",        // Amber-900
    Default: "#10B981",     // Emerald-500
};

// Ícones minimalistas para dentro do Pin
const ICONS_PATH: Record<string, string> = {
    Bar: "M21 16v-2a4 4 0 0 0-4-4h-5V6h5a1 1 0 0 0 0-2h-5V2a1 1 0 0 0-2 0v2H5a1 1 0 0 0 0 2h5v4H5a4 4 0 0 0-4 4v2h20zm-2 2H5v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1z",
    Restaurante: "M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z",
    Balada: "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z",
    Default: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
};

// MODIFICADO: Aceita isOpen para definir a cor
export const getMarkerIcon = (category: string, isOpen: boolean = true) => {
    // Se estiver aberto, usa a cor da categoria. Se fechado, usa Cinza Escuro (Slate-700)
    const color = isOpen ? (CATEGORY_COLORS[category] || CATEGORY_COLORS.Default) : "#334155";
    const path = ICONS_PATH[category] || ICONS_PATH.Default;

    // SVG Circular Moderno (Mantido idêntico, só mudamos a variável color acima)
    const svg = `
    <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <circle cx="22" cy="22" r="20" fill="white" />
        <circle cx="22" cy="22" r="18" fill="${color}" />
        <g transform="translate(10, 10)">
           <path d="${path}" fill="white" transform="scale(0.9)"/>
        </g>
      </g>
    </svg>
  `;

    return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(44, 44),
        anchor: new google.maps.Point(22, 22), // Centraliza perfeitamente
    };
};