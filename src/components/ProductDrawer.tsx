import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

interface ProductDrawerProps {
    product: any;
    isOpen: boolean;
    onClose: () => void;
}

export function ProductDrawer({ product, isOpen, onClose }: ProductDrawerProps) {
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState("");
    const { addItem } = useCart();
    const { toast } = useToast();

    // Reseta estados quando abre um produto novo
    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            setNotes("");
        }
    }, [isOpen, product]);

    if (!product) return null;

    const handleAddToCart = () => {
        addItem({
            id: product.id,
            marketId: product.market_id,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            quantity: quantity,
            notes: notes
        });

        toast({
            title: "Adicionado à sacola!",
            className: "bg-green-600 text-white border-none duration-2000"
        });

        onClose();
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 flex flex-col bg-white border-none focus:outline-none">

                {/* Capa do Produto */}
                <div className="h-64 w-full bg-gray-100 relative shrink-0">
                    {product.image_url ? (
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${product.image_url})` }} />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-400">Sem imagem</div>
                    )}
                    {/* Puxador Visual */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/50 rounded-full backdrop-blur-sm" />
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <SheetTitle className="text-2xl font-bold text-gray-900">{product.name}</SheetTitle>
                        <p className="text-lg font-bold text-green-600 mt-1">R$ {product.price?.toFixed(2)}</p>
                        <p className="text-gray-500 mt-2 text-sm leading-relaxed">{product.description}</p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            Alguma observação?
                            <span className="text-xs font-normal text-gray-400">(Opcional)</span>
                        </label>
                        <Textarea
                            placeholder="Ex: Tirar a cebola, caprichar no molho..."
                            className="bg-gray-50 border-gray-200 resize-none h-24 focus:ring-green-500"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer Fixo de Ação */}
                <div className="p-4 border-t bg-white pb-8">
                    <div className="flex gap-4 items-center">
                        {/* Contador */}
                        <div className="flex items-center border border-gray-200 rounded-xl h-14 px-2 bg-gray-50">
                            <Button variant="ghost" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="h-10 w-10 text-gray-600 hover:bg-white">
                                <Minus className="w-5 h-5" />
                            </Button>
                            <span className="w-10 text-center font-bold text-lg">{quantity}</span>
                            <Button variant="ghost" size="icon" onClick={() => setQuantity(q => q + 1)} className="h-10 w-10 text-green-600 hover:bg-white">
                                <Plus className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Botão Adicionar */}
                        <Button className="flex-1 h-14 text-lg font-bold bg-green-600 hover:bg-green-700 rounded-xl shadow-lg shadow-green-600/20" onClick={handleAddToCart}>
                            <div className="flex justify-between w-full items-center px-2">
                                <span>Adicionar</span>
                                <span>R$ {(product.price * quantity).toFixed(2)}</span>
                            </div>
                        </Button>
                    </div>
                </div>

            </SheetContent>
        </Sheet>
    );
}