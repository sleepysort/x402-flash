// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract X402FlashSettlement {
    enum ChannelState {
        None,
        Open,
        PendingClose,
        Closed
    }

    struct Channel {
        uint256 escrowBalance;
        address token;
        uint256 openedAt;
        uint256 lastActivityAt;
        uint256 ttlSeconds;
        ChannelState state;
        address closedBy;
        uint256 pendingSettlements;
    }

    struct PaymentAuthorization {
        address settlementContract;
        address server;
        address token;
        uint256 amount;
        uint256 nonce;
        uint256 deadline;
    }

    mapping(address => mapping(address => Channel)) public channels;
    mapping(address => mapping(address => mapping(uint256 => bool))) public usedNonces;

    bytes32 public constant PAYMENT_TYPEHASH = keccak256(
        "PaymentAuthorization(address settlementContract,address server,address token,uint256 amount,uint256 nonce,uint256 deadline)"
    );
    bytes32 public DOMAIN_SEPARATOR;

    event ChannelOpened(address indexed client, address indexed server, address token, uint256 escrow, uint256 ttl);
    event PaymentSettled(address indexed client, address indexed server, uint256 amount);
    event ChannelClosing(address indexed client, address indexed server, address closedBy);
    event ChannelClosed(address indexed client, address indexed server, uint256 clientRefund);

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("X402FlashSettlement")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    modifier checkTTL(address client, address server) {
        Channel storage channel = channels[client][server];
        if (channel.state == ChannelState.Open && 
            block.timestamp > channel.lastActivityAt + channel.ttlSeconds) {
            channel.state = ChannelState.PendingClose;
            channel.closedBy = address(0);
            emit ChannelClosing(client, server, address(0));
        }
        _;
    }

    function openEscrow(
        address server,
        address token,
        uint256 amount,
        uint64 ttlSeconds
    ) external {
        require(server != address(0), "Invalid server address");
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        require(ttlSeconds > 0, "TTL must be greater than 0");
        
        Channel storage channel = channels[msg.sender][server];
        require(channel.state == ChannelState.None || channel.state == ChannelState.Closed, 
                "Channel already exists");

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        channel.escrowBalance = amount;
        channel.token = token;
        channel.openedAt = block.timestamp;
        channel.lastActivityAt = block.timestamp;
        channel.ttlSeconds = ttlSeconds;
        channel.state = ChannelState.Open;
        channel.closedBy = address(0);
        channel.pendingSettlements = 0;

        emit ChannelOpened(msg.sender, server, token, amount, ttlSeconds);
    }

    function currentEscrow(address client, address server) 
        public 
        view 
        returns (uint256) 
    {
        return channels[client][server].escrowBalance;
    }

    function settlePayment(
        address client,
        PaymentAuthorization memory auth,
        bytes memory signature
    ) external checkTTL(client, msg.sender) {
        Channel storage channel = channels[client][msg.sender];
        require(channel.state == ChannelState.Open, "Channel not open");
        require(auth.server == msg.sender, "Invalid server");
        require(auth.settlementContract == address(this), "Invalid contract");
        require(auth.token == channel.token, "Invalid token");
        require(auth.deadline >= block.timestamp, "Payment expired");
        require(!usedNonces[client][msg.sender][auth.nonce], "Nonce already used");

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(
                    PAYMENT_TYPEHASH,
                    auth.settlementContract,
                    auth.server,
                    auth.token,
                    auth.amount,
                    auth.nonce,
                    auth.deadline
                ))
            )
        );

        address signer = recoverSigner(digest, signature);
        require(signer == client, "Invalid signature");

        usedNonces[client][msg.sender][auth.nonce] = true;
        channel.lastActivityAt = block.timestamp;
        channel.pendingSettlements++;

        uint256 clientBalance = IERC20(channel.token).balanceOf(client);
        
        if (clientBalance >= auth.amount) {
            IERC20(channel.token).transferFrom(client, msg.sender, auth.amount);
        } else {
            require(channel.escrowBalance >= auth.amount, "Insufficient escrow");
            channel.escrowBalance -= auth.amount;
            IERC20(channel.token).transfer(msg.sender, auth.amount);
        }

        channel.pendingSettlements--;
        emit PaymentSettled(client, msg.sender, auth.amount);
    }

    function clientCloseEscrow(address server) external checkTTL(msg.sender, server) {
        Channel storage channel = channels[msg.sender][server];
        require(channel.state == ChannelState.Open || 
                (channel.state == ChannelState.PendingClose && channel.closedBy == server),
                "Cannot close channel");

        channel.state = ChannelState.PendingClose;
        channel.closedBy = msg.sender;
        emit ChannelClosing(msg.sender, server, msg.sender);

        _processChannelClosure(msg.sender, server);
    }

    function serverCloseEscrow(address client) external checkTTL(client, msg.sender) {
        Channel storage channel = channels[client][msg.sender];
        require(channel.state == ChannelState.Open || 
                (channel.state == ChannelState.PendingClose && channel.closedBy == client),
                "Cannot close channel");

        channel.state = ChannelState.PendingClose;
        channel.closedBy = msg.sender;
        emit ChannelClosing(client, msg.sender, msg.sender);

        _processChannelClosure(client, msg.sender);
    }

    function _processChannelClosure(address client, address server) private {
        Channel storage channel = channels[client][server];
        
        require(channel.pendingSettlements == 0, "Pending settlements exist");

        uint256 refundAmount = channel.escrowBalance;
        channel.escrowBalance = 0;
        channel.state = ChannelState.Closed;

        if (refundAmount > 0) {
            IERC20(channel.token).transfer(client, refundAmount);
        }

        emit ChannelClosed(client, server, refundAmount);
    }

    function recoverSigner(bytes32 digest, bytes memory signature) 
        private 
        pure 
        returns (address) 
    {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Invalid signature v value");
        return ecrecover(digest, v, r, s);
    }
}