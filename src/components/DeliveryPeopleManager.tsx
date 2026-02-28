import { useState, useEffect, useCallback } from "react";
import { Plus, Phone, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { fetchDeliveryPeople, insertDeliveryPerson, deleteDeliveryPerson } from "@/lib/supabase-data";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface DeliveryPerson {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  onUpdate?: () => void;
}

export default function DeliveryPeopleManager({ onUpdate }: Props) {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const [people, setPeople] = useState<DeliveryPerson[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setPeople(await fetchDeliveryPeople());
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!name.trim()) {
      toast({ title: "Ingresa un nombre", variant: "destructive" });
      return;
    }
    try {
      await insertDeliveryPerson({ name: name.trim(), phone: phone.trim(), created_by: user!.id });
      setName("");
      setPhone("");
      await load();
      onUpdate?.();
      toast({ title: "Repartidor registrado ✓" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDeliveryPerson(id);
      await load();
      onUpdate?.();
      toast({ title: "Repartidor desactivado" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  if (role !== "admin") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <User className="h-4 w-4 mr-1" /> Repartidores
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gestión de Repartidores</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Teléfono</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 123 4567" />
            </div>
          </div>
          <Button onClick={handleAdd} size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Agregar Repartidor
          </Button>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {people.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No hay repartidores registrados</p>
            ) : (
              people.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Desactivar a {p.name}?</AlertDialogTitle>
                        <AlertDialogDescription>Ya no aparecerá en la lista de selección.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(p.id)}>Desactivar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
          </div>
        </div>
        <DialogClose asChild>
          <Button variant="outline" className="w-full">Cerrar</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
