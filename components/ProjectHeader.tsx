type ProjectHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
};

export function ProjectHeader({ eyebrow, title, subtitle }: ProjectHeaderProps) {
  return (
    <header className="border-b border-line bg-white px-4 pb-4 pt-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {eyebrow}
      </p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        <button className="touch-target rounded-md border border-line px-3 text-sm font-medium text-ink">
          Project
        </button>
      </div>
    </header>
  );
}
