// FlashPaymentBroker contract ABI
export const FlashPaymentBrokerABI = [
  {
    type: "function",
    name: "getEscrowAccountAddress",
    inputs: [
      { name: "client", type: "address", internalType: "address" },
      { name: "server", type: "address", internalType: "address" }
    ],
    outputs: [
      { name: "", type: "address", internalType: "address" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "openEscrow",
    inputs: [
      { name: "paymentAddress", type: "address", internalType: "address" },
      { name: "tokenAddress", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "settlePayment",
    inputs: [
      { name: "paymentAddress", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  }
] as const;

export default FlashPaymentBrokerABI;
