interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-ink/20 bg-white/70 p-5 text-sm text-stone-600">
      {message}
    </div>
  );
}
