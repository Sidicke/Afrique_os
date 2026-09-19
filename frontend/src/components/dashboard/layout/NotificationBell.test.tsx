import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotificationBell from "./NotificationBell";

const notifyState = vi.hoisted(() => ({
  unreadCount: 0,
  items: [] as unknown[],
  loading: false,
  newAlertKey: 0,
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteAll: vi.fn(),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => notifyState,
}));

// next/navigation : push espionné
const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// next/link : simple <a> sous test (pas de contexte Next)
vi.mock("next/link", () => {
  const MockLink = ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  return { default: MockLink };
});

const NOTIF = {
  id: "n1",
  boutiqueId: "b1",
  type: "order_cancelled",
  title: "Commande #AC-8901 annulée par le client",
  message: "Motif : Changement de projet",
  orderReference: "#AC-8901",
  readAt: null,
  createdAt: "2026-08-08T10:00:00.000Z",
};

describe("NotificationBell", () => {
  beforeEach(() => {
    notifyState.unreadCount = 0;
    notifyState.items = [];
    notifyState.loading = false;
    notifyState.newAlertKey = 0;
    notifyState.markAsRead.mockReset();
    notifyState.markAllAsRead.mockReset();
    notifyState.deleteAll.mockReset();
    pushMock.mockReset();
    vi.restoreAllMocks();
    vi.useRealTimers();
    // Onglet visible par défaut
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.title = "ZennShop";
  });

  afterEach(() => {
    document.title = "ZennShop";
    vi.useRealTimers();
  });

  it("n'affiche pas de badge quand tout est lu", () => {
    render(<NotificationBell />);
    const bell = screen.getByRole("button", { name: "Notifications" });
    expect(bell).toBeInTheDocument();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("affiche le badge avec le nombre de non-lues", () => {
    notifyState.unreadCount = 3;
    notifyState.items = [NOTIF];
    render(<NotificationBell />);
    expect(
      screen.getByRole("button", { name: "Notifications (3 non lues)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("ouvre le panneau au clic et liste les notifications", async () => {
    notifyState.unreadCount = 1;
    notifyState.items = [NOTIF];
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getByText("Motif : Changement de projet")).toBeInTheDocument();
    expect(
      screen.getByText("Commande #AC-8901 annulée par le client"),
    ).toBeInTheDocument();
  });

  it("marque une notification non-lue comme lue au clic", async () => {
    notifyState.unreadCount = 1;
    notifyState.items = [NOTIF];
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    await user.click(screen.getByText("Motif : Changement de projet"));

    expect(notifyState.markAsRead).toHaveBeenCalledWith("n1");
  });

  it("« Tout marquer lu » déclenche markAllAsRead", async () => {
    notifyState.unreadCount = 2;
    notifyState.items = [
      NOTIF,
      { ...NOTIF, id: "n2", title: "Commande #AC-8902 annulée" },
    ];
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    await user.click(screen.getByText("Tout marquer lu"));

    expect(notifyState.markAllAsRead).toHaveBeenCalledTimes(1);
  });

  it("affiche un état vide quand aucune notification", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByText("Aucune notification")).toBeInTheDocument();
  });

  it("clignote le titre de l'onglet quand une nouvelle notification arrive (onglet caché)", async () => {
    vi.useFakeTimers();
    // Onglet en arrière-plan : on ne voit pas la cloche → le titre clignote
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    notifyState.newAlertKey = 1;
    render(<NotificationBell />);

    // Après le 1er tick (1,2 s), le titre doit contenir « 🔔 Nouvelle notification »
    await vi.advanceTimersByTimeAsync(1300);
    expect(document.title).toContain("Nouvelle notification");

    // Au tick suivant, le titre d'origine revient (alternance)
    await vi.advanceTimersByTimeAsync(1200);
    expect(document.title).toBe("ZennShop");
  });

  it("secoue la cloche (classe bell-ring) quand une nouvelle notification arrive (onglet visible)", async () => {
    // Le setState est différé (setTimeout 0) : on attend le re-render réel
    notifyState.newAlertKey = 1;
    const { container } = render(<NotificationBell />);
    await waitFor(() => {
      expect(
        container.querySelector("svg")?.classList.contains("bell-ring"),
      ).toBe(true);
    });
  });

  it("arrête le clignotement automatiquement après la durée max (TITLE_BLINK_MS)", async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    notifyState.newAlertKey = 1;
    render(<NotificationBell />);
    await vi.advanceTimersByTimeAsync(1300);
    expect(document.title).toContain("Nouvelle notification");

    // Après la durée max, le titre d'origine est restauré
    await vi.advanceTimersByTimeAsync(15_000);
    expect(document.title).toBe("ZennShop");
  });

  it("arrête le clignotement et restaure le titre quand on revient dans l'onglet", async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    notifyState.unreadCount = 2;
    notifyState.newAlertKey = 1;
    render(<NotificationBell />);
    await vi.advanceTimersByTimeAsync(1300);
    expect(document.title).toContain("Nouvelle notification");

    // Retour dans l'onglet
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(document.title).toBe("ZennShop");
  });

  it("ne déclenche pas d'alerte sans nouvelle notification (newAlertKey 0)", () => {
    const { container } = render(<NotificationBell />);
    const svg = container.querySelector("svg");
    expect(svg?.classList.contains("bell-ring")).toBe(false);
    expect(document.title).toBe("ZennShop");
  });

  it("affiche un badge de type par notification (Commande, Annulation, Message, Stock)", async () => {
    notifyState.unreadCount = 4;
    notifyState.items = [
      NOTIF, // order_cancelled
      { ...NOTIF, id: "n-order", type: "new_order", title: "Nouvelle commande #AC-9000" },
      {
        ...NOTIF,
        id: "n-msg",
        type: "new_message",
        title: "Nouveau message de Jean",
        orderReference: null,
      },
      {
        ...NOTIF,
        id: "n-stock",
        type: "low_stock",
        title: "Rupture de stock",
        orderReference: null,
      },
    ];
    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.click(screen.getByRole("button", { name: /Notifications/ }));

    expect(screen.getByText("Annulation")).toBeInTheDocument();
    expect(screen.getByText("Commande")).toBeInTheDocument();
    expect(screen.getByText("Message")).toBeInTheDocument();
    expect(screen.getByText("Stock")).toBeInTheDocument();
  });

  it("navigue vers la messagerie au clic sur une notification de type new_message", async () => {
    notifyState.unreadCount = 1;
    notifyState.items = [
      {
        ...NOTIF,
        id: "n-msg",
        type: "new_message",
        title: "Nouveau message de Jean",
        orderReference: null,
      },
    ];
    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    await user.click(screen.getByText("Nouveau message de Jean"));
    expect(pushMock).toHaveBeenCalledWith("/espace-vendeur/messagerie");
  });

  it("navigue vers les commandes au clic sur une notification de commande", async () => {
    notifyState.unreadCount = 1;
    notifyState.items = [NOTIF]; // order_cancelled
    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    await user.click(screen.getByText("Commande #AC-8901 annulée par le client"));
    expect(pushMock).toHaveBeenCalledWith("/espace-vendeur/commandes");
  });

  it("navigue vers les produits au clic sur une notification low_stock", async () => {
    notifyState.unreadCount = 1;
    notifyState.items = [
      {
        ...NOTIF,
        id: "n-stock",
        type: "low_stock",
        title: "Rupture de stock",
        orderReference: null,
      },
    ];
    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    await user.click(screen.getByText("Rupture de stock"));
    expect(pushMock).toHaveBeenCalledWith("/espace-vendeur/produits");
  });

  it("« Tout supprimer » demande confirmation puis déclenche deleteAll", async () => {
    notifyState.unreadCount = 1;
    notifyState.items = [NOTIF];
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(true);
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    await user.click(screen.getByRole("button", { name: "Tout supprimer" }));

    expect(confirmSpy).toHaveBeenCalledWith("Supprimer toutes les notifications ?");
    expect(notifyState.deleteAll).toHaveBeenCalledTimes(1);
  });

  it("« Tout supprimer » n'efface rien si la confirmation est refusée", async () => {
    notifyState.unreadCount = 1;
    notifyState.items = [NOTIF];
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(false);
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    await user.click(screen.getByRole("button", { name: "Tout supprimer" }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(notifyState.deleteAll).not.toHaveBeenCalled();
  });
});
