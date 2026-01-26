import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Pencil, Trash2, Shield, ShieldAlert, Power, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AccessControl() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "user",
        active: true
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('admin-users', {
                body: { action: 'list' }
            });
            if (error) throw error;
            setUsers(data.users || []);
        } catch (error: any) {
            toast({ title: "Erro", description: "Falha ao carregar usuários: " + error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.email || !formData.name) return;
        if (!editingUser && !formData.password) {
            toast({ title: "Senha obrigatória", description: "Defina uma senha para novos usuários", variant: "destructive" });
            return;
        }

        setActionLoading(true);
        try {
            const action = editingUser ? 'update' : 'create';
            const payload = {
                id: editingUser?.id,
                ...formData
            };

            const { error } = await supabase.functions.invoke('admin-users', {
                body: { action, payload }
            });

            if (error) throw error;

            toast({ title: "Sucesso!", description: `Usuário ${editingUser ? 'atualizado' : 'criado'} com sucesso.` });
            setIsDialogOpen(false);
            resetForm();
            fetchUsers();

        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este usuário permanentemente?")) return;

        try {
            const { error } = await supabase.functions.invoke('admin-users', {
                body: { action: 'delete', payload: { id } }
            });
            if (error) throw error;
            toast({ title: "Usuário excluído" });
            fetchUsers();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const handleEditClick = (user: any) => {
        setEditingUser(user);
        setFormData({
            name: user.display_name,
            email: user.email,
            password: "", // Senha em branco na edição significa "não alterar"
            role: user.role,
            active: !user.banned_until
        });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setEditingUser(null);
        setFormData({ name: "", email: "", password: "", role: "user", active: true });
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin': return <Badge className="bg-red-500 hover:bg-red-600"><ShieldAlert className="w-3 h-3 mr-1" /> Admin</Badge>;
            case 'partner': return <Badge className="bg-blue-500 hover:bg-blue-600"><Shield className="w-3 h-3 mr-1" /> Parceiro</Badge>;
            default: return <Badge variant="secondary">Usuário</Badge>;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="text-primary" /> Gestão de Acesso
                    </h1>
                    <p className="text-gray-500">Administre usuários, permissões e status.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button><UserPlus className="w-4 h-4 mr-2" /> Novo Usuário</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Criar Novo Usuário'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome Completo</label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">E-mail</label>
                                <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={!!editingUser} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Senha {editingUser && "(Deixe em branco para manter)"}</label>
                                <Input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nível de Acesso</label>
                                    <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">Usuário Comum</SelectItem>
                                            <SelectItem value="partner">Parceiro (Dono)</SelectItem>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {editingUser && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Status</label>
                                        <Select value={formData.active ? 'true' : 'false'} onValueChange={v => setFormData({ ...formData, active: v === 'true' })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">Ativo</SelectItem>
                                                <SelectItem value="false">Inativo (Banido)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            <Button className="w-full mt-4" onClick={handleSubmit} disabled={actionLoading}>
                                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Função</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Último Acesso</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">Nenhum usuário encontrado.</TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={user.avatar_url} />
                                            <AvatarFallback>{user.display_name?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{user.display_name}</span>
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                                    <TableCell>
                                        {user.banned_until ? (
                                            <Badge variant="destructive" className="flex w-fit items-center gap-1"><Power className="w-3 h-3" /> Inativo</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 flex w-fit items-center gap-1">Ativo</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {user.last_sign_in_at
                                            ? format(new Date(user.last_sign_in_at), "dd 'de' MMM, HH:mm", { locale: ptBR })
                                            : "Nunca acessou"
                                        }
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                                                <Pencil className="w-4 h-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}