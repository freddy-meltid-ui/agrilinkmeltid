// AGRI-GRID V2 — primary navigation definition
import {
  LayoutDashboard,
  Sprout,
  ClipboardList,
  Users,
  Boxes,
  Map,
  ShieldCheck,
  Wallet,
  FileText,
  Settings,
  Store,
  Factory,
  LucideIcon,
} from "lucide-react";

export type V2NavItem = {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  /** Modules not yet implemented render a "coming soon" placeholder. */
  comingSoon?: boolean;
};

export const V2_NAV_ITEMS: V2NavItem[] = [
  { to: "/app/dashboard", labelKey: "v2.nav.dashboard", icon: LayoutDashboard },
  { to: "/app/processor", labelKey: "v2.nav.processor", icon: Factory },
  { to: "/app/field", labelKey: "v2.nav.field", icon: Users },
  { to: "/app/supply", labelKey: "v2.nav.supply", icon: Sprout },
  { to: "/app/sourcing", labelKey: "v2.nav.sourcing", icon: ClipboardList },
  { to: "/app/suppliers", labelKey: "v2.nav.suppliers", icon: Users, comingSoon: true },
  { to: "/app/operations", labelKey: "v2.nav.operations", icon: Boxes, comingSoon: true },
  { to: "/app/atlas", labelKey: "v2.nav.atlas", icon: Map },
  { to: "/app/compliance", labelKey: "v2.nav.compliance", icon: ShieldCheck, comingSoon: true },
  { to: "/app/finance", labelKey: "v2.nav.finance", icon: Wallet, comingSoon: true },
  { to: "/app/documents", labelKey: "v2.nav.documents", icon: FileText, comingSoon: true },
  { to: "/app/marketplace", labelKey: "v2.nav.marketplace", icon: Store },
  { to: "/app/settings", labelKey: "v2.nav.settings", icon: Settings },
];

/** Condensed set shown in the mobile bottom bar. */
export const V2_MOBILE_NAV = ["/app/dashboard", "/app/supply", "/app/sourcing", "/app/atlas", "/app/settings"];
