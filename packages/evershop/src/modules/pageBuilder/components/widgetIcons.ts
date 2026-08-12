import {
  AlignLeft,
  BadgeCheck,
  Banknote,
  BookOpen,
  Box,
  Calendar,
  CircleHelp,
  Columns,
  Globe,
  GripHorizontal,
  Image,
  Images,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LayoutTemplate,
  Link as LinkIcon,
  ListOrdered,
  ListTree,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  MessageCircle,
  Minus,
  Newspaper,
  Package,
  PanelsLeftRight,
  PanelTop,
  Quote,
  Rows3,
  Search,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  TicketPercent,
  Type,
  Users,
  Video
} from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * Curated icon set for the page-builder Widgets palette + Layers tab.
 *
 * Keys are the string values that ship in `Widget.icon` from each
 * registration. Extending the map is a single import + entry — no
 * webpack/loader changes. We don't expose lucide wholesale because that
 * would defeat tree-shaking; this list grows organically as new widget
 * types ask for new visuals.
 */
const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  AlignLeft,
  BadgeCheck,
  Banknote,
  BookOpen,
  Box,
  Calendar,
  CircleHelp,
  Columns,
  Globe,
  GripHorizontal,
  Image,
  Images,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LayoutTemplate,
  Link: LinkIcon,
  ListOrdered,
  ListTree,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  MessageCircle,
  Minus,
  Newspaper,
  Package,
  PanelsLeftRight,
  PanelTop,
  Quote,
  Rows3,
  Search,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  TicketPercent,
  Type,
  Users,
  Video
};

/**
 * Resolve a registration's `icon` field to a renderable component. Falls
 * back to the generic `Layers` icon for unknown / missing names so the UI
 * never breaks on a typo in the registration.
 */
export function getWidgetIcon(
  name: string | undefined | null
): ComponentType<{ className?: string }> {
  if (name && ICONS[name]) return ICONS[name];
  return Layers;
}
