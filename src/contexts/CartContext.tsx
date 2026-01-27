import { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
    id: string; // ID do produto no banco
    marketId: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    image_url?: string;
    cartItemId: string; // ID único na sacola (ex: 2 Hamburgueres iguais com obs diferentes)
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: Omit<CartItem, "cartItemId">) => void;
    removeItem: (cartItemId: string) => void;
    clearCart: () => void;
    marketId: string | null;
    total: number;
    itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [marketId, setMarketId] = useState<string | null>(null);

    // 1. Carrega do celular ao abrir
    useEffect(() => {
        const savedCart = localStorage.getItem("ondeir_cart");
        if (savedCart) {
            try {
                const parsed = JSON.parse(savedCart);
                setItems(parsed.items || []);
                setMarketId(parsed.marketId || null);
            } catch (e) {
                console.error("Erro ao ler carrinho antigo", e);
            }
        }
    }, []);

    // 2. Salva no celular sempre que mudar
    useEffect(() => {
        localStorage.setItem("ondeir_cart", JSON.stringify({ items, marketId }));
    }, [items, marketId]);

    const addItem = (newItem: Omit<CartItem, "cartItemId">) => {
        // Proteção: Se tentar adicionar item de outro restaurante
        if (marketId && marketId !== newItem.marketId) {
            if (!confirm("Você tem itens de outro restaurante na sacola. Deseja limpar a sacola atual e iniciar um novo pedido aqui?")) return;
            setItems([]); // Limpa o anterior
        }

        setMarketId(newItem.marketId);

        // Adiciona com ID único
        setItems((prev) => [
            ...prev,
            { ...newItem, cartItemId: Math.random().toString(36).substr(2, 9) }
        ]);
    };

    const removeItem = (cartItemId: string) => {
        setItems((prev) => {
            const newItems = prev.filter((i) => i.cartItemId !== cartItemId);
            if (newItems.length === 0) setMarketId(null); // Se esvaziou, libera pra outro restaurante
            return newItems;
        });
    };

    const clearCart = () => {
        setItems([]);
        setMarketId(null);
    };

    const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, clearCart, marketId, total, itemCount }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error("useCart must be used within a CartProvider");
    return context;
};