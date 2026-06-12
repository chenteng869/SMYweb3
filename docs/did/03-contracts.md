# 03 - 智能合约代码

> **来源**: MVP版本-DID制作文档.md (第2190~2452行)
> **目标链**: EVM 私有链 / 联盟链
> **Solidity**: ^0.8.20
> **依赖**: OpenZeppelin Contracts

---

## 合约清单

| #   | 合约文件        | 功能                                          |
| --- | --------------- | --------------------------------------------- |
| 1   | DIDRegistry.sol | DID注册/查询/冻结/撤销 + KYC Hash记录         |
| 2   | ZSDTSBT.sol     | SBT凭证签发/撤销/查询（ERC721改造，禁止转让） |

---

## 1. DIDRegistry.sol

### 功能清单

```
registerDID()    → 注册DID
bindWallet()     → 绑定钱包
updateKycHash()  → 更新KYC哈希
freezeDID()      → 冻结DID
revokeDID()      → 撤销DID
getDID()         → 查询DID
getDIDByWallet() → 通过钱包反查DID
setOperator()    → 设置操作员权限
```

### 完整代码

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DIDRegistry
 * @dev 萨摩亚DID注册中心合约
 *      用于注册DID、绑定钱包、记录KYC状态哈希
 */
contract DIDRegistry is AccessControl {
    address public owner;

    /// @dev DID记录结构体
    struct DIDRecord {
        string did;           // DID标识 did:zsdt:xxx
        address wallet;       // 绑定的主钱包地址
        string status;        // 状态: pending/active/frozen/revoked
        string kycHash;       // KYC结果的SHA256哈希
        string metadataHash;  // 元数据哈希
        uint256 createdAt;    // 创建时间
        uint256 updatedAt;    // 最后更新时间
    }

    /// @dev 存储
    mapping(string => DIDRecord) private didRecords;
    mapping(address => string) private walletToDid;
    mapping(address => bool) public operators;

    /// @dev 事件
    event DIDRegistered(string indexed did, address indexed wallet, uint256 timestamp);
    event DIDUpdated(string indexed did, string status, uint256 timestamp);
    event WalletBound(string indexed did, address indexed wallet, uint256 timestamp);
    event KycHashUpdated(string indexed did, string kycHash, uint256 timestamp);
    event DIDFrozen(string indexed did, uint256 timestamp);
    event DIDRevoked(string indexed did, uint256 timestamp);

    /// @dev 角色定义
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyOperator() {
        require(
            msg.sender == owner || operators[msg.sender],
            "NOT_OPERATOR"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    /**
     * @notice 设置操作员权限
     * @param operator 操作员地址
     * @param allowed 是否允许
     */
    function setOperator(address operator, bool allowed) external onlyOwner {
        operators[operator] = allowed;
        emit DIDUpdated("", allowed ? "OPERATOR_ADDED" : "OPERATOR_REMOVED", block.timestamp);
    }

    /**
     * @notice 注册新的DID
     * @param did DID标识符 (e.g., did:zsdt:U202600000001)
     * @param wallet 主钱包地址
     * @param metadataHash 用户元数据的哈希
     */
    function registerDID(
        string calldata did,
        address wallet,
        string calldata metadataHash
    ) external onlyOperator {
        require(bytes(didRecords[did].did).length == 0, "DID_EXISTS");
        require(bytes(walletToDid[wallet]).length == 0, "WALLET_BOUND");

        didRecords[did] = DIDRecord({
            did: did,
            wallet: wallet,
            status: "pending",
            kycHash: "",
            metadataHash: metadataHash,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        walletToDid[wallet] = did;

        emit DIDRegistered(did, wallet, block.timestamp);
    }

    /**
     * @notice 为已有DID绑定额外钱包
     * @param did DID标识符
     * @param wallet 新钱包地址
     */
    function bindWallet(
        string calldata did,
        address wallet
    ) external onlyOperator {
        require(bytes(didRecords[did]).length > 0, "DID_NOT_FOUND");
        require(bytes(walletToDid[wallet]).length == 0, "WALLET_ALREADY_BOUND");

        didRecords[did].wallet = wallet;
        didRecords[did].updatedAt = block.timestamp;
        walletToDid[wallet] = did;

        emit WalletBound(did, wallet, block.timestamp);
    }

    /**
     * @notice 更新KYC哈希并激活DID
     * @param did DID标识符
     * @param kycHash KYC资料的SHA256哈希
     */
    function updateKycHash(
        string calldata did,
        string calldata kycHash
    ) external onlyOperator {
        require(bytes(didRecords[did]).length > 0, "DID_NOT_FOUND");

        didRecords[did].kycHash = kycHash;
        didRecords[did].status = "active";
        didRecords[did].updatedAt = block.timestamp;

        emit KycHashUpdated(did, kycHash, block.timestamp);
        emit DIDUpdated(did, "active", block.timestamp);
    }

    /**
     * @notice 冻结DID
     * @param did DID标识符
     */
    function freezeDID(string calldata did) external onlyOperator {
        require(bytes(didRecords[did]).length > 0, "DID_NOT_FOUND");

        didRecords[did].status = "frozen";
        didRecords[did].updatedAt = block.timestamp;

        emit DIDFrozen(did, block.timestamp);
    }

    /**
     * @notice 撤销DID（不可逆）
     * @param did DID标识符
     */
    function revokeDID(string calldata did) external onlyOperator {
        require(bytes(didRecords[did]).length > 0, "DID_NOT_FOUND");

        didRecords[did].status = "revoked";
        didRecords[did].updatedAt = block.timestamp;

        emit DIDRevoked(did, block.timestamp);
    }

    /**
     * @notice 查询DID详情
     * @param did DID标识符
     * @return DID记录
     */
    function getDID(string calldata did) external view returns (DIDRecord memory) {
        require(bytes(didRecords[did]).length > 0, "DID_NOT_FOUND");
        return didRecords[did];
    }

    /**
     * @notice 通过钱包地址反查DID
     * @param wallet 钱包地址
     * @return DID标识符
     */
    function getDIDByWallet(address wallet) external view returns (string memory) {
        return walletToDid[wallet];
    }
}
```

---

## 2. ZSDTSBT.sol

### 设计要点

- **基于 ERC721** (OpenZeppelin)
- **禁止转让**: override `transferFrom` / `safeTransferFrom` 全部 revert
- **基于角色的访问控制**:
  - `ISSUER_ROLE`: 可签发SBT
  - `REVOKER_ROLE`: 可撤销SBT
  - `DEFAULT_ADMIN_ROLE`: 管理员

### 功能清单

```
issueSBT()        → 签发SBT凭证
revokeSBT()       → 撤销SBT凭证
getTokensByDID()  → 按DID查询所有凭证
isValid()         → 检查凭证是否有效
```

### 完整代码

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ZSDTSBT
 * @dev 萨摩亚数字科技 SBT (Soulbound Token) 身份凭证合约
 *      基于ERC721改造，完全禁止转让
 */
contract ZSDTSBT is ERC721, AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");

    uint256 private _tokenIdCounter;

    /// @dev 凭证结构体
    struct Credential {
        string did;               // 所属DID
        string credentialType;    // 凭证类型 KYC_VERIFIED/MEMBER/VIP/...
        string credentialLevel;   // 凭证级别 standard/gold/platinum
        bool revoked;             // 是否被撤销
        uint256 issuedAt;         // 签发时间
        uint256 revokedAt;        // 撤销时间
    }

    /// @dev 存储
    mapping(uint256 => Credential) public credentials;
    mapping(string => uint256[]) private didToTokens;

    /// @dev 事件
    event SBTIssued(
        uint256 indexed tokenId,
        address indexed to,
        string did,
        string credentialType,
        uint256 timestamp
    );

    event SBTRevoked(
        uint256 indexed tokenId,
        string reason,
        uint256 timestamp
    );

    constructor() ERC721("ZSDT Identity SBT", "ZID") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
        _grantRole(REVOKER_ROLE, msg.sender);
    }

    /**
     * @notice 签发SBT凭证
     * @param to 接收者地址
     * @param did 所属DID
     * @param credentialType 凭证类型
     * @param credentialLevel 凭证级别
     * @return tokenId 新生成的Token ID
     */
    function issueSBT(
        address to,
        string calldata did,
        string calldata credentialType,
        string calldata credentialLevel
    ) external onlyRole(ISSUER_ROLE) returns (uint256) {
        require(to != address(0), "INVALID_TO");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(to, tokenId);

        credentials[tokenId] = Credential({
            did: did,
            credentialType: credentialType,
            credentialLevel: credentialLevel,
            revoked: false,
            issuedAt: block.timestamp,
            revokedAt: 0
        });

        didToTokens[did].push(tokenId);

        emit SBTIssued(tokenId, to, did, credentialType, block.timestamp);
        return tokenId;
    }

    /**
     * @notice 撤销SBT凭证
     * @param tokenId 要撤销的Token ID
     * @param reason 撤销原因
     */
    function revokeSBT(
        uint256 tokenId,
        string calldata reason
    ) external onlyRole(REVOKER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "TOKEN_NOT_FOUND");
        require(!credentials[tokenId].revoked, "ALREADY_REVOKED");

        credentials[tokenId].revoked = true;
        credentials[tokenId].revokedAt = block.timestamp;

        emit SBTRevoked(tokenId, reason, block.timestamp);
    }

    /**
     * @notice 按DID查询所有凭证Token ID
     * @param did DID标识符
     * @return tokenIds 该DID持有的所有SBT Token ID数组
     */
    function getTokensByDID(string calldata did) external view returns (uint256[] memory) {
        return didToTokens[did];
    }

    /**
     * @notice 检查凭证是否有效（未撤销且存在）
     * @param tokenId Token ID
     * @return 是否有效
     */
    function isValid(uint256 tokenId) external view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "TOKEN_NOT_FOUND");
        return !credentials[tokenId].revoked;
    }

    /**
     * @dev 禁止SBT转让 - 标准transferFrom
     */
    function transferFrom(
        address /*from*/,
        address /*to*/,
        uint256 /*tokenId*/
    ) public pure override {
        revert("SBT_NON_TRANSFERABLE");
    }

    /**
     * @dev 禁止SBT转让 - 安全转账（带data）
     */
    function safeTransferFrom(
        address /*from*/,
        address /*to*/,
        uint256 /*tokenId*/,
        bytes memory /*data*/
    ) public pure override {
        revert("SBT_NON_TRANSFERABLE");
    }

    /**
     * @dev 禁止SBT转让 - 安全转账（无data）
     */
    function safeTransferFrom(
        address /*from*/,
        address /*to*/,
        uint256 /*tokenId*/
    ) public pure override {
        revert("SBT_NON_TRANSFERABLE");
    }
}
```

---

## 合约部署顺序

```
1. 部署 DIDRegistry
   → 记录合约地址
   → 设置初始操作员 (setOperator)

2. 部署 ZSDTSBT
   → 记录合约地址
   → 设置签发者 (ISSUER_ROLE)
   → 设置撤销者 (REVOKER_ROLE)

3. 将合约地址配置到后端 .env
   → DID_REGISTRY_ADDRESS=0x...
   → SBT_CONTRACT_ADDRESS=0x...

4. 验证部署
   → 调用 getDID() 测试只读
   → 调用 registerDID() 测试写入
   → 调用 issueSBT() 测试SBT签发
```

---

## 合约交互工具

```bash
# 安装
npm install ethers @openzeppelin/contracts

# 编译 (Hardhat)
npx hardhat compile

# 部署到本地/测试网
npx hardhat run scripts/deploy.js --network localhost

# 验证
npx hardhat verify --network mainnet <DEPLOYED_ADDRESS>
```

---

_下一节_: [04-api.md](./04-api.md) — RESTful API 接口设计
