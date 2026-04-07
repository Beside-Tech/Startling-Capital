import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  UserCog,
  Power,
  PowerOff,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders() {
  const token = localStorage.getItem("auth_token") ?? "";
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...authHeaders(), ...opts?.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

type SysUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
};

const ROLE_META: Record<string, { label: string; color: string; icon: typeof ShieldCheck }> = {
  SuperAdmin:      { label: "Super Admin",      color: "bg-amber-100 text-amber-800 border-amber-200",   icon: ShieldCheck },
  Admin:           { label: "Admin",            color: "bg-blue-100 text-blue-800 border-blue-200",     icon: Shield },
  Judge:           { label: "Judge",            color: "bg-purple-100 text-purple-800 border-purple-200", icon: UserCog },
  Founder:         { label: "Founder",          color: "bg-teal-100 text-teal-800 border-teal-200",     icon: Users },
  IC:              { label: "IC Member",        color: "bg-violet-100 text-violet-800 border-violet-200", icon: Shield },
  ManagingPartner: { label: "Managing Partner", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: ShieldCheck },
  LP:              { label: "LP Investor",      color: "bg-orange-100 text-orange-800 border-orange-200", icon: Users },
};

function roleMeta(role: string) {
  return ROLE_META[role] ?? { label: role, color: "bg-gray-100 text-gray-800 border-gray-200", icon: UserCog };
}

const ROLE_OPTIONS = ["SuperAdmin", "Admin", "Judge", "Founder", "IC", "ManagingPartner", "LP"] as const;

export default function AdminUsersPage() {
  return (
    <ProtectedRoute superAdminOnly>
      <AppLayout>
        <AdminUsersInner />
      </AppLayout>
    </ProtectedRoute>
  );
}

function AdminUsersInner() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SysUser | null>(null);

  const { data: users = [], isLoading } = useQuery<SysUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => apiFetch("/api/admin/users"),
  });

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || [u.name, u.email, u.role].some((v) => v?.toLowerCase().includes(q));
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      apiFetch(`/api/admin/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Role updated" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiFetch(`/api/admin/users/${id}/active`, { method: "PUT", body: JSON.stringify({ active }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User status updated" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User deleted" });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const roleCounts = Object.fromEntries(
    ROLE_OPTIONS.map((r) => [r, users.filter((u) => u.role === r).length])
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-amber-500" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all platform accounts, roles, and access. Super Admin eyes only.
          </p>
        </div>
        <Button
          className="gap-2 bg-amber-500 hover:bg-amber-600 text-white border-0"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4" />
          Create Account
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {ROLE_OPTIONS.map((role) => {
          const meta = roleMeta(role);
          const cnt = users.filter((u) => {
            const ur = u.role.toLowerCase().replace(/\s/g, "");
            const r = role.toLowerCase().replace(/\s/g, "");
            return ur === r;
          }).length;
          return (
            <Card key={role} className="cursor-pointer" onClick={() => setFilterRole(filterRole === role ? "all" : role)}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground truncate">{meta.label}</p>
                <p className="text-2xl font-bold text-foreground">{cnt}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Search users by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {users.length} users
        </span>
      </div>

      {/* User table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading users...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No users found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filtered.map((u) => {
                const meta = roleMeta(u.role);
                const isSelf = u.email === currentUser?.email;
                return (
                  <div key={u.id} className={`flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors ${!u.active ? "opacity-60" : ""}`}>
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full gradient-teal flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {initials(u.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-foreground truncate">{u.name}</p>
                        {isSelf && (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5">You</span>
                        )}
                        {!u.active && (
                          <span className="text-[10px] font-semibold text-muted-foreground bg-secondary rounded-full px-1.5 py-0.5">Inactive</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>

                    {/* Role badge + change */}
                    <div className="shrink-0 flex items-center gap-2">
                      <Badge className={`text-[10px] ${meta.color} border`}>
                        {meta.label}
                      </Badge>
                      {!isSelf && (
                        <Select
                          value={u.role}
                          onValueChange={(newRole) => changeRole.mutate({ id: u.id, role: newRole })}
                        >
                          <SelectTrigger className="h-7 w-36 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem key={r} value={r} className="text-xs">
                                {roleMeta(r).label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Last login + Join date */}
                    <div className="shrink-0 hidden lg:flex flex-col items-end gap-0.5">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">Last login</p>
                        <p className="text-xs text-foreground">
                          {u.lastLoginAt
                            ? new Date(u.lastLoginAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
                            : "Never"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">Member since</p>
                        <p className="text-xs text-foreground">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {!isSelf && (
                      <div className="shrink-0 flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={u.active ? "Deactivate user" : "Activate user"}
                          onClick={() => toggleActive.mutate({ id: u.id, active: !u.active })}
                        >
                          {u.active
                            ? <PowerOff className="h-3.5 w-3.5 text-muted-foreground" />
                            : <Power className="h-3.5 w-3.5 text-green-600" />
                          }
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Delete user"
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create admin modal */}
      {showCreateModal && (
        <CreateAdminModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["admin-users"] });
            setShowCreateModal(false);
            toast({ title: "Admin account created!" });
          }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete User?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will permanently delete <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) and all associated founder data. This cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => deleteUser.mutate(deleteTarget.id)}
                disabled={deleteUser.isPending}
              >
                {deleteUser.isPending ? "Deleting..." : "Delete User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const ROLE_GROUPS = [
  { label: "Accelerator", roles: ["Admin", "SuperAdmin", "Judge", "Founder"] },
  { label: "Nobellum Ventures", roles: ["IC", "ManagingPartner", "LP"] },
];

function CreateAdminModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("Admin");

  const create = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ name, email, pin, role }),
      }),
    onSuccess: onCreated,
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-sm font-medium">Full Name *</label>
            <Input
              className="mt-1"
              placeholder="e.g. Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email Address *</label>
            <Input
              className="mt-1"
              type="email"
              placeholder="e.g. jane@nobellum.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Initial PIN * (min 4 chars)</label>
            <Input
              className="mt-1"
              placeholder="Set a secure PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_GROUPS.map(group => (
                  <div key={group.label}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group.label}</div>
                    {group.roles.map(r => (
                      <SelectItem key={r} value={r}>{roleMeta(r).label}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-white border-0"
            onClick={() => create.mutate()}
            disabled={create.isPending || !name || !email || !pin}
          >
            {create.isPending ? "Creating..." : "Create Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
