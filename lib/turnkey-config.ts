// Load environment variables
const ORGANIZATION_ID = process.env.NEXT_PUBLIC_ORGANIZATION_ID || "";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://api.turnkey.com";
const RP_ID = process.env.NEXT_PUBLIC_RP_ID || "localhost";
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export const turnkeyConfig = {
    apiBaseUrl: BASE_URL,
    organizationId: ORGANIZATION_ID,
    iFrame: {
        url: "https://auth.turnkey.com",
        elementId: "turnkey-auth-iframe-element-id",
        containerId: "turnkey-auth-iframe-container-id",
        auth: {
            url: "https://auth.turnkey.com",
            containerId: "turnkey-auth-iframe-container-id",
        },
        export: {
            url: "https://export.turnkey.com",
            containerId: "turnkey-export-iframe-container-id",
        },
        import: {
            url: "https://import.turnkey.com",
            containerId: "turnkey-import-iframe-container-id",
        },
    },
    passkey: {
        rpId: RP_ID,
    },

    solanaRpcUrl: SOLANA_RPC_URL,
} 