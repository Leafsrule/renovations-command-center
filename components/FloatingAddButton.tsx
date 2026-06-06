import { Plus } from "lucide-react";

export function FloatingAddButton() {
  return (
    <button
      aria-label="Add item"
      className="touch-target fixed bottom-24 left-1/2 z-20 ml-32 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-soft"
    >
      <Plus aria-hidden="true" className="h-6 w-6" />
    </button>
  );
}
