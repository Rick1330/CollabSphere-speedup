import { useEffect } from "react";
import { AppSidebar } from "@/app/shell/app-sidebar";
import { TopNav } from "@/app/shell/top-nav";
import { CommandPalette } from "@/app/shell/command-palette";
import { WorkspaceList } from "@/features/workspace/components/workspace-list";
import { useSidebar } from "@/hooks/use-sidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";

import { useCurrentAccount } from "@/lib/auth-session";

const FALLBACK_NAV_USER = { fullName: "Guest", email: "" };

const Workspaces = () => {
  const { collapsed, toggle, width, startResize } = useSidebar();
  const palette = useCommandPalette();
  const account = useCurrentAccount();
  const navUser = account
    ? { fullName: account.fullName, email: account.email }
    : FALLBACK_NAV_USER;

  useEffect(() => {
    document.title = "Workspaces — CollabSphere";
  }, []);

  return (
    <div className="app-light min-h-screen flex">
      <AppSidebar collapsed={collapsed} onToggle={toggle} width={width} onResizeStart={startResize} />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopNav user={navUser} onOpenPalette={palette.toggle} />
        <WorkspaceList />
      </div>

      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
};

export default Workspaces;
