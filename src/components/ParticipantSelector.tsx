import type { Participant } from "../types/prode";

interface ParticipantSelectorProps {
  participants: Participant[];
  selectedParticipantId: string;
  onChange: (participantId: string) => void;
}

export function ParticipantSelector({
  participants,
  selectedParticipantId,
  onChange
}: ParticipantSelectorProps) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      Participante
      <select
        value={selectedParticipantId}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-lg border border-ink/15 bg-white px-4 text-base font-bold text-ink shadow-insetLine outline-none transition focus:border-field focus:ring-4 focus:ring-field/15"
      >
        <option value="all">Ver todos</option>
        {participants.map((participant) => (
          <option key={participant.id} value={participant.id}>
            {participant.name}
          </option>
        ))}
      </select>
    </label>
  );
}
