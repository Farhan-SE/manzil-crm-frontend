"use client";

import { useCallback, useEffect, useState } from "react";
import { ViewTransition } from "react";
import { PlusIcon } from "@/components/icons/DashboardIcons";
import { RowMenu } from "@/components/list/RowMenu";
import { StatusBadge } from "@/components/list/StatusBadge";
import { headCellClass, headRowClass, rowClass, subTextClass, tableClass } from "@/components/list/tableStyles";
import { RoleFormModal } from "@/components/roles/RoleFormModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { SpanCell } from "@/components/list/SpanCell";
import {
  deleteRole,
  getPermissionCatalogue,
  getRoles,
  updateRole,
  type PermissionModule,
  type Role,
  type Scope,
} from "@/lib/api";
import { refreshAccess, useAccess, useCan } from "@/lib/session";

const COLUMN_COUNT = 5;

const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

const headerActionClass =
  "flex h-9 shrink-0 items-center gap-[7px] rounded-[4px] border border-border bg-white px-4 text-xs leading-[1.4] text-primary transition-colors hover:bg-sidebar disabled:opacity-60";

const SCOPE_LABELS: Record<Scope, string> = { own: "Own", team: "Team", all: "All" };

/** The reach a role has on the records most screens list, e.g. "Leads: Team · Clients: Own". */
function reachSummary(role: Role) {
  const reach = (key: string) => role.permissions.find((grant) => grant.permission === key)?.scope;
  const parts = [
    ["Leads", reach("leads.view")],
    ["Clients", reach("customers.view")],
    ["Payments", reach("payments.view")],
  ] as const;
  const shown = parts.filter(([, scope]) => scope).map(([label, scope]) => `${label}: ${SCOPE_LABELS[scope!]}`);
  return shown.length > 0 ? shown.join(" · ") : "No lead or client access";
}

export default function RolesPage() {
  const canManage = useCan("roles.manage");
  const myRoleId = useAccess()?.role?.id;

  const [roles, setRoles] = useState<Role[]>([]);
  const [catalogue, setCatalogue] = useState<PermissionModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRoles(await getRoles());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    getPermissionCatalogue().then(setCatalogue).catch(() => {});
  }, [load]);

  async function run(action: Promise<unknown>) {
    try {
      await action;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that role.");
    }
    void load();
  }

  function openForm(role: Role | null) {
    setEditing(role);
    setIsFormOpen(true);
  }

  async function handleDelete(role: Role) {
    if (!window.confirm(`Delete the role "${role.name}"?`)) return;
    await run(deleteRole(role.id));
  }

  const permissionCount = catalogue.reduce((sum, module) => sum + module.permissions.length, 0);

  return (
    <ViewTransition>
      <div className="flex w-full flex-col pb-8">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <div className="flex flex-col gap-[3px] leading-[1.4]">
            <h1 className="font-serif text-xl font-bold text-ink" style={headingStyle}>
              Roles
            </h1>
            <p className="text-[11px] text-muted">Access control · What each role can see and do</p>
          </div>
          {canManage && (
            <button type="button" onClick={() => openForm(null)} className={headerActionClass}>
              <PlusIcon className="size-2.5" />
              Add role
            </button>
          )}
        </div>

        {error && <p className="mx-4 mt-4 rounded-[4px] bg-hot/10 px-4 py-3 text-xs text-hot sm:mx-8">{error}</p>}

        <div className="px-4 sm:px-8">
          <table className={tableClass}>
            <thead>
              <tr className={headRowClass}>
                <th scope="col" className={headCellClass}>Role</th>
                <th scope="col" className={`${headCellClass} hidden w-[34%] lg:table-cell`}>Reach</th>
                <th scope="col" className={`${headCellClass} w-[20%] lg:w-[10%]`}>Members</th>
                <th scope="col" className={`${headCellClass} hidden w-[16%] sm:table-cell`}>Permissions</th>
                <th scope="col" className={`${headCellClass} w-[40px] text-[11px] lg:w-[5%]`}><span className="sr-only lg:not-sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className={rowClass}>
                    <SpanCell colSpan={COLUMN_COUNT}>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-2.5 w-1/5" />
                      </div>
                    </SpanCell>
                  </tr>
                ))}

              {!isLoading &&
                roles.map((role) => (
                  <tr
                    key={role.id}
                    onClick={() => openForm(role)}
                    className={`${rowClass} cursor-pointer hover:bg-white/60`}
                  >
                    <td className="pr-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="truncate">{role.name}</p>
                        {role.is_system && <StatusBadge tone="success">Full access</StatusBadge>}
                        {role.is_default && <StatusBadge>Default</StatusBadge>}
                        {role.id === myRoleId && <StatusBadge tone="warning">Your role</StatusBadge>}
                      </div>
                      <p className={subTextClass}>{role.description ?? "No description"}</p>
                    </td>
                    <td className="hidden pr-3 lg:table-cell">
                      <p className="truncate">{role.is_system ? "Everything, company-wide" : reachSummary(role)}</p>
                    </td>
                    <td className="pr-3">{role.user_count}</td>
                    <td className="hidden pr-3 sm:table-cell">
                      {role.permissions.length}
                      {permissionCount > 0 && <span className="text-muted"> of {permissionCount}</span>}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        label={`More actions for ${role.name}`}
                        items={[
                          { label: role.is_system ? "View role" : "Edit role", onClick: () => openForm(role) },
                          ...(canManage && !role.is_default && !role.is_system
                            ? [
                                {
                                  label: "Make default for new staff",
                                  onClick: () => void run(updateRole(role.id, { is_default: true })),
                                },
                              ]
                            : []),
                          ...(canManage && !role.is_system && !role.is_default
                            ? [{ label: "Delete role", onClick: () => void handleDelete(role) }]
                            : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <RoleFormModal
          key={editing?.id ?? "new-role"}
          initial={editing}
          catalogue={catalogue}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => {
            void load();
            // Editing your own role changes what you can do right away.
            if (editing?.id === myRoleId) refreshAccess();
          }}
        />
      )}
    </ViewTransition>
  );
}
