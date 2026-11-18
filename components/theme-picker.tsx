"use client";

import { Input } from "@/components/ui/input";
import { MAX_THEME_SELECTION, THEMES, toggleTheme, type Theme } from "@/lib/themes";
import { useMemo, useState } from "react";

type ThemePickerProps = {
  selected: Theme[];
  onChange: (next: Theme[]) => void;
};

export function ThemePicker({ selected, onChange }: ThemePickerProps) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const visible = useMemo(() => {
    if (!normalized) return THEMES;
    return THEMES.filter((entry) => entry.label.toLowerCase().includes(normalized));
  }, [normalized]);

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">Endorsements (themes)</legend>
      <p className="text-sm text-muted-foreground">
        Choose up to {MAX_THEME_SELECTION}. They appear comma-separated on the passport.
      </p>
      <Input
        value={query}
        placeholder="Search themes…"
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search themes"
        {...{ onValueChange: setQuery }}
      />
      <div className="max-h-52 overflow-y-auto rounded-lg border border-border p-2">
        <div className="grid gap-1">
          {visible.length === 0 ? (
            <p className="px-2 py-1 text-sm text-muted-foreground">No themes match that search.</p>
          ) : (
            visible.map((entry) => {
              const checked = selected.includes(entry.id as Theme);
              const disabled = !checked && selected.length >= MAX_THEME_SELECTION;
              return (
                <label
                  key={entry.id}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                    disabled ? "opacity-50" : "hover:bg-muted/60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onChange(toggleTheme(selected, entry.id as Theme))}
                  />
                  {entry.label}
                </label>
              );
            })
          )}
        </div>
      </div>
    </fieldset>
  );
}