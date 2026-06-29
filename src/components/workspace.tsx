'use client'

import { getRoute } from '@/router/tab-routes'
import { TabBar } from '@/components/tab-bar'
import { useTabs } from '@/contexts/tabs-context'

/**
 * Renders the active tab's view. When you migrate to `react-router-dom`, this
 * whole component becomes an `<Outlet />` and `activePath` is driven by the
 * router's location instead of the local tab store.
 */
function TabHost() {
  const { activePath } = useTabs()
  const route = getRoute(activePath)
  const View = route?.element

  if (!View) return null
  // `key` forces a fresh mount per route so each view starts clean.
  return <View key={activePath} />
}

export function Workspace() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TabBar />
      <main className="min-h-0 flex-1">
        <TabHost />
      </main>
    </div>
  )
}
