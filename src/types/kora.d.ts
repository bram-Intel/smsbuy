export interface Korapay {
  initialize: (config: KorapayConfig) => void
}

export interface KorapayConfig {
  key: string
  reference: string
  amount: number
  currency: string
  customer: {
    name: string
    email: string
  }
  notification_url: string
  onClose: () => void
  onSuccess: (response: any) => void
  onFailed: (response: any) => void
}

declare global {
  interface Window {
    Korapay: Korapay
  }
}
