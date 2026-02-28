import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFinancial } from '@/contexts/FinancialContext';
import { UserPlus, Trash2, Pencil, Save, X, Users, Crown, Car, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { InvitationDialog } from '@/components/shared/InvitationDialog';

export const DriversManagement: React.FC = () => {
  const { config, addDriver, updateDriver, removeDriver } = useFinancial();
  const { drivers, userProfile, assets } = config;

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDriver, setNewDriver] = useState({ name: '', email: '' });
  const [editData, setEditData] = useState({ name: '', email: '' });

  // Vehicle selection for new driver
  const vehicles = assets.filter(a => a.type === 'vehicle');
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);

  // Invitation dialog state
  const [showInvitation, setShowInvitation] = useState(false);
  const [inviteDriverName, setInviteDriverName] = useState('');
  const [inviteDriverEmail, setInviteDriverEmail] = useState('');
  const [inviteVehicleIds, setInviteVehicleIds] = useState<string[]>([]);

  // Ensure owner driver exists (only once)
  useEffect(() => {
    const ownerName = userProfile.firstName?.trim() || 'Proprietário';
    const ownerDriver = drivers.find(d => d.isOwner);
    
    if (!ownerDriver && drivers.every(d => !d.isOwner)) {
      addDriver(ownerName, userProfile.email, true);
    } else if (ownerDriver && ownerDriver.name !== ownerName && userProfile.firstName?.trim()) {
      updateDriver(ownerDriver.id, { name: ownerName });
    }
  }, [userProfile.firstName]);

  // Count non-owner drivers
  const nonOwnerDrivers = drivers.filter(d => !d.isOwner);
  const canAddMore = nonOwnerDrivers.length < 4;

  const handleAdd = () => {
    if (!newDriver.name.trim()) {
      toast.error('Informe o nome do motorista');
      return;
    }
    if (!canAddMore) {
      toast.error('Limite máximo de 5 motoristas atingido');
      return;
    }
    
    addDriver(newDriver.name, newDriver.email);
    
    // If email provided, show invitation dialog
    if (newDriver.email.trim()) {
      setInviteDriverName(newDriver.name.trim());
      setInviteDriverEmail(newDriver.email.trim());
      setInviteVehicleIds(selectedVehicleIds);
      setShowInvitation(true);
    }
    
    setNewDriver({ name: '', email: '' });
    setSelectedVehicleIds([]);
    setIsAdding(false);
    toast.success('Motorista adicionado');
  };

  const handleEdit = (id: string) => {
    const driver = drivers.find(d => d.id === id);
    if (driver && !driver.isOwner) {
      setEditData({ name: driver.name, email: driver.email || '' });
      setEditingId(id);
    }
  };

  const handleSaveEdit = () => {
    if (!editData.name.trim()) {
      toast.error('Informe o nome do motorista');
      return;
    }
    if (editingId) {
      updateDriver(editingId, { name: editData.name.trim(), email: editData.email.trim() || undefined });
      setEditingId(null);
      toast.success('Motorista atualizado');
    }
  };

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    const driver = drivers.find(d => d.id === id);
    if (driver?.isOwner) {
      toast.error('O proprietário não pode ser removido');
      return;
    }
    setDriverToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (driverToDelete) {
      removeDriver(driverToDelete);
      toast.success('Motorista removido');
      setDriverToDelete(null);
    }
    setDeleteConfirmOpen(false);
  };

  const handleSendInvite = (driver: typeof drivers[0]) => {
    if (!driver.email) {
      toast.error('Motorista não tem email cadastrado');
      return;
    }
    setInviteDriverName(driver.name);
    setInviteDriverEmail(driver.email);
    setInviteVehicleIds([]);
    setShowVehicleSelector(true);
  };

  const handleConfirmVehicleSelection = () => {
    setShowVehicleSelector(false);
    setShowInvitation(true);
  };

  const toggleVehicle = (id: string) => {
    setSelectedVehicleIds(prev => 
      prev.includes(id) 
        ? prev.filter(v => v !== id)
        : [...prev, id]
    );
  };

  const toggleInviteVehicle = (id: string) => {
    setInviteVehicleIds(prev => 
      prev.includes(id) 
        ? prev.filter(v => v !== id)
        : [...prev, id]
    );
  };

  // Sort drivers: owner first, then others
  const sortedDrivers = [...drivers].sort((a, b) => {
    if (a.isOwner) return -1;
    if (b.isOwner) return 1;
    return 0;
  });

  const inviterName = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Você';

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Motoristas
              </CardTitle>
              <CardDescription>
                Cadastre até 5 motoristas para registros de veículos ({drivers.length}/5)
              </CardDescription>
            </div>
            {!isAdding && canAddMore && (
              <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdding && (
            <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={newDriver.name}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do motorista"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email (para convite)</Label>
                  <Input
                    type="email"
                    value={newDriver.email}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              {/* Vehicle Selection */}
              {vehicles.length > 0 && newDriver.email && (
                <div className="space-y-2 pt-2 border-t">
                  <Label className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    Veículos com acesso
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Selecione os veículos que este motorista poderá lançar despesas
                  </p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {vehicles.map((vehicle) => (
                      <div 
                        key={vehicle.id} 
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/30"
                      >
                        <Checkbox
                          id={`vehicle-${vehicle.id}`}
                          checked={selectedVehicleIds.includes(vehicle.id)}
                          onCheckedChange={() => toggleVehicle(vehicle.id)}
                        />
                        <Label 
                          htmlFor={`vehicle-${vehicle.id}`} 
                          className="text-sm cursor-pointer flex-1"
                        >
                          {vehicle.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setIsAdding(false); setNewDriver({ name: '', email: '' }); setSelectedVehicleIds([]); }} className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleAdd} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {newDriver.email ? 'Salvar e Convidar' : 'Salvar'}
                </Button>
              </div>
            </div>
          )}

          {drivers.length === 0 && !isAdding && (
            <p className="text-muted-foreground text-center py-4">
              Nenhum motorista cadastrado
            </p>
          )}

          <div className="space-y-3">
            {sortedDrivers.map((driver) => (
              <div key={driver.id} className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg border">
                {editingId === driver.id && !driver.isOwner ? (
                  <>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        value={editData.name}
                        onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nome"
                      />
                      <Input
                        type="email"
                        value={editData.email}
                        onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Email"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleSaveEdit}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{driver.name}</p>
                        {driver.isOwner && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Crown className="h-3 w-3" />
                            Proprietário
                          </Badge>
                        )}
                      </div>
                      {driver.email && (
                        <p className="text-sm text-muted-foreground">{driver.email}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!driver.isOwner && (
                        <>
                          {driver.email && vehicles.length > 0 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSendInvite(driver)}
                              title="Enviar convite"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(driver.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(driver.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Selection Dialog for existing drivers */}
      <Dialog open={showVehicleSelector} onOpenChange={setShowVehicleSelector}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              Selecionar Veículos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Selecione os veículos que <strong>{inviteDriverName}</strong> poderá acessar para lançar despesas:
            </p>
            
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-4">
                Nenhum veículo cadastrado
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {vehicles.map((vehicle) => (
                  <div 
                    key={vehicle.id} 
                    className="flex items-center gap-2 p-3 rounded-md bg-muted/30 hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`invite-vehicle-${vehicle.id}`}
                      checked={inviteVehicleIds.includes(vehicle.id)}
                      onCheckedChange={() => toggleInviteVehicle(vehicle.id)}
                    />
                    <Label 
                      htmlFor={`invite-vehicle-${vehicle.id}`} 
                      className="text-sm cursor-pointer flex-1"
                    >
                      {vehicle.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowVehicleSelector(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmVehicleSelection} 
                disabled={inviteVehicleIds.length === 0}
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invitation Dialog */}
      <InvitationDialog
        open={showInvitation}
        onOpenChange={setShowInvitation}
        email={inviteDriverEmail}
        name={inviteDriverName}
        role="driver"
        inviterName={inviterName}
        metadata={{
          vehicleIds: inviteVehicleIds,
          vehicleNames: inviteVehicleIds.map(id => 
            vehicles.find(v => v.id === id)?.name || ''
          ).filter(Boolean),
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este motorista? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
