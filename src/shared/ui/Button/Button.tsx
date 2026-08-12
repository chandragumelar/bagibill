import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "@/shared/ui/Button/Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: styles.primary ?? "",
  secondary: styles.secondary ?? "",
  ghost: styles.ghost ?? "",
};

export function Button({ variant = "primary", type = "button", children, ...rest }: ButtonProps) {
  return (
    <button type={type} className={`${styles.base} ${VARIANT_CLASS[variant]}`} {...rest}>
      {children}
    </button>
  );
}
