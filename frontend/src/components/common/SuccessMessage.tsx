import { CheckCircle, X } from "lucide-react";

interface SuccessMessageProps {
  message: string;
  onClose?: () => void;
  className?: string;
}

export default function SuccessMessage({ message, onClose, className = "" }: SuccessMessageProps) {
  if (!message) return null;

  return (
    <div
      className={`bg-success-50 border border-success-200 text-success-800 rounded-xl p-3 flex items-start gap-2 ${className}`}
      role="alert"
    >
      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-success-600 hover:text-success-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
