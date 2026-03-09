import { AlertCircle, X } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  onClose?: () => void;
  className?: string;
}

export default function ErrorMessage({ message, onClose, className = "" }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div
      className={`bg-danger-50 border border-danger-200 text-danger-800 rounded-xl p-3 flex items-start gap-2 ${className}`}
      role="alert"
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-danger-600 hover:text-danger-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
