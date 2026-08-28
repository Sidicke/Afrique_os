import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide" | "full";
}

const sizes = {
  // Contenu large — la colonne remplit l'écran jusqu'à 1536 px (plein écran
  // sur les laptops/écrans 1080p, marges minimales sur les grands moniteurs).
  default: "max-w-screen-2xl",
  narrow: "max-w-3xl",
  wide: "max-w-screen-2xl",
  // Pleine largeur réelle : header, navigation, footer… aucun plafond.
  full: "max-w-none",
};

export default function Container({ children, className, size = "default" }: ContainerProps) {
  return <div className={cn("mx-auto w-full px-5 sm:px-8", sizes[size], className)}>{children}</div>;
}
