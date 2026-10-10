import { CriticalPathRiskBadge } from "@/components/CriticalPathRiskBadge";
import { StatusBadge } from "@/components/StatusBadge";

type PagePlaceholderProps = {
  title: string;
  description: string;
  items?: string[];
};

export function PagePlaceholder({
  title,
  description,
  items = []
}: PagePlaceholderProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      </div>
      <div className="rounded-md border border-line bg-panel p-3">
        <div className="flex flex-wrap gap-2">
          <StatusBadge label="Foundation" tone="ready" />
          <CriticalPathRiskBadge risk="low" />
        </div>
        {items.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm text-ink">
            {items.map((item) => (
              <li key={item} className="rounded-md bg-white px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
