export function getAvatarInitials({
  name,
  single,
  double,
}: {
  name?: string | null;
  single?: boolean;
  double?: boolean;
}) {
  if (!name) {
    return '';
  }

  const [first, second] = name.split(' ');
  let initials = '';
  let shortInitials = '';

  if (!second) {
    initials += first.slice(0, 2);
    shortInitials += first;
  } else {
    initials += first[0] + second[0];
    shortInitials += `${first} ${second[0]}.`;
  }

  return single ? first.slice(0, 1) : double ? shortInitials : initials;
}

export type AvatarColorStyle = {
  backgroundColor: string;
  color: string;
};

// Relay avatar palette — harbor/amber/success/info/neutral tints.
export const DEFAULT_AVATAR_COLORS: AvatarColorStyle[] = [
  { color: '#145665', backgroundColor: '#DDF2F5' },
  { color: '#7A2E0E', backgroundColor: '#FEF0C7' },
  { color: '#027A48', backgroundColor: '#ECFDF3' },
  { color: '#194185', backgroundColor: '#D1E9FF' },
  { color: '#B42318', backgroundColor: '#FEE2E2' },
  { color: '#0A0D14', backgroundColor: '#F5F6F7' },
];
