import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CartFloatingBar() {
    const { itemCount, total } = useCart();
    const navigate = useNavigate();

    if (itemCount === 0) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-500">
            <Button
                className="w-full h-16 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl shadow-2xl flex justify-between items-center px-6 transition-all active:scale-[0.98] border border-gray-700"
                onClick={() => navigate(`/checkout`)}
            >
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm relative">
                        <ShoppingBag className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                            {itemCount}
                        </span>
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="font-bold text-base">Ver Sacola</span>
                        <span className="text-xs opacity-70 font-light">Ir para pagamento</span>
                    </div>
                </div>
                <span className="font-bold text-lg">R$ {total.toFixed(2)}</span>
            </Button>
        </div>
    );
}