import { Building2 } from 'lucide-react';

export function BancoLogo({
  connector_name,
  connector_image_url,
  account_name,
  size = 20,
}: {
  connector_name: string
  connector_image_url: string | null
  account_name?: string | null
  size?: number
}) {
  const tooltip = account_name ? `${connector_name} · ${account_name}` : connector_name

  if (connector_image_url) {
    return (
      <img
        src={connector_image_url}
        alt={connector_name}
        title={tooltip}
        className="rounded-full object-contain shrink-0 cursor-default"
        style={{ width: size, height: size }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }

  return (
    <span
      title={tooltip}
      className="flex items-center gap-1 text-xs text-muted-foreground cursor-default"
    >
      <Building2 className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate max-w-[90px]">{connector_name}</span>
    </span>
  )
}
