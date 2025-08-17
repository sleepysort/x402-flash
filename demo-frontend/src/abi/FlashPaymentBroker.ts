// FlashPaymentBroker contract ABI
export const FlashPaymentBrokerABI = [
  {
    type: "function",
    name: "clientCloseEscrow",
    inputs: [
      { name: "server", type: "address", internalType: "address" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "escrowAccounts",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "address", internalType: "address" }
    ],
    outputs: [
      { name: "", type: "address", internalType: "contract EscrowAccount" }
    ],
    stateMutability: "view"
  },
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
    name: "getEscrowTokenAddress",
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
    name: "getEscrowTokenBalance",
    inputs: [
      { name: "client", type: "address", internalType: "address" },
      { name: "server", type: "address", internalType: "address" }
    ],
    outputs: [
      { name: "", type: "uint256", internalType: "uint256" }
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
    name: "serverCloseEscrow",
    inputs: [
      { name: "client", type: "address", internalType: "address" }
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
