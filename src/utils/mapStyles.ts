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

// --- CORES PARA CADA TIPO DE LOCAL ---
const CATEGORY_COLORS: Record<string, string> = {
    Restaurante: "#EF4444", // Vermelho
    Bar: "#8B5CF6",         // Roxo
    Balada: "#7C3AED",      // Roxo Escuro
    Cafeteria: "#78350F",   // Marrom Café
    Lanchonete: "#F59E0B",  // Laranja
    Pizzaria: "#DC2626",    // Vermelho Escuro
    Doceria: "#DB2777",     // Rosa Pink
    Sorveteria: "#0EA5E9",  // Azul Claro
    Adega: "#4C1D95",       // Indigo
    Quiosque: "#06B6D4",    // Ciano (Praia)
    Default: "#10B981",     // Verde
};

// --- ÍCONES VETORIAIS (PATHS) ---
const ICONS_PATH: Record<string, string> = {
    // Garfo e Faca
    Restaurante: "M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z",

    // Caneca de Chopp
    Bar: "M21 5.5V17c0 2.76-2.24 5-5 5h-9c-2.76 0-5-2.24-5-5V5.5c0-1.1.9-2 2-2h1c0-1.66 1.34-3 3-3s3 1.34 3 3h4c1.1 0 2 .9 2 2zm-2 0h-2v-1h-2v1h-2v-1H9v1H4v11.5c0 1.65 1.35 3 3 3h9c1.65 0 3-1.35 3-3V5.5z M23 8h-2v6h2V8z",

    // Globo de Balada
    Balada: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z M12 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",

    // Xícara de Café
    Cafeteria: "M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z",

    // Hambúrguer
    Lanchonete: "M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.93 0 3.68 1.18 4.43 2.87.04.1.07.2.07.31V6.5h-9v-.31c0-.11.03-.21.07-.31C8.32 4.18 10.07 3 12 3zM5 13v2c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-2H5z",

    // Fatia de Pizza
    Pizzaria: "M12 2C8.43 2 5.23 3.54 3.01 6L12 22l8.99-16C18.78 3.55 15.57 2 12 2zM7 7c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm5 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",

    // Cupcake/Brigadeiro
    Doceria: "M17 7c0-2.76-2.24-5-5-5S7 4.24 7 7c0 1.22.44 2.34 1.17 3.21C7.14 10.74 6.27 11.66 6 13h12c-.27-1.34-1.14-2.26-2.17-2.79C16.56 9.34 17 8.22 17 7zM7 15h10v2h-3v5h-4v-5H7z",

    // Casquinha de Sorvete
    Sorveteria: "M18.14 10c0-3.31-2.69-6-6-6h-.28C11.53 2.18 9.94 1 8 1 4.69 1 2 3.69 2 7c0 2.5 1.55 4.64 3.76 5.57L9 23l3.24-10.43c3.4-.28 5.9-3.23 5.9-6.57z",

    // Garrafa de Bebida
    Adega: "M15 12h-1V5c0-.55-.45-1-1-1H9c-.55 0-1 .45-1 1v7H7c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2zM9 5h2v6H9V5zm0 8h2v1.5H9V13zm0 3.5h2V18H9v-1.5z",

    // Coqueiro (Quiosque)
    Quiosque: "M19.98 9.87c-.82-3.05-3.48-5.32-6.66-5.77C12.53 1.95 9.92.54 6.95.54c-1.53 0-2.96.38-4.23 1.05C1.83 2.14 1 3.24 1 4.5c0 1.34.85 2.5 2.08 2.97-.24.5-.38 1.06-.38 1.65 0 2.21 1.79 4 4 4 .28 0 .55-.03.81-.08C7.94 15.06 9.8 16.5 12 16.5c.2 0 .4-.01.59-.04 1.25 1.54 3.14 2.54 5.29 2.54 3.87 0 7-3.13 7-7 0-1.07-.24-2.08-.66-2.99zM7 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm5 5.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 2.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",

    // Loja Padrão
    Default: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
};

// Helper para encontrar a chave correta (normalizando nomes compostos como "Sorveteria & Açaí")
const getKey = (category: string) => {
    const norm = category?.toLowerCase() || "";
    if (norm.includes("restaurante")) return "Restaurante";
    if (norm.includes("bar")) return "Bar";
    if (norm.includes("balada")) return "Balada";
    if (norm.includes("café") || norm.includes("cafeteria")) return "Cafeteria";
    if (norm.includes("lanchonete") || norm.includes("hamburgueria")) return "Lanchonete";
    if (norm.includes("pizzaria") || norm.includes("pizza")) return "Pizzaria";
    if (norm.includes("doceria") || norm.includes("doce") || norm.includes("confeitaria")) return "Doceria";
    if (norm.includes("sorveteria") || norm.includes("açaí") || norm.includes("gelato")) return "Sorveteria";
    if (norm.includes("adega") || norm.includes("bebida") || norm.includes("licor")) return "Adega";
    if (norm.includes("quiosque")) return "Quiosque";
    return "Default";
};

// MODIFICADO: Aceita isOpen para definir a cor
export const getMarkerIcon = (category: string, isOpen: boolean = true) => {
    const key = getKey(category);

    // Se estiver aberto, usa a cor da categoria. Se fechado, usa Cinza Escuro (Slate-700)
    const color = isOpen ? (CATEGORY_COLORS[key] || CATEGORY_COLORS.Default) : "#334155";
    const path = ICONS_PATH[key] || ICONS_PATH.Default;

    // SVG Circular Moderno
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