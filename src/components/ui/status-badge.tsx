import { Badge } from "./badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

/**
 * Status Badge Component
 * Displays status with appropriate color and icon
 */
export type Status = "success" | "error" | "pending" | "warning";

interface StatusBadgeProps {
  status: Status;
  label: string;
  className?: string;
}

const statusConfig = {
  success: {
    icon: CheckCircle2,
    variant: "default" as const,
    className: "bg-green-500 hover:bg-green-600 text-white",
  },
  error: {
    icon: XCircle,
    variant: "destructive" as const,
    className: "",
  },
  pending: {
    icon: Clock,
    variant: "secondary" as const,
    className: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  warning: {
    icon: AlertCircle,
    variant: "secondary" as const,
    className: "bg-orange-500 hover:bg-orange-600 text-white",
  },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, "gap-1", className)}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

/**
 * KSeF Status Badge
 * Specialized badge for invoice KSeF statuses
 */
type KsefStatus = "DRAFT" | "QUEUED" | "PROCESSING" | "VALID" | "REJECTED";

const ksefStatusLabels: Record<KsefStatus, string> = {
  DRAFT: "Szkic",
  QUEUED: "W kolejce",
  PROCESSING: "Przetwarzanie",
  VALID: "Zaakceptowana",
  REJECTED: "Odrzucona",
};

const ksefStatusMap: Record<KsefStatus, Status> = {
  DRAFT: "pending",
  QUEUED: "pending",
  PROCESSING: "warning",
  VALID: "success",
  REJECTED: "error",
};

export function KsefStatusBadge({
  status,
  className,
}: {
  status: KsefStatus;
  className?: string;
}) {
  return (
    <StatusBadge
      status={ksefStatusMap[status]}
      label={ksefStatusLabels[status]}
      className={className}
    />
  );
}



