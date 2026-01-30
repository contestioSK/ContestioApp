import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard,
  Trophy,
  Plus,
  ArrowLeft
} from "lucide-react";
import { TacticalIconInline } from "@/components/ui/tactical-icon";

interface OrganizerLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  {
    icon: LayoutDashboard,
    label: "Prehľad",
    href: "/organizer",
    description: "Hlavný dashboard"
  },
  {
    icon: Trophy,
    label: "Moje súťaže",
    href: "/organizer/competitions",
    description: "Zoznam vašich súťaží"
  },
  {
    icon: Plus,
    label: "Vytvoriť súťaž",
    href: "/organizer/create",
    description: "Nová súťaž"
  }
];

export default function OrganizerLayout({ children }: OrganizerLayoutProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  const isActivePath = (href: string) => {
    if (href === "/organizer") {
      return location === "/organizer";
    }
    return location.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar - hidden on mobile (navigation is in TopBar MobileMenu) */}
      <div className="hidden md:flex fixed inset-y-0 left-0 z-40 bg-sidebar border-r border-sidebar-border w-[240px] lg:w-[280px] flex-shrink-0 pt-16">
        <div className="flex flex-col h-full w-full">
          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {/* Section Header */}
            <div className="pb-2">
              <div className="px-3 flex items-center gap-1.5">
                <TacticalIconInline icon={Trophy} variant="amber" size="sm" />
                <p className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                  Správa súťaží
                </p>
              </div>
            </div>

            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.href);
              
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  onClick={() => {
                    setLocation(item.href);
                    window.scrollTo(0, 0);
                  }}
                  className={`
                    w-full justify-start px-3 py-3 h-auto text-sm font-medium rounded-lg transition-all
                    ${isActive 
                      ? 'bg-amber-500/10 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 dark:border-amber-500/40' 
                      : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                    }
                  `}
                  data-testid={`nav-organizer-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <TacticalIconInline icon={Icon} variant={isActive ? "amber" : "slate"} size="md" className="mr-3 flex-shrink-0" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Button>
              );
            })}

            {/* Divider */}
            <div className="pt-4 pb-2">
              <div className="px-3">
                <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent"></div>
              </div>
            </div>

            {/* Back to Diary */}
            <Button
              variant="ghost"
              onClick={() => {
                setLocation('/diary');
              }}
              className="w-full justify-start px-3 py-3 h-auto text-sm font-medium rounded-lg transition-all text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              data-testid="nav-back-to-diary"
            >
              <TacticalIconInline icon={ArrowLeft} variant="slate" size="md" className="mr-3 flex-shrink-0" />
              <span className="font-medium text-sm">Späť do denníka</span>
            </Button>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 w-full overflow-x-hidden md:ml-[240px] lg:ml-[280px]">
        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
