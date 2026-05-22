import type { CSSProperties } from "react";
import type { AwarenessClientSnapshot } from "@/hooks/use-collaborative-document-editor";

type RemotePointerOverlayProps = {
  clients: AwarenessClientSnapshot[];
};

/** Classic Windows default arrow pointer (tip at 0,0). */
function WindowsPointerIcon() {
  return (
    <svg
      className="remote-collab-pointer__cursor"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fill="#000000"
        stroke="#ffffff"
        strokeWidth="1"
        strokeLinejoin="round"
        d="M2.5 1.5 L2.5 14.5 L6.2 11 L8.8 16.5 L10.8 15.2 L8.1 10.2 L13.5 10.2 L2.5 1.5 Z"
      />
    </svg>
  );
}

export function RemotePointerOverlay({ clients }: RemotePointerOverlayProps) {
  const remotePointers = clients.filter(
    (c) => !c.isLocal && c.hasPointer && c.pointer?.visible && c.userColor,
  );

  if (remotePointers.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      {remotePointers.map((client) => {
        const color = client.userColor ?? "#2563EB";
        const { x, y } = client.pointer!;
        return (
          <div
            key={client.clientId}
            className="remote-collab-pointer"
            style={
              {
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                "--remote-pointer-color": color,
              } as CSSProperties
            }
          >
            <WindowsPointerIcon />
            {client.userName ? (
              <span className="remote-collab-pointer__label">{client.userName}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
