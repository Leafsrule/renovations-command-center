type CriticalPathRiskBadgeProps = {
  risk?: "none" | "low" | "medium" | "high";
};

const riskLabel = {
  none: "No critical risk",
  low: "Low risk",
  medium: "Critical risk",
  high: "High critical risk"
};

const riskClass = {
  none: "border-line bg-panel text-muted",
  low: "border-[#b7d8cf] bg-[#e4f3ef] text-brand",
  medium: "border-[#ead2a7] bg-[#fff4db] text-caution",
  high: "border-[#e4bbbb] bg-[#fae8e8] text-danger"
};

export function CriticalPathRiskBadge({
  risk = "none"
}: CriticalPathRiskBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${riskClass[risk]}`}
    >
      {riskLabel[risk]}
    </span>
  );
}
