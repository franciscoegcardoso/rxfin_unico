import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export type VehicleType = 1 | 2 | 3

export interface FipeBrandLogo {
  brand_id:   number
  brand_name: string
  logo_url:   string | null
  verified:   boolean
}

export function useFipeBrandLogo(vehicleType: VehicleType, brandId: number | null) {
  return useQuery({
    queryKey: ['fipe-brand-logo', vehicleType, brandId],
    enabled:  !!brandId,
    staleTime: 1000 * 60 * 60,
    gcTime:    1000 * 60 * 60 * 24,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_fipe_brand_logo', {
        p_vehicle_type: vehicleType,
        p_brand_id:     brandId!,
      })
      if (error) throw error
      return data as string | null
    },
  })
}

export function useFipeBrandLogosByType(vehicleType: VehicleType) {
  return useQuery({
    queryKey: ['fipe-brand-logos-type', vehicleType],
    staleTime: 1000 * 60 * 60,
    gcTime:    1000 * 60 * 60 * 24,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_fipe_brand_logos_by_type', {
        p_vehicle_type: vehicleType,
      })
      if (error) throw error
      const map = new Map<number, string | null>()
      ;(data as FipeBrandLogo[]).forEach((row) => map.set(row.brand_id, row.logo_url))
      return map
    },
  })
}

export function getVehicleTypeFallbackIcon(vehicleType: VehicleType): string {
  const icons: Record<VehicleType, string> = {
    1: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236b7280'%3E%3Cpath d='M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z'/%3E%3C/svg%3E",
    2: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236b7280'%3E%3Cpath d='M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1h2c0 .55-.45 1-1 1z'/%3E%3Cpath d='M5 6h5v2H5zm14 7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z'/%3E%3C/svg%3E",
    3: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236b7280'%3E%3Cpath d='M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z'/%3E%3C/svg%3E",
  }
  return icons[vehicleType]
}
