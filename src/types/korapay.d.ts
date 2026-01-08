interface Window {
  Korapay: {
    initialize: (config: {
      key: string
      reference: string
      amount: number
      currency: string
      customer: {
        name: string
        email: string
      }
      onSuccess: (response: any) => void
      onClose: () => void
    }) => void
  }
}
