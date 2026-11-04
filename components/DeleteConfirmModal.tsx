"use client";

export default function DeleteConfirmModal({
  open,
  title,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-kg-night p-6 shadow-xl">
        <h3 className="font-heading text-xl text-kg-cream">Delete story?</h3>
        <p className="mt-2 text-sm text-kg-cream/70">
          &ldquo;{title}&rdquo; will be removed from your storybook. This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-kg-cream"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-kg-danger px-4 py-2 text-sm text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}