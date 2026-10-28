// The browser integration consumes this limited surface; these are not ambient SDK declarations.
export interface PayPalCapture {
  id?: string;
  status?: string;
}
export interface PayPalOrderActions {
  order: {
    create(data: {
      purchase_units: { amount: { value: string } }[];
    }): Promise<string>;
    capture(): Promise<PayPalCapture>;
  };
}
export interface PayPalButtonOptions {
  style: { layout: "vertical"; color: "black"; shape: "rect"; label: "paypal" };
  createOrder(data: unknown, actions: PayPalOrderActions): Promise<string>;
  onApprove(data: unknown, actions: PayPalOrderActions): Promise<void>;
  onCancel(): void;
  onError(error?: unknown): void;
}
export interface PayPalButtons {
  render(target: string): Promise<void>;
  close(): Promise<void> | void;
}
export interface PayPalBrowserSdk {
  Buttons(options: PayPalButtonOptions): PayPalButtons;
}
export type CheckoutStatus =
  | "idle"
  | "loading"
  | "unavailable"
  | "ready"
  | "pending"
  | "complete"
  | "error";
