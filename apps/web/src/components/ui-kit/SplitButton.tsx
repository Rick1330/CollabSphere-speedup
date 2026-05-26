import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from "./Menu";

export type SplitButtonProps = {
  label: string;
  onPrimaryClick?: () => void;
  disabled?: boolean;
  menuItems: Array<{ id: string; label: string; onSelect: () => void }>;
  icon?: ReactNode;
};

export function SplitButton({ label, onPrimaryClick, disabled, menuItems, icon }: SplitButtonProps) {
  return (
    <div className="cs-kit-split-btn">
      <button
        type="button"
        className="cs-kit-split-btn-main cs-kit-focus"
        onClick={onPrimaryClick}
        disabled={disabled}
      >
        {icon}
        {label}
      </button>
      <Menu>
        <MenuTrigger asChild>
          <button type="button" className="cs-kit-split-btn-chevron cs-kit-focus" disabled={disabled} aria-label="More options">
            <ChevronDown size={16} strokeWidth={1.75} />
          </button>
        </MenuTrigger>
        <MenuContent align="end">
          {menuItems.map((item) => (
            <MenuItem key={item.id} onSelect={item.onSelect}>
              {item.label}
            </MenuItem>
          ))}
        </MenuContent>
      </Menu>
    </div>
  );
}
