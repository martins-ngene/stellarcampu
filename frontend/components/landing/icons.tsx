import type { ReactNode } from "react";

export type IconName =
  | "arrow"
  | "check"
  | "sparkle"
  | "grid"
  | "wallet"
  | "send"
  | "asset"
  | "code"
  | "link"
  | "terminal"
  | "verified"
  | "lock"
  | "clock"
  | "hexagon"
  | "external"
  | "close"
  | "menu"
  | "stellar"
  | "user"
  | "settings"
  | "logout"
  | "star";

const paths: Record<IconName, ReactNode> = {
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  settings: (
    <>
      <path d="m9 3 1-1h4l1 3 3 1 3 1v4l-2 2-1 3-1 3h-4l-2-2-3-1-3-1v-4l2-2 1-3Z" />
      <circle cx="12" cy="11" r="3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H4v16h5m5-13 5 5-5 5m-5-5h14" />
    </>
  ),
  star: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 6 1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9L8.4 17l.7-4-2.9-2.8 4-.6L12 6Z" />
    </>
  ),

  arrow: (
    <>
      <path d="M4 12h15M14 6l6 6-6 6" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  sparkle: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
      <path d="m20 2 .6 1.4L22 4l-1.4.6L20 6l-.6-1.4L18 4l1.4-.6L20 2Z" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="15" width="6" height="6" rx="1" />
      <rect x="15" y="15" width="6" height="6" rx="1" />
    </>
  ),
  wallet: (
    <>
      <path d="M19 8V5H5a2 2 0 0 0 0 4h15v11H5a2 2 0 0 1-2-2V7" />
      <path d="M20 12h-6v5h6" />
      <path d="M16.5 14.5h.01" />
    </>
  ),
  send: (
    <>
      <path d="m21 3-7 18-4-7-7-4L21 3Z" />
      <path d="m10 14 7-7" />
    </>
  ),
  asset: (
    <>
      <ellipse cx="12" cy="5.5" rx="7" ry="3.5" />
      <path d="M5 5.5v6c0 2 3.1 3.5 7 3.5s7-1.5 7-3.5v-6M5 11.5v6c0 2 3.1 3.5 7 3.5s7-1.5 7-3.5v-6" />
    </>
  ),
  code: (
    <>
      <path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-12-2 16" />
    </>
  ),
  link: (
    <>
      <path d="m9 15 6-6m-8 3-2 2a4.25 4.25 0 0 0 6 6l3-3m-4-10 3-3a4.25 4.25 0 0 1 6 6l-2 2" />
    </>
  ),
  terminal: (
    <>
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="m6 8 4 4-4 4m7 0h5" />
    </>
  ),
  verified: (
    <>
      <path d="m12 2 3 2.3 3.8.3.9 3.7L22 12l-2.3 3.7-.9 3.7-3.8.3L12 22l-3-2.3-3.8-.3-.9-3.7L2 12l2.3-3.7.9-3.7L9 4.3 12 2Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  hexagon: <path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z" />,
  external: (
    <>
      <path d="M13 3h8v8m0-8L11 13M9 5H4v15h15v-5" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  stellar: (
    <path
      d="M21.5518 5.40918L19.9512 6.20703C19.674 6.39146 19.4462 6.58177 19.3018 6.7666C19.1542 6.95551 19.1343 7.08126 19.1494 7.16504C19.7894 10.6597 18.1465 13.8544 15.5928 15.5996C13.027 17.353 9.51458 17.66 6.4541 15.3613L6.76758 14.9434L7.08203 14.5254C9.74717 16.527 12.7675 16.264 15.0029 14.7363C17.2505 13.2003 18.6781 10.4022 18.1201 7.35449C18.1061 7.27781 18.1024 7.20229 18.1016 7.12891L0.46582 15.915L0.232422 15.4463L0 14.9785L19.4326 5.2959C19.8316 5.03717 20.2519 4.82807 20.5703 4.68457C20.735 4.61037 20.8758 4.55153 20.9756 4.51172C21.0252 4.49195 21.0648 4.47642 21.0928 4.46582C21.1067 4.46053 21.1182 4.45602 21.126 4.45312C21.1295 4.45182 21.1326 4.45098 21.1348 4.4502C21.1358 4.44981 21.137 4.44857 21.1377 4.44824H21.1396L21.5518 5.40918ZM5.96289 1.44434C8.51123 -0.334354 12.0204 -0.676504 15.1035 1.5918L14.7939 2.01367L14.4844 2.43457C11.7995 0.459119 8.78185 0.752035 6.56152 2.30176C4.32923 3.8599 2.92951 6.67182 3.51758 9.71387C3.53239 9.79045 3.53656 9.86604 3.53809 9.93945L21.0859 0.979492L21.3242 1.44531L21.5615 1.91113L2.22559 11.7852C1.82909 12.0479 1.41083 12.2615 1.09375 12.4082C0.929866 12.484 0.789849 12.5442 0.69043 12.585C0.640955 12.6053 0.601138 12.6209 0.573242 12.6318C0.559338 12.6373 0.547835 12.6416 0.540039 12.6445C0.536533 12.6459 0.533433 12.6467 0.53125 12.6475C0.530214 12.6479 0.529028 12.6491 0.52832 12.6494H0.526367L0.105469 11.6934L1.69727 10.8799C1.97282 10.6926 2.19911 10.4998 2.3418 10.3135C2.48765 10.1229 2.50632 9.99669 2.49023 9.91309C1.81577 6.42493 3.42655 3.21475 5.96289 1.44434Z"
      fill="currentColor"
      stroke="none"
    />
  ),
};

export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox={name === "stellar" ? "0 0 22 17" : "0 0 24 24"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function Brand({ href = "#top" }: { href?: string }) {
  return (
    <a className="brand" href={href} aria-label="StellarCampus home">
      <span className="brand-symbol">
        <Icon name="stellar" />
      </span>
      <span>
        Stellar<span className="brand-accent">Campus</span>
      </span>
    </a>
  );
}
