interface ErrorStateProps {
  title?: string;
  message: string;
}

export function ErrorState({ title = "Aviso", message }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-rust/25 bg-rust/10 p-4 text-sm text-rust">
      <strong className="block text-ink">{title}</strong>
      {message}
    </div>
  );
}
