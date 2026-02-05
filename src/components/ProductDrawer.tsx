import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, Loader2, Check } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface ProductDrawerProps {
    product: any;
    isOpen: boolean;
    onClose: () => void;
}

interface AddonGroup {
    id: string;
    name: string;
    min_quantity: number;
    max_quantity: number;
    required: boolean;
    addon_items: AddonItem[];
}

interface AddonItem {
    id: string;
    group_id: string;
    name: string;
    price: number;
}

// Estrutura para controlar as seleções: { [groupId]: { [itemId]: quantidade } }
type Selections = Record<string, Record<string, number>>;

export function ProductDrawer({ product, isOpen, onClose }: ProductDrawerProps) {
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState("");
    const { addItem } = useCart();
    const { toast } = useToast();

    // Novos estados para adicionais
    const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
    const [loadingAddons, setLoadingAddons] = useState(false);
    const [selections, setSelections] = useState<Selections>({});

    // Reseta estados quando abre um produto novo
    useEffect(() => {
        if (isOpen && product) {
            setQuantity(1);
            setNotes("");
            setSelections({});
            fetchAddons(product.id);
        }
    }, [isOpen, product]);

    const fetchAddons = async (productId: string) => {
        setLoadingAddons(true);
        try {
            // Busca a relação N:N, depois os grupos e seus itens
            const { data, error } = await supabase
                .from('menu_item_addons')
                .select(`
                    addon_group_id,
                    addon_groups (
                        id, name, min_quantity, max_quantity, required,
                        addon_items ( id, group_id, name, price, active )
                    )
                `)
                .eq('menu_item_id', productId)
                .order('display_order', { ascending: true });

            if (error) throw error;

            // Formata os dados retornados
            const groups: AddonGroup[] = data.map((item: any) => ({
                id: item.addon_groups.id,
                name: item.addon_groups.name,
                min_quantity: item.addon_groups.min_quantity,
                max_quantity: item.addon_groups.max_quantity,
                required: item.addon_groups.required,
                addon_items: item.addon_groups.addon_items
                    .filter((i: any) => i.active)
                    .sort((a: any, b: any) => a.price - b.price) // Ordena itens por preço
            }));

            setAddonGroups(groups);
        } catch (error) {
            console.error("Erro ao buscar adicionais:", error);
        } finally {
            setLoadingAddons(false);
        }
    };

    // Lógica para adicionar/remover itens
    const updateSelection = (group: AddonGroup, item: AddonItem, delta: number) => {
        setSelections(prev => {
            const groupSelections = prev[group.id] || {};
            const currentQty = groupSelections[item.id] || 0;
            const totalGroupQty = Object.values(groupSelections).reduce((a, b) => a + b, 0);

            // Regra 1: Se for Rádio (Max 1), trocar direto
            if (group.max_quantity === 1 && delta > 0) {
                return {
                    ...prev,
                    [group.id]: { [item.id]: 1 } // Substitui qualquer seleção anterior
                };
            }

            // Regra 2: Validar Máximo do Grupo
            if (delta > 0 && totalGroupQty >= group.max_quantity) {
                toast({ title: `Máximo de ${group.max_quantity} opções neste grupo.`, variant: "destructive" });
                return prev;
            }

            // Regra 3: Atualizar Quantidade
            const newQty = Math.max(0, currentQty + delta);
            
            // Limpa chave se for 0 para não poluir o objeto
            const newGroupSelections = { ...groupSelections, [item.id]: newQty };
            if (newQty === 0) delete newGroupSelections[item.id];

            return {
                ...prev,
                [group.id]: newGroupSelections
            };
        });
    };

    // Preço unitário (Base + Adicionais)
    const unitPrice = useMemo(() => {
        if (!product) return 0;
        let addonsTotal = 0;
        
        addonGroups.forEach(group => {
            const groupSelections = selections[group.id];
            if (groupSelections) {
                Object.entries(groupSelections).forEach(([itemId, qty]) => {
                    const item = group.addon_items.find(i => i.id === itemId);
                    if (item) addonsTotal += item.price * qty;
                });
            }
        });

        return product.price + addonsTotal;
    }, [product, selections, addonGroups]);

    // Validação de Obrigatórios
    const isValid = useMemo(() => {
        for (const group of addonGroups) {
            if (group.required) {
                const groupSelections = selections[group.id] || {};
                const totalQty = Object.values(groupSelections).reduce((a, b) => a + b, 0);
                if (totalQty < group.min_quantity) return false;
            }
        }
        return true;
    }, [addonGroups, selections]);

    // Formatação da String Final
    const generateOrderDescription = () => {
        let descriptionParts: string[] = [];

        // Itera sobre os grupos para manter a ordem
        addonGroups.forEach(group => {
            const groupSelections = selections[group.id];
            if (groupSelections && Object.keys(groupSelections).length > 0) {
                const itemsStr = Object.entries(groupSelections)
                    .map(([itemId, qty]) => {
                        const item = group.addon_items.find(i => i.id === itemId);
                        // Se qtd > 1 mostra "2 x Cheddar", se não só "Cheddar"
                        return qty > 1 ? `${qty} x ${item?.name}` : item?.name;
                    })
                    .join(", ");
                
                descriptionParts.push(`${group.name}: ${itemsStr}`);
            }
        });

        const addonsText = descriptionParts.join(" | ");
        
        if (notes.trim()) {
            return addonsText ? `${addonsText} | Obs: ${notes}` : `Obs: ${notes}`;
        }
        
        return addonsText;
    };

    if (!product) return null;

    const handleAddToCart = () => {
        if (!isValid) {
            toast({ title: "Selecione os itens obrigatórios", variant: "destructive" });
            return;
        }

        const finalNotes = generateOrderDescription();

        addItem({
            id: product.id,
            marketId: product.market_id,
            name: product.name,
            price: unitPrice, // Preço já somado com adicionais
            image_url: product.image_url,
            quantity: quantity,
            notes: finalNotes // String formatada
        });

        toast({
            title: "Adicionado à sacola!",
            className: "bg-green-600 text-white border-none duration-2000"
        });

        onClose();
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 flex flex-col bg-white border-none focus:outline-none">

                {/* Capa do Produto */}
                <div className="h-56 w-full bg-gray-100 relative shrink-0">
                    {product.image_url ? (
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${product.image_url})` }} />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-400">Sem imagem</div>
                    )}
                    {/* Puxador Visual */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/50 rounded-full backdrop-blur-sm" />
                    
                    {/* Botão Fechar (Opcional UX) */}
                    <button onClick={onClose} className="absolute top-4 right-4 bg-white/80 p-2 rounded-full shadow-sm">
                        <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <SheetTitle className="text-2xl font-bold text-gray-900">{product.name}</SheetTitle>
                        <p className="text-lg font-bold text-green-600 mt-1">R$ {product.price?.toFixed(2)}</p>
                        <p className="text-gray-500 mt-2 text-sm leading-relaxed">{product.description}</p>
                    </div>

                    {/* --- LISTA DE ADICIONAIS --- */}
                    {loadingAddons ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-400" /></div>
                    ) : (
                        <div className="space-y-6">
                            {addonGroups.map(group => {
                                const currentQty = Object.values(selections[group.id] || {}).reduce((a, b) => a + b, 0);
                                const isSatisfied = !group.required || currentQty >= group.min_quantity;

                                return (
                                    <div key={group.id} className="space-y-3">
                                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                            <div>
                                                <h3 className="font-bold text-gray-800">{group.name}</h3>
                                                <p className="text-xs text-gray-500">
                                                    {group.max_quantity === 1 ? "Escolha 1 opção" : `Escolha até ${group.max_quantity} opções`}
                                                </p>
                                            </div>
                                            {group.required ? (
                                                <Badge variant={isSatisfied ? "default" : "destructive"} className={isSatisfied ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                                                    {isSatisfied ? <Check className="w-3 h-3 mr-1" /> : null}
                                                    Obrigatório
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-gray-500 bg-gray-200">Opcional</Badge>
                                            )}
                                        </div>

                                        <div className="space-y-0 divide-y divide-gray-100">
                                            {group.addon_items.map(item => {
                                                const qty = selections[group.id]?.[item.id] || 0;
                                                const isSelected = qty > 0;

                                                return (
                                                    <div key={item.id} className="flex justify-between items-center py-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                                            <span className="text-xs text-green-600 font-semibold">
                                                                {item.price > 0 ? `+ R$ ${item.price.toFixed(2)}` : 'Grátis'}
                                                            </span>
                                                        </div>

                                                        {/* CONTROLES */}
                                                        {group.max_quantity === 1 ? (
                                                            // MODO RADIO (Apenas 1 por grupo)
                                                            <div 
                                                                onClick={() => updateSelection(group, item, 1)}
                                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer ${isSelected ? 'border-green-600' : 'border-gray-300'}`}
                                                            >
                                                                {isSelected && <div className="w-3 h-3 bg-green-600 rounded-full" />}
                                                            </div>
                                                        ) : (
                                                            // MODO CONTADOR (Vários por grupo)
                                                            <div className="flex items-center gap-3">
                                                                {isSelected && (
                                                                    <>
                                                                        <button onClick={() => updateSelection(group, item, -1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-green-600 font-bold border border-gray-200">
                                                                            <Minus className="w-4 h-4" />
                                                                        </button>
                                                                        <span className="text-sm font-bold w-4 text-center">{qty}</span>
                                                                    </>
                                                                )}
                                                                <button 
                                                                    onClick={() => updateSelection(group, item, 1)} 
                                                                    className={`w-8 h-8 flex items-center justify-center rounded-full border transition-colors ${isSelected ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-400 border-gray-300 hover:border-green-500 hover:text-green-500'}`}
                                                                    disabled={currentQty >= group.max_quantity && !isSelected}
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    <div className="space-y-3 pt-4 border-t">
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
                        {/* Contador Global */}
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
                        <Button 
                            className={`flex-1 h-14 text-lg font-bold rounded-xl shadow-lg transition-all ${isValid ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`} 
                            onClick={handleAddToCart}
                            disabled={!isValid}
                        >
                            <div className="flex justify-between w-full items-center px-2">
                                <span>{isValid ? 'Adicionar' : 'Complete os itens'}</span>
                                <span>R$ {(unitPrice * quantity).toFixed(2)}</span>
                            </div>
                        </Button>
                    </div>
                </div>

            </SheetContent>
        </Sheet>
    );
}