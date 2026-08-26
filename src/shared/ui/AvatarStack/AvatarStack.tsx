import { Avatar } from "@/shared/ui/Avatar/Avatar";
import styles from "@/shared/ui/AvatarStack/AvatarStack.module.css";

export interface AvatarStackMember {
  readonly key: string;
  readonly initials: string;
  readonly color: string;
}

export interface AvatarStackProps {
  readonly members: readonly AvatarStackMember[];
  /** Berapa avatar yang dirender penuh sebelum sisanya dilipat ke badge +N. Default 4, sama dengan mockup Beranda. */
  readonly max?: number;
}

const DEFAULT_MAX = 4;

// Tumpukan avatar berlapis tanpa nama — spec.md 18.5: avatar telanjang cuma
// boleh muncul di sini, tempat sempit yang tidak dipakai untuk mengambil
// keputusan. Nol nama berarti nol aria-label per avatar; seluruh tumpukan
// disembunyikan dari screen reader karena pemanggilnya (kartu grup) selalu
// menaruh teks "N orang" di sebelahnya sebagai sumber info yang sebenarnya.
export function AvatarStack({ members, max = DEFAULT_MAX }: AvatarStackProps) {
  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;

  return (
    <span className={styles.stack} aria-hidden="true">
      {shown.map((member) => (
        <span className={styles.item} key={member.key}>
          <Avatar initials={member.initials} color={member.color} size="stack" />
        </span>
      ))}
      {overflow > 0 ? <span className={styles.more}>+{overflow}</span> : null}
    </span>
  );
}
