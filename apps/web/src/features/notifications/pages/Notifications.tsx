import { useEffect } from "react";
import { AppSidebar } from "@/app/shell/app-sidebar";
import { TopNav } from "@/app/shell/top-nav";
import { CommandPalette } from "@/app/shell/command-palette";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import { useSidebar } from "@/hooks/use-sidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useCurrentAccount } from "@/lib/auth-session";

const Notifications = () => {
  const { collapsed, toggle, width, startResize } = useSidebar();
  const palette = useCommandPalette();
  const account = useCurrentAccount();
  const currentUser = account
    ? { fullName: account.fullName, email: account.email }
    : { fullName: "Guest", email: "" };

  useEffect(() => {
    document.title = "Notifications — CollabSphere";
  }, []);

  return (
    <div className="app-light min-h-screen flex">
      <AppSidebar collapsed={collapsed} onToggle={toggle} width={width} onResizeStart={startResize} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopNav user={currentUser} unreadCount={3} onOpenPalette={palette.toggle} />
        <main className="flex-1 p-6 sm:p-10">
          <div className="max-w-3xl mx-auto">
            <NotificationCenter />
          </div>
        </main>
      </div>
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
};

export default Notifications;
