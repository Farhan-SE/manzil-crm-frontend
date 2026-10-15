"use client";

import { useState, type SubmitEvent } from "react";
import {
  createRole,
  updateRole,
  type PermissionModule,
  type Role,
  type RoleGrant,
  type Scope,
} from "@/lib/api";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-ink placeholder:text-placeholder focus:outline-none";

const SCOPES: { id: Scope; label: string; hint: string }[] = [
  { id: "own", label: "Own", hint: "Only what is assigned to them" },
  { id: "team", label: "Team", hint: "Theirs and the people they lead" },
  { id: "all", label: "All", hint: "Everything in the company" },
];

const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

export function RoleFormModal({
  initial,
  catalogue,
  onClose,
  onSaved,
}: {
  initial: Role | null;
  catalogue: PermissionModule[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const readOnly = Boolean(initial?.is_system);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  const [grants, setGrants] = useState<Map<string, Scope | null>>(
    () => new Map((initial?.permissions ?? []).map((grant) => [grant.permission, grant.scope])),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: string, scoped: boolean) {
    setGrants((current) => {
      const next = new Map(current);
      if (next.has(key)) next.delete(key);
      // A newly ticked scoped permission starts at the narrowest reach.
      else next.set(key, scoped ? "own" : null);
      return next;
    });
  }

  function setScope(key: string, scope: Scope) {
    setGrants((current) => new Map(current).set(key, scope));
  }

  function toggleModule(module: PermissionModule, on: boolean) {
    setGrants((current) => {
      const next = new Map(current);
      for (const permission of module.permissions) {
        if (!on) next.delete(permission.key);
        else if (!next.has(permission.key)) next.set(permission.key, permission.scoped ? "own" : null);
      }
      return next;
    });
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (readOnly) return onClose();
    setError(null);
    setIsSubmitting(true);
    const permissions: RoleGrant[] = [...grants].map(([permission, scope]) => ({ permission, scope }));
    try {
      const dto = { name: name.trim(), description: description.trim(), permissions };
      // Default can only be turned on here; turning it off means making another role the default.
      if (initial) await updateRole(initial.id, { ...dto, ...(isDefault && !initial.is_default ? { is_default: true } : {}) });
      else await createRole({ ...dto, is_default: isDefault || undefined });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-sidebar shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-form-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <h2 id="role-form-title" className="font-serif text-2xl font-bold text-ink" style={headingStyle}>
            {readOnly ? initial?.name : initial ? "Edit role" : "Add role"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-ink">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6">
            {readOnly ? (
              <p className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-muted">
                The Admin role always has every permission over the whole company, including any added later.
                It can&apos;t be changed or deleted.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="role-name" className="text-sm text-muted">
                      Role name
                      <span className="text-hot"> *</span>
                    </label>
                    <input
                      id="role-name"
                      type="text"
                      required
                      maxLength={60}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Team Leader"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="role-description" className="text-sm text-muted">
                      Description
                    </label>
                    <input
                      id="role-description"
                      type="text"
                      maxLength={300}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What this role is for"
                      className={inputClass}
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    disabled={initial?.is_default}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-ink"
                  />
                  <span>
                    Default role for new staff
                    <span className="block text-xs text-muted">
                      {initial?.is_default
                        ? "This is the default. Make another role the default to change it."
                        : "Staff added by someone who can't choose roles get this one."}
                    </span>
                  </span>
                </label>
              </>
            )}

            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-ink">Permissions</p>
              <p className="text-xs text-muted">
                Own, Team and All set whose records a permission reaches. A team is the people someone leads or
                manages.
              </p>
            </div>

            {catalogue.map((module) => {
              const granted = module.permissions.filter((permission) => grants.has(permission.key)).length;
              const allOn = granted === module.permissions.length;
              return (
                <section key={module.module} className="rounded-xl border border-border bg-white">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <p className="text-sm font-bold text-ink">{module.module}</p>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => toggleModule(module, !allOn)}
                        className="text-xs font-semibold text-primary transition-colors hover:text-ink"
                      >
                        {allOn ? "Clear all" : "Select all"}
                      </button>
                    )}
                  </div>
                  <ul className="divide-y divide-border">
                    {module.permissions.map((permission) => {
                      const checked = grants.has(permission.key);
                      const scope = grants.get(permission.key);
                      return (
                        <li
                          key={permission.key}
                          className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                        >
                          <label className="flex min-w-0 items-center gap-3 text-sm text-ink">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={readOnly}
                              onChange={() => toggle(permission.key, permission.scoped)}
                              className="size-4 shrink-0 accent-ink"
                            />
                            {permission.label}
                          </label>
                          {permission.scoped && (
                            <div
                              role="radiogroup"
                              aria-label={`${permission.label} — reach`}
                              className="grid shrink-0 grid-cols-3 gap-1.5 pl-7 sm:pl-0"
                            >
                              {SCOPES.map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  role="radio"
                                  aria-checked={checked && scope === option.id}
                                  title={option.hint}
                                  disabled={readOnly || !checked}
                                  onClick={() => setScope(permission.key, option.id)}
                                  className={`rounded-lg border px-3 py-1 text-xs font-bold transition-colors disabled:cursor-not-allowed ${
                                    checked && scope === option.id
                                      ? "border-ink bg-ink text-white"
                                      : "border-border bg-white text-ink disabled:text-placeholder"
                                  }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-4 sm:px-6">
            <p className="text-xs text-muted">
              {grants.size} permission{grants.size === 1 ? "" : "s"}
            </p>
            {error && <p className="min-w-0 flex-1 text-sm text-hot">{error}</p>}
            <div className="flex items-center gap-4">
              {!readOnly && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm font-medium text-muted transition-colors hover:text-ink"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {readOnly ? "Close" : isSubmitting ? "Saving..." : initial ? "Save role" : "Add role"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
