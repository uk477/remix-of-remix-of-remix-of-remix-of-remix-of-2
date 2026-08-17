'use client'

import { AdminGate } from '../admin/shell'
import { OverviewSection, UsersSection } from '../admin/section-people'
import {
  CategoriesSection,
  OrdersSection,
  ProductsSection,
  TopupsSection,
} from '../admin/section-commerce'
import {
  ApplicationsSection,
  AuditSection,
  BroadcastsSection,
  SupportSection,
} from '../admin/section-ops'
import { MaintenanceSection } from '../admin/section-maintenance'
import { PricingSection } from '../admin/section-pricing'
import { BoostStatusSection } from '../admin/section-boost-status'
import { BoostStatsSection } from '../admin/section-boost-stats'
import { XParserSection } from '../admin/section-x-parser'

export function AdminScreen() {
  return (
    <AdminGate>
      {(section) => {
        switch (section) {
          case 'overview':
            return <OverviewSection />
          case 'users':
            return <UsersSection />
          case 'orders':
            return <OrdersSection />
          case 'topups':
            return <TopupsSection />
          case 'products':
            return <ProductsSection />
          case 'categories':
            return <CategoriesSection />
          case 'pricing':
            return <PricingSection />
          case 'applications':
            return <ApplicationsSection />
          case 'support':
            return <SupportSection />
          case 'broadcasts':
            return <BroadcastsSection />
          case 'audit':
            return <AuditSection />
          case 'maintenance':
            return <MaintenanceSection />
          case 'boost_status':
            return <BoostStatusSection />
          case 'boost_stats':
            return <BoostStatsSection />
          case 'x_parser':
            return <XParserSection />
        }
      }}
    </AdminGate>
  )
}
