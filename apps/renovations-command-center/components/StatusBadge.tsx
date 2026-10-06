type StatusBadgeProps = {
  label: string;
  tone?: "neutral" | "ready" | "blocked" | "warning";
};

const toneClass = {
  neutral: "border-line bg-panel text-muted",
  ready: "border-[#b7d8cf] bg-[#e4f3ef] text-brand",
  blocked: "border-[#e4bbbb] bg-[#fae8e8] text-danger",
  warning: "border-[#ead2a7] bg-[#fff4db] text-caution"
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${toneClass[tone]}`}
    >
      {label}
    </span>
  );
}
