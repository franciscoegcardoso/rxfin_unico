import { useState } from 'react'
import { useFipeBrandLogo, getVehicleTypeFallbackIcon, type VehicleType } from '@/hooks/useFipeBrandLogo'
import { cn } from '@/lib/utils'

interface FipeBrandLogoProps {
  vehicleType: VehicleType
  brandId:     number | null
  brandName?:  string
  className?:  string
  size?:       'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
}

export function FipeBrandLogo({
  vehicleType,
  brandId,
  brandName,
  className,
  size = 'md',
}: FipeBrandLogoProps) {
  const { data: logoUrl, isLoading } = useFipeBrandLogo(vehicleType, brandId)
  const [imgError, setImgError] = useState(false)

  const fallback = getVehicleTypeFallbackIcon(vehicleType)
  const resolvedUrl = (!imgError && logoUrl) ? logoUrl : fallback

  if (isLoading || !brandId) {
    return (
      <div className={cn(SIZE_CLASSES[size], 'rounded-md bg-muted animate-pulse', className)} />
    )
  }

  return (
    <img
      src={resolvedUrl}
      alt={brandName ?? `Marca ${brandId}`}
      className={cn(SIZE_CLASSES[size], 'object-contain', className)}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  )
}
