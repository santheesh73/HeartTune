import { useQuery } from '@tanstack/react-query'
import type { HomeFeedConfig, HomeSection } from '../services/recommendationService'
import { readOfflineCache, writeOfflineCache } from '../utils/offlineCache'

export function useHomeSection(config: HomeFeedConfig, enabled = true) {
  const unifiedKey = `offline_fallback:${config.queryKey.join(':')}`

  return useQuery({
    queryKey: config.queryKey,
    queryFn: async () => {
      const data = await config.fetchFn()
      if (data) {
        writeOfflineCache(unifiedKey, data)
      }
      return data
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled,
    initialData: () => {
      const val = readOfflineCache<HomeSection | null>(unifiedKey, null)
      return val === null ? undefined : val
    }
  })
}
