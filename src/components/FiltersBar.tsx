import { GROUPS, type FilterState, type Group, type MatchStatus } from "../types/prode";

interface FiltersBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  disableParticipantResult?: boolean;
}

export function FiltersBar({ filters, onChange, disableParticipantResult }: FiltersBarProps) {
  return (
    <section className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-insetLine md:grid-cols-3">
      <SelectField
        label="Grupo"
        value={filters.group}
        onChange={(value) => onChange({ ...filters, group: value as Group | "all" })}
        options={[
          { value: "all", label: "Todos" },
          ...GROUPS.map((group) => ({ value: group, label: `Grupo ${group}` }))
        ]}
      />
      <SelectField
        label="Estado"
        value={filters.status}
        onChange={(value) => onChange({ ...filters, status: value as MatchStatus | "all" })}
        options={[
          { value: "all", label: "Todos" },
          { value: "scheduled", label: "Pendiente" },
          { value: "live", label: "En vivo" },
          { value: "finished", label: "Finalizado" }
        ]}
      />
      <SelectField
        label="Resultado del participante"
        value={filters.participantResult}
        disabled={disableParticipantResult}
        onChange={(value) =>
          onChange({ ...filters, participantResult: value as FilterState["participantResult"] })
        }
        options={[
          { value: "all", label: "Todos" },
          { value: "hit", label: "Acertó" },
          { value: "miss", label: "Falló" },
          { value: "unmarked", label: "Sin marcar" },
          { value: "pending", label: "Pendiente" }
        ]}
      />
    </section>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function SelectField({ label, value, options, disabled, onChange }: SelectFieldProps) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-ink/15 bg-chalk px-3 text-sm font-bold text-ink outline-none transition focus:border-field focus:ring-4 focus:ring-field/15 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
