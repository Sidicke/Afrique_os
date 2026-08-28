import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsSection } from "./NotificationsSection";
import type { ShopConfig } from "@/lib/shopConfig";

const NOTIFICATIONS = [
  {
    id: "new_order",
    label: "Nouvelle commande",
    description: "Notification à chaque commande reçue.",
    enabled: true,
  },
  {
    id: "order_cancelled",
    label: "Commande annulée",
    description: "Quand un client annule sa commande.",
    enabled: true,
  },
  {
    id: "new_message",
    label: "Nouveau message client",
    description: "Alerte à chaque nouveau message d'un client.",
    enabled: true,
  },
  {
    id: "low_stock",
    label: "Alerte stock",
    description: "Quand un produit ou une variante tombe à 0.",
    enabled: false,
  },
];

describe("NotificationsSection", () => {
  const form = { notifications: NOTIFICATIONS } as unknown as ShopConfig;
  const savePatch = vi.fn().mockResolvedValue(true);
  const reset = vi.fn();

  beforeEach(() => {
    savePatch.mockReset();
    reset.mockReset();
  });

  /** Wrapper contrôlé : `update` re-rend avec la nouvelle valeur (comme le hook) */
  function Harness() {
    const [value, setValue] = useState(form);
    return (
      <NotificationsSection
        form={value}
        update={(patch) => setValue({ ...value, ...patch })}
        saving={false}
        savePatch={savePatch}
        reset={reset}
      />
    );
  }

  it("affiche les 4 types avec leur badge Activée/Désactivée (mode lecture)", () => {
    render(<Harness />);

    expect(screen.getByText("Nouvelle commande")).toBeInTheDocument();
    expect(screen.getByText("Commande annulée")).toBeInTheDocument();
    expect(screen.getByText("Nouveau message client")).toBeInTheDocument();
    expect(screen.getByText("Alerte stock")).toBeInTheDocument();
    // Badges de lecture
    expect(screen.getAllByText("Activée")).toHaveLength(3);
    expect(screen.getByText("Désactivée")).toBeInTheDocument();
  });

  it("permet de basculer un type et enregistre les préférences via savePatch", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    // Passe en mode édition
    await user.click(screen.getByRole("button", { name: /Modifier/ }));

    // Bascule « Alerte stock » (désactivée) → activée
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(4);
    await user.click(switches[3]);

    // Enregistre
    await user.click(screen.getByRole("button", { name: /Enregistrer/ }));
    const patch = savePatch.mock.calls[0][0] as {
      notifications: Array<{ id: string; enabled: boolean }>;
    };
    expect(patch.notifications).toHaveLength(4);
    expect(
      patch.notifications.find((n) => n.id === "low_stock")?.enabled,
    ).toBe(true);
    // Le reste est inchangé
    expect(
      patch.notifications.find((n) => n.id === "new_order")?.enabled,
    ).toBe(true);
  });

  it("le bouton Annuler restaure les valeurs via reset", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /Modifier/ }));
    await user.click(screen.getByRole("button", { name: /Annuler/ }));
    expect(reset).toHaveBeenCalled();
  });
});
