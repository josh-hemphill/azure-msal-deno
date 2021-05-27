/*
* Copyright (c) Microsoft Corporation. All rights reserved.
* Licensed under the MIT License.
*/
/**
 * Authority types supported by MSAL.
 */
declare enum AuthorityType {
    Default = 0,
    Adfs = 1
}
/**
 * Tenant Discovery Response which contains the relevant OAuth endpoints and data needed for authentication and authorization.
 */
type OpenIdConfigResponse = {
    authorization_endpoint: string;
    token_endpoint: string;
    end_session_endpoint: string;
    issuer: string;
};
/**
 * Interface which describes URI components.
 */
interface IUri {
    Protocol: string;
    HostNameAndPort: string;
    AbsolutePath: string;
    Search: string;
    Hash: string;
    PathSegments: string[];
    QueryString: string;
}
/**
 * Protocol modes supported by MSAL.
 */
declare enum ProtocolMode {
    AAD = "AAD",
    OIDC = "OIDC"
}
/**
 * we considered making this "enum" in the request instead of string, however it looks like the allowed list of
 * prompt values kept changing over past couple of years. There are some undocumented prompt values for some
 * internal partners too, hence the choice of generic "string" type instead of the "enum"
 */
declare const PromptValue: {
    LOGIN: string;
    SELECT_ACCOUNT: string;
    CONSENT: string;
    NONE: string;
};
/**
 * allowed values for response_mode
 */
declare enum ResponseMode {
    QUERY = "query",
    FRAGMENT = "fragment",
    FORM_POST = "form_post"
}
/**
 * Credential Type stored in the cache
 */
declare enum CredentialType {
    ID_TOKEN = "IdToken",
    ACCESS_TOKEN = "AccessToken",
    ACCESS_TOKEN_WITH_AUTH_SCHEME = "AccessToken_With_AuthScheme",
    REFRESH_TOKEN = "RefreshToken"
}
/**
 * Type of the authentication request
 */
declare enum AuthenticationScheme {
    POP = "pop",
    BEARER = "Bearer"
}
/**
 * Base type for credentials to be stored in the cache: eg: ACCESS_TOKEN, ID_TOKEN etc
 *
 * Key:Value Schema:
 *
 * Key: <home_account_id*>-<environment>-<credential_type>-<client_id>-<realm*>-<target*>
 *
 * Value Schema:
 * {
 *      homeAccountId: home account identifier for the auth scheme,
 *      environment: entity that issued the token, represented as a full host
 *      credentialType: Type of credential as a string, can be one of the following: RefreshToken, AccessToken, IdToken, Password, Cookie, Certificate, Other
 *      clientId: client ID of the application
 *      secret: Actual credential as a string
 *      familyId: Family ID identifier, usually only used for refresh tokens
 *      realm: Full tenant or organizational identifier that the account belongs to
 *      target: Permissions that are included in the token, or for refresh tokens, the resource identifier.
 *      oboAssertion: access token passed in as part of OBO request
 * }
 */
declare class CredentialEntity {
    homeAccountId: string;
    environment: string;
    credentialType: CredentialType;
    clientId: string;
    secret: string;
    familyId?: string;
    realm?: string;
    target?: string;
    oboAssertion?: string;
    /**
     * Generate Account Id key component as per the schema: <home_account_id>-<environment>
     */
    generateAccountId(): string;
    /**
     * Generate Credential Id key component as per the schema: <credential_type>-<client_id>-<realm>
     */
    generateCredentialId(): string;
    /**
     * Generate target key component as per schema: <target>
     */
    generateTarget(): string;
    /**
     * generates credential key
     */
    generateCredentialKey(): string;
    /**
     * returns the type of the cache (in this case credential)
     */
    generateType(): number;
    /**
     * helper function to return `CredentialType`
     * @param key
     */
    static getCredentialType(key: string): string;
    /**
     * generates credential key
     */
    static generateCredentialCacheKey(homeAccountId: string, environment: string, credentialType: CredentialType, clientId: string, realm?: string, target?: string, familyId?: string): string;
    /**
     * generates Account Id for keys
     * @param homeAccountId
     * @param environment
     */
    private static generateAccountIdForCacheKey;
    /**
     * Generates Credential Id for keys
     * @param credentialType
     * @param realm
     * @param clientId
     * @param familyId
     */
    private static generateCredentialIdForCacheKey;
    /**
     * Generate target key component as per schema: <target>
     */
    private static generateTargetForCacheKey;
}
/**
 * ID_TOKEN Cache
 *
 * Key:Value Schema:
 *
 * Key Example: uid.utid-login.microsoftonline.com-idtoken-clientId-contoso.com-
 *
 * Value Schema:
 * {
 *      homeAccountId: home account identifier for the auth scheme,
 *      environment: entity that issued the token, represented as a full host
 *      credentialType: Type of credential as a string, can be one of the following: RefreshToken, AccessToken, IdToken, Password, Cookie, Certificate, Other
 *      clientId: client ID of the application
 *      secret: Actual credential as a string
 *      realm: Full tenant or organizational identifier that the account belongs to
 * }
 */
declare class IdTokenEntity extends CredentialEntity {
    realm: string;
    /**
     * Create IdTokenEntity
     * @param homeAccountId
     * @param authenticationResult
     * @param clientId
     * @param authority
     */
    static createIdTokenEntity(homeAccountId: string, environment: string, idToken: string, clientId: string, tenantId: string, oboAssertion?: string): IdTokenEntity;
    /**
     * Validates an entity: checks for all expected params
     * @param entity
     */
    static isIdTokenEntity(entity: object): boolean;
}
/**
 * BaseAuthRequest
 * - authority               - URL of the authority, the security token service (STS) from which MSAL will acquire tokens. Defaults to https://login.microsoftonline.com/common. If using the same authority for all request, authority should set on client application object and not request, to avoid resolving authority endpoints multiple times.
 * - correlationId           - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - scopes                  - Array of scopes the application is requesting access to.
 * - authenticationScheme       - The type of token retrieved. Defaults to "Bearer". Can also be type "pop".
 * - claims                  - A stringified claims request which will be added to all /authorize and /token calls
 * - shrClaims               - A stringified claims object which will be added to a Signed HTTP Request
 * - resourceRequestMethod      - HTTP Request type used to request data from the resource (i.e. "GET", "POST", etc.).  Used for proof-of-possession flows.
 * - resourceRequestUri         - URI that token will be used for. Used for proof-of-possession flows.
 */
type BaseAuthRequest = {
    authority: string;
    correlationId: string;
    scopes: Array<string>;
    authenticationScheme?: AuthenticationScheme;
    claims?: string;
    shrClaims?: string;
    resourceRequestMethod?: string;
    resourceRequestUri?: string;
};
/*
* Copyright (c) Microsoft Corporation. All rights reserved.
* Licensed under the MIT License.
*/
type SignedHttpRequest = {
    at?: string;
    cnf?: object;
    m?: string;
    u?: string;
    p?: string;
    q?: [
        Array<string>,
        string
    ];
    ts?: number;
    nonce?: string;
    client_claims?: string;
};
/**
 * The PkceCodes type describes the structure
 * of objects that contain PKCE code
 * challenge and verifier pairs
 */
type PkceCodes = {
    verifier: string;
    challenge: string;
};
/**
 * Interface for crypto functions used by library
 */
interface ICrypto {
    /**
     * Creates a guid randomly.
     */
    createNewGuid(): string;
    /**
     * base64 Encode string
     * @param input
     */
    base64Encode(input: string): string;
    /**
     * base64 decode string
     * @param input
     */
    base64Decode(input: string): string;
    /**
     * Generate PKCE codes for OAuth. See RFC here: https://tools.ietf.org/html/rfc7636
     */
    generatePkceCodes(): Promise<PkceCodes>;
    /**
     * Generates an JWK RSA S256 Thumbprint
     * @param request
     */
    getPublicKeyThumbprint(request: BaseAuthRequest): Promise<string>;
    /**
     * Returns a signed proof-of-possession token with a given acces token that contains a cnf claim with the required kid.
     * @param accessToken
     */
    signJwt(payload: SignedHttpRequest, kid: string): Promise<string>;
}
/**
 * ACCESS_TOKEN Credential Type
 *
 * Key:Value Schema:
 *
 * Key Example: uid.utid-login.microsoftonline.com-accesstoken-clientId-contoso.com-user.read
 *
 * Value Schema:
 * {
 *      homeAccountId: home account identifier for the auth scheme,
 *      environment: entity that issued the token, represented as a full host
 *      credentialType: Type of credential as a string, can be one of the following: RefreshToken, AccessToken, IdToken, Password, Cookie, Certificate, Other
 *      clientId: client ID of the application
 *      secret: Actual credential as a string
 *      familyId: Family ID identifier, usually only used for refresh tokens
 *      realm: Full tenant or organizational identifier that the account belongs to
 *      target: Permissions that are included in the token, or for refresh tokens, the resource identifier.
 *      cachedAt: Absolute device time when entry was created in the cache.
 *      expiresOn: Token expiry time, calculated based on current UTC time in seconds. Represented as a string.
 *      extendedExpiresOn: Additional extended expiry time until when token is valid in case of server-side outage. Represented as string in UTC seconds.
 *      keyId: used for POP and SSH tokenTypes
 *      tokenType: Type of the token issued. Usually "Bearer"
 * }
 */
declare class AccessTokenEntity extends CredentialEntity {
    realm: string;
    target: string;
    cachedAt: string;
    expiresOn: string;
    extendedExpiresOn?: string;
    refreshOn?: string;
    keyId?: string; // for POP and SSH tokenTypes
    tokenType?: string;
    /**
     * Create AccessTokenEntity
     * @param homeAccountId
     * @param environment
     * @param accessToken
     * @param clientId
     * @param tenantId
     * @param scopes
     * @param expiresOn
     * @param extExpiresOn
     */
    static createAccessTokenEntity(homeAccountId: string, environment: string, accessToken: string, clientId: string, tenantId: string, scopes: string, expiresOn: number, extExpiresOn: number, cryptoUtils: ICrypto, refreshOn?: number, tokenType?: string, oboAssertion?: string): AccessTokenEntity;
    /**
     * Validates an entity: checks for all expected params
     * @param entity
     */
    static isAccessTokenEntity(entity: object): boolean;
}
/**
 * REFRESH_TOKEN Cache
 *
 * Key:Value Schema:
 *
 * Key Example: uid.utid-login.microsoftonline.com-refreshtoken-clientId--
 *
 * Value:
 * {
 *      homeAccountId: home account identifier for the auth scheme,
 *      environment: entity that issued the token, represented as a full host
 *      credentialType: Type of credential as a string, can be one of the following: RefreshToken, AccessToken, IdToken, Password, Cookie, Certificate, Other
 *      clientId: client ID of the application
 *      secret: Actual credential as a string
 *      familyId: Family ID identifier, '1' represents Microsoft Family
 *      realm: Full tenant or organizational identifier that the account belongs to
 *      target: Permissions that are included in the token, or for refresh tokens, the resource identifier.
 * }
 */
declare class RefreshTokenEntity extends CredentialEntity {
    familyId?: string;
    /**
     * Create RefreshTokenEntity
     * @param homeAccountId
     * @param authenticationResult
     * @param clientId
     * @param authority
     */
    static createRefreshTokenEntity(homeAccountId: string, environment: string, refreshToken: string, clientId: string, familyId?: string, oboAssertion?: string): RefreshTokenEntity;
    /**
     * Validates an entity: checks for all expected params
     * @param entity
     */
    static isRefreshTokenEntity(entity: object): boolean;
}
/**
 * APP_METADATA Cache
 *
 * Key:Value Schema:
 *
 * Key: appmetadata-<environment>-<client_id>
 *
 * Value:
 * {
 *      clientId: client ID of the application
 *      environment: entity that issued the token, represented as a full host
 *      familyId: Family ID identifier, '1' represents Microsoft Family
 * }
 */
declare class AppMetadataEntity {
    clientId: string;
    environment: string;
    familyId?: string;
    /**
     * Generate AppMetadata Cache Key as per the schema: appmetadata-<environment>-<client_id>
     */
    generateAppMetadataKey(): string;
    /**
     * Generate AppMetadata Cache Key
     */
    static generateAppMetadataCacheKey(environment: string, clientId: string): string;
    /**
     * Creates AppMetadataEntity
     * @param clientId
     * @param environment
     * @param familyId
     */
    static createAppMetadataEntity(clientId: string, environment: string, familyId?: string): AppMetadataEntity;
    /**
     * Validates an entity: checks for all expected params
     * @param entity
     */
    static isAppMetadataEntity(key: string, entity: object): boolean;
}
declare class CacheRecord {
    account: AccountEntity | null;
    idToken: IdTokenEntity | null;
    accessToken: AccessTokenEntity | null;
    refreshToken: RefreshTokenEntity | null;
    appMetadata: AppMetadataEntity | null;
    constructor(accountEntity?: AccountEntity | null, idTokenEntity?: IdTokenEntity | null, accessTokenEntity?: AccessTokenEntity | null, refreshTokenEntity?: RefreshTokenEntity | null, appMetadataEntity?: AppMetadataEntity | null);
}
/**
 * Account object with the following signature:
 * - homeAccountId          - Home account identifier for this account object
 * - environment            - Entity which issued the token represented by the domain of the issuer (e.g. login.microsoftonline.com)
 * - tenantId               - Full tenant or organizational id that this account belongs to
 * - username               - preferred_username claim of the id_token that represents this account
 * - localAccountId         - Local, tenant-specific account identifer for this account object, usually used in legacy cases
 * - name                   - Full name for the account, including given name and family name
 * - idTokenClaims          - Object contains claims from ID token
 * - localAccountId         - The user's account ID
 */
type AccountInfo = {
    homeAccountId: string;
    environment: string;
    tenantId: string;
    username: string;
    localAccountId: string;
    name?: string;
    idTokenClaims?: object;
};
declare class ServerTelemetryEntity {
    failedRequests: Array<string | number>;
    errors: string[];
    cacheHits: number;
    constructor();
    /**
     * validates if a given cache entry is "Telemetry", parses <key,value>
     * @param key
     * @param entity
     */
    static isServerTelemetryEntity(key: string, entity?: object): boolean;
}
declare class ThrottlingEntity {
    // Unix-time value representing the expiration of the throttle
    throttleTime: number;
    // Information provided by the server
    error?: string;
    errorCodes?: Array<string>;
    errorMessage?: string;
    subError?: string;
    /**
     * validates if a given cache entry is "Throttling", parses <key,value>
     * @param key
     * @param entity
     */
    static isThrottlingEntity(key: string, entity?: object): boolean;
}
/*
* Copyright (c) Microsoft Corporation. All rights reserved.
* Licensed under the MIT License.
*/
type CloudDiscoveryMetadata = {
    preferred_network: string;
    preferred_cache: string;
    aliases: Array<string>;
};
declare class AuthorityMetadataEntity {
    aliases: Array<string>;
    preferred_cache: string;
    preferred_network: string;
    canonical_authority: string;
    authorization_endpoint: string;
    token_endpoint: string;
    end_session_endpoint: string;
    issuer: string;
    aliasesFromNetwork: boolean;
    endpointsFromNetwork: boolean;
    expiresAt: number;
    constructor();
    /**
     * Update the entity with new aliases, preferred_cache and preferred_network values
     * @param metadata
     * @param fromNetwork
     */
    updateCloudDiscoveryMetadata(metadata: CloudDiscoveryMetadata, fromNetwork: boolean): void;
    /**
     * Update the entity with new endpoints
     * @param metadata
     * @param fromNetwork
     */
    updateEndpointMetadata(metadata: OpenIdConfigResponse, fromNetwork: boolean): void;
    /**
     * Save the authority that was used to create this cache entry
     * @param authority
     */
    updateCanonicalAuthority(authority: string): void;
    /**
     * Reset the exiresAt value
     */
    resetExpiresAt(): void;
    /**
     * Returns whether or not the data needs to be refreshed
     */
    isExpired(): boolean;
    /**
     * Validates an entity: checks for all expected params
     * @param entity
     */
    static isAuthorityMetadataEntity(key: string, entity: object): boolean;
}
interface ICacheManager {
    /**
     * fetch the account entity from the platform cache
     * @param accountKey
     */
    getAccount(accountKey: string): AccountEntity | null;
    /**
     * set account entity in the platform cache
     * @param account
     */
    setAccount(account: AccountEntity): void;
    /**
     * fetch the idToken entity from the platform cache
     * @param idTokenKey
     */
    getIdTokenCredential(idTokenKey: string): IdTokenEntity | null;
    /**
     * set idToken entity to the platform cache
     * @param idToken
     */
    setIdTokenCredential(idToken: IdTokenEntity): void;
    /**
     * fetch the idToken entity from the platform cache
     * @param accessTokenKey
     */
    getAccessTokenCredential(accessTokenKey: string): AccessTokenEntity | null;
    /**
     * set idToken entity to the platform cache
     * @param accessToken
     */
    setAccessTokenCredential(accessToken: AccessTokenEntity): void;
    /**
     * fetch the idToken entity from the platform cache
     * @param refreshTokenKey
     */
    getRefreshTokenCredential(refreshTokenKey: string): RefreshTokenEntity | null;
    /**
     * set idToken entity to the platform cache
     * @param refreshToken
     */
    setRefreshTokenCredential(refreshToken: RefreshTokenEntity): void;
    /**
     * fetch appMetadata entity from the platform cache
     * @param appMetadataKey
     */
    getAppMetadata(appMetadataKey: string): AppMetadataEntity | null;
    /**
     * set appMetadata entity to the platform cache
     * @param appMetadata
     */
    setAppMetadata(appMetadata: AppMetadataEntity): void;
    /**
     * fetch server telemetry entity from the platform cache
     * @param serverTelemetryKey
     */
    getServerTelemetry(serverTelemetryKey: string): ServerTelemetryEntity | null;
    /**
     * set server telemetry entity to the platform cache
     * @param serverTelemetryKey
     * @param serverTelemetry
     */
    setServerTelemetry(serverTelemetryKey: string, serverTelemetry: ServerTelemetryEntity): void;
    /**
     * fetch cloud discovery metadata entity from the platform cache
     * @param key
     */
    getAuthorityMetadata(key: string): AuthorityMetadataEntity | null;
    /**
     * Get cache keys for authority metadata
     */
    getAuthorityMetadataKeys(): Array<string>;
    /**
     * set cloud discovery metadata entity to the platform cache
     * @param key
     * @param value
     */
    setAuthorityMetadata(key: string, value: AuthorityMetadataEntity): void;
    /**
     * Provide an alias to find a matching AuthorityMetadataEntity in cache
     * @param host
     */
    getAuthorityMetadataByAlias(host: string): AuthorityMetadataEntity | null;
    /**
     * given an authority generates the cache key for authorityMetadata
     * @param authority
     */
    generateAuthorityMetadataCacheKey(authority: string): string;
    /**
     * fetch throttling entity from the platform cache
     * @param throttlingCacheKey
     */
    getThrottlingCache(throttlingCacheKey: string): ThrottlingEntity | null;
    /**
     * set throttling entity to the platform cache
     * @param throttlingCacheKey
     * @param throttlingCache
     */
    setThrottlingCache(throttlingCacheKey: string, throttlingCache: ThrottlingEntity): void;
    /**
     * Returns all accounts in cache
     */
    getAllAccounts(): AccountInfo[];
    /**
     * saves a cache record
     * @param cacheRecord
     */
    saveCacheRecord(cacheRecord: CacheRecord): void;
    /**
     * retrieve accounts matching all provided filters; if no filter is set, get all accounts
     * @param homeAccountId
     * @param environment
     * @param realm
     */
    getAccountsFilteredBy(filter: AccountFilter): AccountCache;
    /**
     * retrieve credentials matching all provided filters; if no filter is set, get all credentials
     * @param homeAccountId
     * @param environment
     * @param credentialType
     * @param clientId
     * @param realm
     * @param target
     */
    getCredentialsFilteredBy(filter: CredentialFilter): CredentialCache;
    /**
     * Removes all accounts and related tokens from cache.
     */
    removeAllAccounts(): boolean;
    /**
     * returns a boolean if the given account is removed
     * @param account
     */
    removeAccount(accountKey: string): boolean;
    /**
     * returns a boolean if the given account is removed
     * @param account
     */
    removeAccountContext(account: AccountEntity): boolean;
    /**
     * returns a boolean if the given credential is removed
     * @param credential
     */
    removeCredential(credential: CredentialEntity): boolean;
}
// The type here is a string instead of enum as the list of regional end points supported is not final yet.
type AzureRegion = string;
/*
* AzureRegionConfiguration
* - preferredAzureRegion       - Preferred azure region from the user
* - environmentRegionFunc      - Environment specific way of fetching the region from the environment
*/
type AzureRegionConfiguration = {
    azureRegion?: AzureRegion;
    environmentRegion: string | undefined;
};
type AuthorityOptions = {
    protocolMode: ProtocolMode;
    knownAuthorities: Array<string>;
    cloudDiscoveryMetadata: string;
    authorityMetadata: string;
    azureRegionConfiguration?: AzureRegionConfiguration;
};
/**
 * The authority class validates the authority URIs used by the user, and retrieves the OpenID Configuration Data from the
 * endpoint. It will store the pertinent config data in this object for use during token calls.
 */
declare class Authority {
    // Canonical authority url string
    private _canonicalAuthority;
    // Canonicaly authority url components
    private _canonicalAuthorityUrlComponents;
    // Network interface to make requests with.
    protected networkInterface: INetworkModule;
    // Cache Manager to cache network responses
    protected cacheManager: ICacheManager;
    // Protocol mode to construct endpoints
    private authorityOptions;
    // Authority metadata
    private metadata;
    // Region discovery service
    private regionDiscovery;
    constructor(authority: string, networkInterface: INetworkModule, cacheManager: ICacheManager, authorityOptions: AuthorityOptions);
    // See above for AuthorityType
    get authorityType(): AuthorityType;
    /**
     * ProtocolMode enum representing the way endpoints are constructed.
     */
    get protocolMode(): ProtocolMode;
    /**
     * Returns authorityOptions which can be used to reinstantiate a new authority instance
     */
    get options(): AuthorityOptions;
    /**
     * A URL that is the authority set by the developer
     */
    get canonicalAuthority(): string;
    /**
     * Sets canonical authority.
     */
    set canonicalAuthority(url: string);
    /**
     * Get authority components.
     */
    get canonicalAuthorityUrlComponents(): IUri;
    /**
     * Get hostname and port i.e. login.microsoftonline.com
     */
    get hostnameAndPort(): string;
    /**
     * Get tenant for authority.
     */
    get tenant(): string;
    /**
     * OAuth /authorize endpoint for requests
     */
    get authorizationEndpoint(): string;
    /**
     * OAuth /token endpoint for requests
     */
    get tokenEndpoint(): string;
    get deviceCodeEndpoint(): string;
    /**
     * OAuth logout endpoint for requests
     */
    get endSessionEndpoint(): string;
    /**
     * OAuth issuer for requests
     */
    get selfSignedJwtAudience(): string;
    /**
     * Replaces tenant in url path with current tenant. Defaults to common.
     * @param urlString
     */
    private replaceTenant;
    /**
     * Replaces path such as tenant or policy with the current tenant or policy.
     * @param urlString
     */
    private replacePath;
    /**
     * The default open id configuration endpoint for any canonical authority.
     */
    protected get defaultOpenIdConfigurationEndpoint(): string;
    /**
     * Boolean that returns whethr or not tenant discovery has been completed.
     */
    discoveryComplete(): boolean;
    /**
     * Perform endpoint discovery to discover aliases, preferred_cache, preferred_network
     * and the /authorize, /token and logout endpoints.
     */
    resolveEndpointsAsync(): Promise<void>;
    /**
     * Update AuthorityMetadataEntity with new endpoints and return where the information came from
     * @param metadataEntity
     */
    private updateEndpointMetadata;
    /**
     * Compares the number of url components after the domain to determine if the cached authority metadata can be used for the requested authority
     * Protects against same domain different authority such as login.microsoftonline.com/tenant and login.microsoftonline.com/tfp/tenant/policy
     * @param metadataEntity
     */
    private isAuthoritySameType;
    /**
     * Parse authorityMetadata config option
     */
    private getEndpointMetadataFromConfig;
    /**
     * Gets OAuth endpoints from the given OpenID configuration endpoint.
     */
    private getEndpointMetadataFromNetwork;
    /**
     * Updates the AuthorityMetadataEntity with new aliases, preferred_network and preferred_cache and returns where the information was retrived from
     * @param cachedMetadata
     * @param newMetadata
     */
    private updateCloudDiscoveryMetadata;
    /**
     * Parse cloudDiscoveryMetadata config or check knownAuthorities
     */
    private getCloudDiscoveryMetadataFromConfig;
    /**
     * Called to get metadata from network if CloudDiscoveryMetadata was not populated by config
     * @param networkInterface
     */
    private getCloudDiscoveryMetadataFromNetwork;
    /**
     * Helper function to determine if this host is included in the knownAuthorities config option
     */
    private isInKnownAuthorities;
    /**
     * Creates cloud discovery metadata object from a given host
     * @param host
     */
    static createCloudDiscoveryMetadataFromHost(host: string): CloudDiscoveryMetadata;
    /**
     * Searches instance discovery network response for the entry that contains the host in the aliases list
     * @param response
     * @param authority
     */
    static getCloudDiscoveryMetadataFromNetworkResponse(response: CloudDiscoveryMetadata[], authority: string): CloudDiscoveryMetadata | null;
    /**
     * helper function to generate environment from authority object
     */
    getPreferredCache(): string;
    /**
     * Returns whether or not the provided host is an alias of this authority instance
     * @param host
     */
    isAlias(host: string): boolean;
    /**
     * Checks whether the provided host is that of a public cloud authority
     *
     * @param authority string
     * @returns bool
     */
    static isPublicCloudAuthority(host: string): boolean;
    /**
     * Rebuild the authority string with the region
     *
     * @param host string
     * @param region string
     */
    static buildRegionalAuthorityString(host: string, region: string, queryString?: string): string;
    /**
     * Replace the endpoints in the metadata object with their regional equivalents.
     *
     * @param metadata OpenIdConfigResponse
     * @param azureRegion string
     */
    static replaceWithRegionalInformation(metadata: OpenIdConfigResponse, azureRegion: string): OpenIdConfigResponse;
}
/**
 * Type which describes Id Token claims known by MSAL.
 */
type TokenClaims = {
    iss?: string;
    iat?: number;
    oid?: string;
    sub?: string;
    tid?: string;
    ver?: string;
    upn?: string;
    preferred_username?: string;
    emails?: string[];
    name?: string;
    nonce?: string;
    exp?: number;
    home_oid?: string;
    sid?: string;
    cloud_instance_host_name?: string;
    cnf?: {
        kid: string;
    };
    x5c_ca?: string;
};
/**
 * JWT Token representation class. Parses token string and generates claims object.
 */
declare class AuthToken {
    // Raw Token string
    rawToken: string;
    // Claims inside token
    claims: TokenClaims;
    constructor(rawToken: string, crypto: ICrypto);
    /**
     * Extract token by decoding the rawToken
     *
     * @param encodedToken
     */
    static extractTokenClaims(encodedToken: string, crypto: ICrypto): TokenClaims;
}
/**
 * Log message level.
 */
declare enum LogLevel {
    Error = 0,
    Warning = 1,
    Info = 2,
    Verbose = 3,
    Trace = 4
}
/**
 * Callback to send the messages to.
 */
interface ILoggerCallback {
    (level: LogLevel, message: string, containsPii: boolean): void;
}
/**
 * Class which facilitates logging of messages to a specific place.
 */
declare class Logger {
    // Correlation ID for request, usually set by user.
    private correlationId;
    // Current log level, defaults to info.
    private level;
    // Boolean describing whether PII logging is allowed.
    private piiLoggingEnabled;
    // Callback to send messages to.
    private localCallback;
    // Package name implementing this logger
    private packageName;
    // Package version implementing this logger
    private packageVersion;
    constructor(loggerOptions: LoggerOptions, packageName?: string, packageVersion?: string);
    /**
     * Create new Logger with existing configurations.
     */
    clone(packageName: string, packageVersion: string): Logger;
    /**
     * Log message with required options.
     */
    private logMessage;
    /**
     * Execute callback with message.
     */
    executeCallback(level: LogLevel, message: string, containsPii: boolean): void;
    /**
     * Logs error messages.
     */
    error(message: string, correlationId?: string): void;
    /**
     * Logs error messages with PII.
     */
    errorPii(message: string, correlationId?: string): void;
    /**
     * Logs warning messages.
     */
    warning(message: string, correlationId?: string): void;
    /**
     * Logs warning messages with PII.
     */
    warningPii(message: string, correlationId?: string): void;
    /**
     * Logs info messages.
     */
    info(message: string, correlationId?: string): void;
    /**
     * Logs info messages with PII.
     */
    infoPii(message: string, correlationId?: string): void;
    /**
     * Logs verbose messages.
     */
    verbose(message: string, correlationId?: string): void;
    /**
     * Logs verbose messages with PII.
     */
    verbosePii(message: string, correlationId?: string): void;
    /**
     * Logs trace messages.
     */
    trace(message: string, correlationId?: string): void;
    /**
     * Logs trace messages with PII.
     */
    tracePii(message: string, correlationId?: string): void;
    /**
     * Returns whether PII Logging is enabled or not.
     */
    isPiiLoggingEnabled(): boolean;
}
/**
 * Type that defines required and optional parameters for an Account field (based on universal cache schema implemented by all MSALs).
 *
 * Key : Value Schema
 *
 * Key: <home_account_id>-<environment>-<realm*>
 *
 * Value Schema:
 * {
 *      homeAccountId: home account identifier for the auth scheme,
 *      environment: entity that issued the token, represented as a full host
 *      realm: Full tenant or organizational identifier that the account belongs to
 *      localAccountId: Original tenant-specific accountID, usually used for legacy cases
 *      username: primary username that represents the user, usually corresponds to preferred_username in the v2 endpt
 *      authorityType: Accounts authority type as a string
 *      name: Full name for the account, including given name and family name,
 *      clientInfo: Full base64 encoded client info received from ESTS
 *      lastModificationTime: last time this entity was modified in the cache
 *      lastModificationApp:
 *      oboAssertion: access token passed in as part of OBO request
 *      idTokenClaims: Object containing claims parsed from ID token
 * }
 */
declare class AccountEntity {
    homeAccountId: string;
    environment: string;
    realm: string;
    localAccountId: string;
    username: string;
    authorityType: string;
    name?: string;
    clientInfo?: string;
    lastModificationTime?: string;
    lastModificationApp?: string;
    oboAssertion?: string;
    cloudGraphHostName?: string;
    msGraphHost?: string;
    idTokenClaims?: TokenClaims;
    /**
     * Generate Account Id key component as per the schema: <home_account_id>-<environment>
     */
    generateAccountId(): string;
    /**
     * Generate Account Cache Key as per the schema: <home_account_id>-<environment>-<realm*>
     */
    generateAccountKey(): string;
    /**
     * returns the type of the cache (in this case account)
     */
    generateType(): number;
    /**
     * Returns the AccountInfo interface for this account.
     */
    getAccountInfo(): AccountInfo;
    /**
     * Generates account key from interface
     * @param accountInterface
     */
    static generateAccountCacheKey(accountInterface: AccountInfo): string;
    /**
     * Build Account cache from IdToken, clientInfo and authority/policy. Associated with AAD.
     * @param clientInfo
     * @param authority
     * @param idToken
     * @param policy
     */
    static createAccount(clientInfo: string, homeAccountId: string, authority: Authority, idToken: AuthToken, oboAssertion?: string, cloudGraphHostName?: string, msGraphHost?: string): AccountEntity;
    /**
     * Builds non-AAD/ADFS account.
     * @param authority
     * @param idToken
     */
    static createGenericAccount(authority: Authority, homeAccountId: string, idToken: AuthToken, oboAssertion?: string, cloudGraphHostName?: string, msGraphHost?: string): AccountEntity;
    /**
     * Generate HomeAccountId from server response
     * @param serverClientInfo
     * @param authType
     */
    static generateHomeAccountId(serverClientInfo: string, authType: AuthorityType, logger: Logger, cryptoObj: ICrypto, idToken?: AuthToken): string;
    /**
     * Validates an entity: checks for all expected params
     * @param entity
     */
    static isAccountEntity(entity: object): boolean;
    /**
     * Helper function to determine whether 2 accountInfo objects represent the same account
     * @param accountA
     * @param accountB
     * @param compareClaims - If set to true idTokenClaims will also be compared to determine account equality
     */
    static accountInfoIsEqual(accountA: AccountInfo | null, accountB: AccountInfo | null, compareClaims?: boolean): boolean;
}
type AccountCache = Record<string, AccountEntity>;
type IdTokenCache = Record<string, IdTokenEntity>;
type AccessTokenCache = Record<string, AccessTokenEntity>;
type RefreshTokenCache = Record<string, RefreshTokenEntity>;
type AppMetadataCache = Record<string, AppMetadataEntity>;
type CredentialCache = {
    idTokens: IdTokenCache;
    accessTokens: AccessTokenCache;
    refreshTokens: RefreshTokenCache;
};
/**
 * Object type of all accepted cache types
 */
type ValidCacheType = AccountEntity | IdTokenEntity | AccessTokenEntity | RefreshTokenEntity | AppMetadataEntity | AuthorityMetadataEntity | ServerTelemetryEntity | ThrottlingEntity | string;
/**
 * Account:	<home_account_id>-<environment>-<realm*>
 */
type AccountFilter = {
    homeAccountId?: string;
    environment?: string;
    realm?: string;
};
/**
 * Credential: <home_account_id*>-<environment>-<credential_type>-<client_id>-<realm*>-<target*>
 */
type CredentialFilter = {
    homeAccountId?: string;
    environment?: string;
    credentialType?: string;
    clientId?: string;
    familyId?: string;
    realm?: string;
    target?: string;
    oboAssertion?: string;
};
/**
 * AppMetadata: appmetadata-<environment>-<client_id>
 */
type AppMetadataFilter = {
    environment?: string;
    clientId?: string;
};
/**
 * The ScopeSet class creates a set of scopes. Scopes are case-insensitive, unique values, so the Set object in JS makes
 * the most sense to implement for this class. All scopes are trimmed and converted to lower case strings in intersection and union functions
 * to ensure uniqueness of strings.
 */
declare class ScopeSet {
    // Scopes as a Set of strings
    private scopes;
    constructor(inputScopes: Array<string>);
    /**
     * Factory method to create ScopeSet from space-delimited string
     * @param inputScopeString
     * @param appClientId
     * @param scopesRequired
     */
    static fromString(inputScopeString: string): ScopeSet;
    /**
     * Used to validate the scopes input parameter requested  by the developer.
     * @param {Array<string>} inputScopes - Developer requested permissions. Not all scopes are guaranteed to be included in the access token returned.
     * @param {boolean} scopesRequired - Boolean indicating whether the scopes array is required or not
     */
    private validateInputScopes;
    /**
     * Check if a given scope is present in this set of scopes.
     * @param scope
     */
    containsScope(scope: string): boolean;
    /**
     * Check if a set of scopes is present in this set of scopes.
     * @param scopeSet
     */
    containsScopeSet(scopeSet: ScopeSet): boolean;
    /**
     * Check if set of scopes contains only the defaults
     */
    containsOnlyOIDCScopes(): boolean;
    /**
     * Appends single scope if passed
     * @param newScope
     */
    appendScope(newScope: string): void;
    /**
     * Appends multiple scopes if passed
     * @param newScopes
     */
    appendScopes(newScopes: Array<string>): void;
    /**
     * Removes element from set of scopes.
     * @param scope
     */
    removeScope(scope: string): void;
    /**
     * Removes default scopes from set of scopes
     * Primarily used to prevent cache misses if the default scopes are not returned from the server
     */
    removeOIDCScopes(): void;
    /**
     * Combines an array of scopes with the current set of scopes.
     * @param otherScopes
     */
    unionScopeSets(otherScopes: ScopeSet): Set<string>;
    /**
     * Check if scopes intersect between this set and another.
     * @param otherScopes
     */
    intersectingScopeSets(otherScopes: ScopeSet): boolean;
    /**
     * Returns size of set of scopes.
     */
    getScopeCount(): number;
    /**
     * Returns the scopes as an array of string values
     */
    asArray(): Array<string>;
    /**
     * Prints scopes into a space-delimited string
     */
    printScopes(): string;
    /**
     * Prints scopes into a space-delimited lower-case string (used for caching)
     */
    printScopesLowerCase(): string;
}
/**
 * Interface class which implement cache storage functions used by MSAL to perform validity checks, and store tokens.
 */
declare abstract class CacheManager implements ICacheManager {
    protected clientId: string;
    protected cryptoImpl: ICrypto;
    constructor(clientId: string, cryptoImpl: ICrypto);
    /**
     * fetch the account entity from the platform cache
     *  @param accountKey
     */
    abstract getAccount(accountKey: string): AccountEntity | null;
    /**
     * set account entity in the platform cache
     * @param account
     */
    abstract setAccount(account: AccountEntity): void;
    /**
     * fetch the idToken entity from the platform cache
     * @param idTokenKey
     */
    abstract getIdTokenCredential(idTokenKey: string): IdTokenEntity | null;
    /**
     * set idToken entity to the platform cache
     * @param idToken
     */
    abstract setIdTokenCredential(idToken: IdTokenEntity): void;
    /**
     * fetch the idToken entity from the platform cache
     * @param accessTokenKey
     */
    abstract getAccessTokenCredential(accessTokenKey: string): AccessTokenEntity | null;
    /**
     * set idToken entity to the platform cache
     * @param accessToken
     */
    abstract setAccessTokenCredential(accessToken: AccessTokenEntity): void;
    /**
     * fetch the idToken entity from the platform cache
     * @param refreshTokenKey
     */
    abstract getRefreshTokenCredential(refreshTokenKey: string): RefreshTokenEntity | null;
    /**
     * set idToken entity to the platform cache
     * @param refreshToken
     */
    abstract setRefreshTokenCredential(refreshToken: RefreshTokenEntity): void;
    /**
     * fetch appMetadata entity from the platform cache
     * @param appMetadataKey
     */
    abstract getAppMetadata(appMetadataKey: string): AppMetadataEntity | null;
    /**
     * set appMetadata entity to the platform cache
     * @param appMetadata
     */
    abstract setAppMetadata(appMetadata: AppMetadataEntity): void;
    /**
     * fetch server telemetry entity from the platform cache
     * @param serverTelemetryKey
     */
    abstract getServerTelemetry(serverTelemetryKey: string): ServerTelemetryEntity | null;
    /**
     * set server telemetry entity to the platform cache
     * @param serverTelemetryKey
     * @param serverTelemetry
     */
    abstract setServerTelemetry(serverTelemetryKey: string, serverTelemetry: ServerTelemetryEntity): void;
    /**
     * fetch cloud discovery metadata entity from the platform cache
     * @param key
     */
    abstract getAuthorityMetadata(key: string): AuthorityMetadataEntity | null;
    /**
     *
     */
    abstract getAuthorityMetadataKeys(): Array<string>;
    /**
     * set cloud discovery metadata entity to the platform cache
     * @param key
     * @param value
     */
    abstract setAuthorityMetadata(key: string, value: AuthorityMetadataEntity): void;
    /**
     * fetch throttling entity from the platform cache
     * @param throttlingCacheKey
     */
    abstract getThrottlingCache(throttlingCacheKey: string): ThrottlingEntity | null;
    /**
     * set throttling entity to the platform cache
     * @param throttlingCacheKey
     * @param throttlingCache
     */
    abstract setThrottlingCache(throttlingCacheKey: string, throttlingCache: ThrottlingEntity): void;
    /**
     * Function to remove an item from cache given its key.
     * @param key
     */
    abstract removeItem(key: string, type?: string): boolean;
    /**
     * Function which returns boolean whether cache contains a specific key.
     * @param key
     */
    abstract containsKey(key: string, type?: string): boolean;
    /**
     * Function which retrieves all current keys from the cache.
     */
    abstract getKeys(): string[];
    /**
     * Function which clears cache.
     */
    abstract clear(): void;
    /**
     * Returns all accounts in cache
     */
    getAllAccounts(): AccountInfo[];
    /**
     * saves a cache record
     * @param cacheRecord
     */
    saveCacheRecord(cacheRecord: CacheRecord): void;
    /**
     * saves access token credential
     * @param credential
     */
    private saveAccessToken;
    /**
     * retrieve accounts matching all provided filters; if no filter is set, get all accounts
     * not checking for casing as keys are all generated in lower case, remember to convert to lower case if object properties are compared
     * @param homeAccountId
     * @param environment
     * @param realm
     */
    getAccountsFilteredBy(accountFilter?: AccountFilter): AccountCache;
    /**
     * retrieve accounts matching all provided filters; if no filter is set, get all accounts
     * not checking for casing as keys are all generated in lower case, remember to convert to lower case if object properties are compared
     * @param homeAccountId
     * @param environment
     * @param realm
     */
    private getAccountsFilteredByInternal;
    /**
     * retrieve credentails matching all provided filters; if no filter is set, get all credentials
     * @param homeAccountId
     * @param environment
     * @param credentialType
     * @param clientId
     * @param realm
     * @param target
     */
    getCredentialsFilteredBy(filter: CredentialFilter): CredentialCache;
    /**
     * Support function to help match credentials
     * @param homeAccountId
     * @param environment
     * @param credentialType
     * @param clientId
     * @param realm
     * @param target
     */
    private getCredentialsFilteredByInternal;
    /**
     * retrieve appMetadata matching all provided filters; if no filter is set, get all appMetadata
     * @param filter
     */
    getAppMetadataFilteredBy(filter: AppMetadataFilter): AppMetadataCache;
    /**
     * Support function to help match appMetadata
     * @param environment
     * @param clientId
     */
    private getAppMetadataFilteredByInternal;
    /**
     * retrieve authorityMetadata that contains a matching alias
     * @param filter
     */
    getAuthorityMetadataByAlias(host: string): AuthorityMetadataEntity | null;
    /**
     * Removes all accounts and related tokens from cache.
     */
    removeAllAccounts(): boolean;
    /**
     * returns a boolean if the given account is removed
     * @param account
     */
    removeAccount(accountKey: string): boolean;
    /**
     * returns a boolean if the given account is removed
     * @param account
     */
    removeAccountContext(account: AccountEntity): boolean;
    /**
     * returns a boolean if the given credential is removed
     * @param credential
     */
    removeCredential(credential: CredentialEntity): boolean;
    /**
     * Removes all app metadata objects from cache.
     */
    removeAppMetadata(): boolean;
    /**
     * Retrieve the cached credentials into a cacherecord
     * @param account
     * @param clientId
     * @param scopes
     * @param environment
     * @param authScheme
     */
    readCacheRecord(account: AccountInfo, clientId: string, scopes: ScopeSet, environment: string, authScheme: AuthenticationScheme): CacheRecord;
    /**
     * Retrieve AccountEntity from cache
     * @param account
     */
    readAccountFromCache(account: AccountInfo): AccountEntity | null;
    /**
     * Retrieve IdTokenEntity from cache
     * @param clientId
     * @param account
     * @param inputRealm
     */
    readIdTokenFromCache(clientId: string, account: AccountInfo): IdTokenEntity | null;
    /**
     * Retrieve AccessTokenEntity from cache
     * @param clientId
     * @param account
     * @param scopes
     * @param authScheme
     */
    readAccessTokenFromCache(clientId: string, account: AccountInfo, scopes: ScopeSet, authScheme: AuthenticationScheme): AccessTokenEntity | null;
    /**
     * Helper to retrieve the appropriate refresh token from cache
     * @param clientId
     * @param account
     * @param familyRT
     */
    readRefreshTokenFromCache(clientId: string, account: AccountInfo, familyRT: boolean): RefreshTokenEntity | null;
    /**
     * Retrieve AppMetadataEntity from cache
     */
    readAppMetadataFromCache(environment: string, clientId: string): AppMetadataEntity | null;
    /**
     * Return the family_id value associated  with FOCI
     * @param environment
     * @param clientId
     */
    isAppMetadataFOCI(environment: string, clientId: string): boolean;
    /**
     * helper to match account ids
     * @param value
     * @param homeAccountId
     */
    private matchHomeAccountId;
    /**
     * helper to match assertion
     * @param value
     * @param oboAssertion
     */
    private matchOboAssertion;
    /**
     * helper to match environment
     * @param value
     * @param environment
     */
    private matchEnvironment;
    /**
     * helper to match credential type
     * @param entity
     * @param credentialType
     */
    private matchCredentialType;
    /**
     * helper to match client ids
     * @param entity
     * @param clientId
     */
    private matchClientId;
    /**
     * helper to match family ids
     * @param entity
     * @param familyId
     */
    private matchFamilyId;
    /**
     * helper to match realm
     * @param entity
     * @param realm
     */
    private matchRealm;
    /**
     * Returns true if the target scopes are a subset of the current entity's scopes, false otherwise.
     * @param entity
     * @param target
     */
    private matchTarget;
    /**
     * returns if a given cache entity is of the type appmetadata
     * @param key
     */
    private isAppMetadata;
    /**
     * returns if a given cache entity is of the type authoritymetadata
     * @param key
     */
    protected isAuthorityMetadata(key: string): boolean;
    /**
     * returns cache key used for cloud instance metadata
     */
    generateAuthorityMetadataCacheKey(authority: string): string;
    /**
     * Returns the specific credential (IdToken/AccessToken/RefreshToken) from the cache
     * @param key
     * @param credType
     */
    private getSpecificCredential;
    /**
     * Helper to convert serialized data to object
     * @param obj
     * @param json
     */
    static toObject<T>(obj: T, json: object): T;
}
type NetworkResponse<T> = {
    headers: Record<string, string>;
    body: T;
    status: number;
};
/**
 * Options allowed by network request APIs.
 */
type NetworkRequestOptions = {
    headers?: Record<string, string>;
    body?: string;
};
/**
 * Client network interface to send backend requests.
 * @interface
 */
interface INetworkModule {
    /**
     * Interface function for async network "GET" requests. Based on the Fetch standard: https://fetch.spec.whatwg.org/
     * @param url
     * @param requestParams
     * @param enableCaching
     */
    sendGetRequestAsync<T>(url: string, options?: NetworkRequestOptions, cancellationToken?: number): Promise<NetworkResponse<T>>;
    /**
     * Interface function for async network "POST" requests. Based on the Fetch standard: https://fetch.spec.whatwg.org/
     * @param url
     * @param requestParams
     * @param enableCaching
     */
    sendPostRequestAsync<T>(url: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>>;
}
/**
 * AuthErrorMessage class containing string constants used by error codes and messages.
 */
declare const AuthErrorMessage: {
    unexpectedError: {
        code: string;
        desc: string;
    };
};
/**
 * General error class thrown by the MSAL.js library.
 */
declare class AuthError extends Error {
    /**
     * Short string denoting error
     */
    errorCode: string;
    /**
     * Detailed description of error
     */
    errorMessage: string;
    /**
     * Describes the subclass of an error
     */
    subError: string;
    constructor(errorCode?: string, errorMessage?: string, suberror?: string);
    /**
     * Creates an error that is thrown when something unexpected happens in the library.
     * @param errDesc
     */
    static createUnexpectedError(errDesc: string): AuthError;
}
/*
* Copyright (c) Microsoft Corporation. All rights reserved.
* Licensed under the MIT License.
*/
type ServerTelemetryRequest = {
    clientId: string;
    apiId: number;
    correlationId: string;
    forceRefresh?: boolean;
    wrapperSKU?: string;
    wrapperVer?: string;
};
declare class ServerTelemetryManager {
    private cacheManager;
    private apiId;
    private correlationId;
    private forceRefresh;
    private telemetryCacheKey;
    private wrapperSKU;
    private wrapperVer;
    constructor(telemetryRequest: ServerTelemetryRequest, cacheManager: CacheManager);
    /**
     * API to add MSER Telemetry to request
     */
    generateCurrentRequestHeaderValue(): string;
    /**
     * API to add MSER Telemetry for the last failed request
     */
    generateLastRequestHeaderValue(): string;
    /**
     * API to cache token failures for MSER data capture
     * @param error
     */
    cacheFailedRequest(error: AuthError): void;
    /**
     * Update server telemetry cache entry by incrementing cache hit counter
     */
    incrementCacheHits(): number;
    /**
     * Get the server telemetry entity from cache or initialize a new one
     */
    getLastRequests(): ServerTelemetryEntity;
    /**
     * Remove server telemetry cache entry
     */
    clearTelemetryCache(): void;
    /**
     * Returns the maximum number of errors that can be flushed to the server in the next network request
     * @param serverTelemetryEntity
     */
    static maxErrorsToSend(serverTelemetryEntity: ServerTelemetryEntity): number;
}
/*
* Copyright (c) Microsoft Corporation. All rights reserved.
* Licensed under the MIT License.
*/
interface ISerializableTokenCache {
    deserialize: (cache: string) => void;
    serialize: () => string;
}
/**
 * This class instance helps track the memory changes facilitating
 * decisions to read from and write to the persistent cache
 */ declare class TokenCacheContext {
    /**
     * boolean indicating cache change
     */
    hasChanged: boolean;
    /**
     * serializable token cache interface
     */
    cache: ISerializableTokenCache;
    constructor(tokenCache: ISerializableTokenCache, hasChanged: boolean);
    /**
     * boolean which indicates the changes in cache
     */
    get cacheHasChanged(): boolean;
    /**
     * function to retrieve the token cache
     */
    get tokenCache(): ISerializableTokenCache;
}
interface ICachePlugin {
    beforeCacheAccess: (tokenCacheContext: TokenCacheContext) => Promise<void>;
    afterCacheAccess: (tokenCacheContext: TokenCacheContext) => Promise<void>;
}
/**
 * Use the configuration object to configure MSAL Modules and initialize the base interfaces for MSAL.
 *
 * This object allows you to configure important elements of MSAL functionality:
 * - authOptions                - Authentication for application
 * - cryptoInterface            - Implementation of crypto functions
 * - libraryInfo                - Library metadata
 * - loggerOptions              - Logging for application
 * - networkInterface           - Network implementation
 * - storageInterface           - Storage implementation
 * - systemOptions              - Additional library options
 * - clientCredentials          - Credentials options for confidential clients
 */
type ClientConfiguration = {
    authOptions: AuthOptions;
    systemOptions?: SystemOptions;
    loggerOptions?: LoggerOptions;
    storageInterface?: CacheManager;
    networkInterface?: INetworkModule;
    cryptoInterface?: ICrypto;
    clientCredentials?: ClientCredentials;
    libraryInfo?: LibraryInfo;
    serverTelemetryManager?: ServerTelemetryManager | null;
    persistencePlugin?: ICachePlugin | null;
    serializableCache?: ISerializableTokenCache | null;
};
/**
 * Use this to configure the auth options in the ClientConfiguration object
 *
 * - clientId                    - Client ID of your app registered with our Application registration portal : https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredAppsPreview in Microsoft Identity Platform
 * - authority                   - You can configure a specific authority, defaults to " " or "https://login.microsoftonline.com/common"
 * - knownAuthorities            - An array of URIs that are known to be valid. Used in B2C scenarios.
 * - cloudDiscoveryMetadata      - A string containing the cloud discovery response. Used in AAD scenarios.
 * - clientCapabilities          - Array of capabilities which will be added to the claims.access_token.xms_cc request property on every network request.
 * - protocolMode                - Enum that represents the protocol that msal follows. Used for configuring proper endpoints.
 */
type AuthOptions = {
    clientId: string;
    authority: Authority;
    clientCapabilities?: Array<string>;
};
/**
 * Use this to configure token renewal info in the Configuration object
 *
 * - tokenRenewalOffsetSeconds    - Sets the window of offset needed to renew the token before expiry
 */
type SystemOptions = {
    tokenRenewalOffsetSeconds?: number;
};
/**
 *  Use this to configure the logging that MSAL does, by configuring logger options in the Configuration object
 *
 * - loggerCallback                - Callback for logger
 * - piiLoggingEnabled             - Sets whether pii logging is enabled
 * - logLevel                      - Sets the level at which logging happens
 */
type LoggerOptions = {
    loggerCallback?: ILoggerCallback;
    piiLoggingEnabled?: boolean;
    logLevel?: LogLevel;
};
/**
 * Library-specific options
 */
type LibraryInfo = {
    sku: string;
    version: string;
    cpu: string;
    os: string;
};
/**
 * Credentials for confidential clients
 */
type ClientCredentials = {
    clientSecret?: string;
    clientAssertion?: {
        assertion: string;
        assertionType: string;
    };
};
/**
 * Key-Value type to support queryParams, extraQueryParams and claims
 */
type StringDict = {
    [key: string]: string;
};
/**
 * Request object passed by user to retrieve a Code from the server (first leg of authorization code grant flow)
 *
 * - scopes                     - Array of scopes the application is requesting access to.
 * - claims                     - A stringified claims request which will be added to all /authorize and /token calls
 * - authority                  - Url of the authority which the application acquires tokens from.
 * - correlationId              - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - redirectUri                - The redirect URI where authentication responses can be received by your application. It must exactly match one of the redirect URIs registered in the Azure portal.
 * - extraScopesToConsent       - Scopes for a different resource when the user needs consent upfront.
 * - responseMode               - Specifies the method that should be used to send the authentication result to your app. Can be query, form_post, or fragment. If no value is passed in, it defaults to query.
 * - codeChallenge              - Used to secure authorization code grant via Proof of Key for Code Exchange (PKCE). For more information, see the PKCE RCF:https://tools.ietf.org/html/rfc7636
 * - codeChallengeMethod        - The method used to encode the code verifier for the code challenge parameter. Can be "plain" or "S256". If excluded, code challenge is assumed to be plaintext. For more information, see the PKCE RCF: https://tools.ietf.org/html/rfc7636
 * - state                      - A value included in the request that is also returned in the token response. A randomly generated unique value is typically used for preventing cross site request forgery attacks. The state is also used to encode information about the user's state in the app before the authentication request occurred.
 * - prompt                     - Indicates the type of user interaction that is required.
 *          login: will force the user to enter their credentials on that request, negating single-sign on
 *          none:  will ensure that the user isn't presented with any interactive prompt. if request can't be completed via single-sign on, the endpoint will return an interaction_required error
 *          consent: will the trigger the OAuth consent dialog after the user signs in, asking the user to grant permissions to the app
 *          select_account: will interrupt single sign-=on providing account selection experience listing all the accounts in session or any remembered accounts or an option to choose to use a different account
 * - account                    - AccountInfo obtained from a getAccount API. Will be used in certain scenarios to generate login_hint if both loginHint and sid params are not provided.
 * - loginHint                  - Can be used to pre-fill the username/email address field of the sign-in page for the user, if you know the username/email address ahead of time. Often apps use this parameter during re-authentication, having already extracted the username from a previous sign-in using the preferred_username claim.
 * - sid                        - Session ID, unique identifier for the session. Available as an optional claim on ID tokens.
 * - domainHint                 - Provides a hint about the tenant or domain that the user should use to sign in. The value of the domain hint is a registered domain for the tenant.
 * - extraQueryParameters       - String to string map of custom query parameters added to the /authorize call
 * - tokenQueryParameters       - String to string map of custom query parameters added to the /token call
 * - nonce                      - A value included in the request that is returned in the id token. A randomly generated unique value is typically used to mitigate replay attacks.
 * - resourceRequestMethod      - HTTP Request type used to request data from the resource (i.e. "GET", "POST", etc.).  Used for proof-of-possession flows.
 * - resourceRequestUri         - URI that token will be used for. Used for proof-of-possession flows.
 */
type CommonAuthorizationUrlRequest = BaseAuthRequest & {
    redirectUri: string;
    responseMode: ResponseMode;
    account?: AccountInfo;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    domainHint?: string;
    extraQueryParameters?: StringDict;
    tokenQueryParameters?: StringDict;
    extraScopesToConsent?: Array<string>;
    loginHint?: string;
    nonce?: string;
    prompt?: string;
    sid?: string;
    state?: string;
};
/**
 * Request object passed by user to acquire a token from the server exchanging a valid authorization code (second leg of OAuth2.0 Authorization Code flow)
 *
 * - scopes                  - Array of scopes the application is requesting access to.
 * - claims                  - A stringified claims request which will be added to all /authorize and /token calls
 * - authority:              - URL of the authority, the security token service (STS) from which MSAL will acquire tokens. If authority is set on client application object, this will override that value. Overriding the value will cause for authority validation to happen each time. If the same authority will be used for all request, set on the application object instead of the requests.
 * - correlationId           - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - redirectUri             - The redirect URI of your app, where the authority will redirect to after the user inputs credentials and consents. It must exactly match one of the redirect URIs you registered in the portal
 * - code                    - The authorization_code that the user acquired in the first leg of the flow.
 * - codeVerifier            - The same code_verifier that was used to obtain the authorization_code. Required if PKCE was used in the authorization code grant request.For more information, see the PKCE RFC: https://tools.ietf.org/html/rfc7636
 * - resourceRequestMethod      - HTTP Request type used to request data from the resource (i.e. "GET", "POST", etc.).  Used for proof-of-possession flows.
 * - resourceRequestUri         - URI that token will be used for. Used for proof-of-possession flows.
 */
type CommonAuthorizationCodeRequest = BaseAuthRequest & {
    code: string;
    redirectUri: string;
    codeVerifier?: string;
    tokenQueryParameters?: StringDict;
};
/**
 * Result returned from the authority's token endpoint.
 * - uniqueId               - `oid` or `sub` claim from ID token
 * - tenantId               - `tid` claim from ID token
 * - scopes                 - Scopes that are validated for the respective token
 * - account                - An account object representation of the currently signed-in user
 * - idToken                - Id token received as part of the response
 * - idTokenClaims          - MSAL-relevant ID token claims
 * - accessToken            - Access token received as part of the response
 * - fromCache              - Boolean denoting whether token came from cache
 * - expiresOn              - Javascript Date object representing relative expiration of access token
 * - extExpiresOn           - Javascript Date object representing extended relative expiration of access token in case of server outage
 * - state                  - Value passed in by user in request
 * - familyId               - Family ID identifier, usually only used for refresh tokens
 */
type AuthenticationResult = {
    authority: string;
    uniqueId: string;
    tenantId: string;
    scopes: Array<string>;
    account: AccountInfo | null;
    idToken: string;
    idTokenClaims: object;
    accessToken: string;
    fromCache: boolean;
    expiresOn: Date | null;
    tokenType: string;
    extExpiresOn?: Date;
    state?: string;
    familyId?: string;
    cloudGraphHostName?: string;
    msGraphHost?: string;
};
/**
 * DeviceCode returned by the security token service device code endpoint containing information necessary for device code flow.
 * - userCode: code which user needs to provide when authenticating at the verification URI
 * - deviceCode: code which should be included in the request for the access token
 * - verificationUri: URI where user can authenticate
 * - expiresIn: expiration time of the device code in seconds
 * - interval: interval at which the STS should be polled at
 * - message: message which should be displayed to the user
 */
type DeviceCodeResponse = {
    userCode: string;
    deviceCode: string;
    verificationUri: string;
    expiresIn: number;
    interval: number;
    message: string;
};
/**
 * Parameters for Oauth2 device code flow.
 * - scopes                     - Array of scopes the application is requesting access to.
 * - authority:                 - URL of the authority, the security token service (STS) from which MSAL will acquire tokens. If authority is set on client application object, this will override that value. Overriding the value will cause for authority validation to happen each time. If the same authority will be used for all request, set on the application object instead of the requests.
 * - correlationId              - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - deviceCodeCallback         - Callback containing device code response. Message should be shown to end user. End user can then navigate to the verification_uri, input the user_code, and input credentials.
 * - cancel                     - Boolean to cancel polling of device code endpoint. While the user authenticates on a separate device, MSAL polls the the token endpoint of security token service for the interval specified in the device code response (usually 15 minutes). To stop polling and cancel the request, set cancel=true.
 * - resourceRequestMethod      - HTTP Request type used to request data from the resource (i.e. "GET", "POST", etc.).  Used for proof-of-possession flows.
 * - resourceRequestUri         - URI that token will be used for. Used for proof-of-possession flows.
 * - timeout                    - Timeout period in seconds which the user explicitly configures for the polling of the device code endpoint. At the end of this period; assuming the device code has not expired yet; the device code polling is stopped and the request cancelled. The device code expiration window will always take precedence over this set period.
 */
type CommonDeviceCodeRequest = BaseAuthRequest & {
    deviceCodeCallback: (response: DeviceCodeResponse) => void;
    cancel?: boolean;
    timeout?: number;
};
/**
 * CommonRefreshTokenRequest
 * - scopes                  - Array of scopes the application is requesting access to.
 * - claims                  - A stringified claims request which will be added to all /authorize and /token calls
 * - authority               - URL of the authority, the security token service (STS) from which MSAL will acquire tokens.
 * - correlationId           - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - refreshToken            - A refresh token returned from a previous request to the Identity provider.
 * - resourceRequestMethod      - HTTP Request type used to request data from the resource (i.e. "GET", "POST", etc.).  Used for proof-of-possession flows.
 * - resourceRequestUri         - URI that token will be used for. Used for proof-of-possession flows.
 */
type CommonRefreshTokenRequest = BaseAuthRequest & {
    refreshToken: string;
    tokenQueryParameters?: StringDict;
};
/**
 * SilentFlow parameters passed by the user to retrieve credentials silently
 * - scopes                 - Array of scopes the application is requesting access to.
 * - claims                 - A stringified claims request which will be added to all /authorize and /token calls. When included on a silent request, cache lookup will be skipped and token will be refreshed.
 * - authority              - Url of the authority which the application acquires tokens from.
 * - correlationId          - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - account                - Account entity to lookup the credentials.
 * - forceRefresh           - Forces silent requests to make network calls if true.
 * - resourceRequestMethod      - HTTP Request type used to request data from the resource (i.e. "GET", "POST", etc.).  Used for proof-of-possession flows.
 * - resourceRequestUri         - URI that token will be used for. Used for proof-of-possession flows.
 */
type CommonSilentFlowRequest = BaseAuthRequest & {
    account: AccountInfo;
    forceRefresh: boolean;
    tokenQueryParameters?: StringDict;
};
/**
 * CommonClientCredentialRequest
 * - scopes                             - Array of scopes the application is requesting access to.
 * - authority                          - URL of the authority, the security token service (STS) from which MSAL will acquire tokens.
 * - correlationId                      - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - skipCache                          - Skip token cache lookup and force request to authority to get a a new token. Defaults to false.
 * - preferredAzureRegionOptions        - Options of the user's preferred azure region
 */
type CommonClientCredentialRequest = BaseAuthRequest & {
    skipCache?: boolean;
    azureRegion?: AzureRegion;
};
/**
 * - scopes                  - Array of scopes the application is requesting access to.
 * - authority               - URL of the authority, the security token service (STS) from which MSAL will acquire tokens.
 * - correlationId           - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - oboAssertion            - The access token that was sent to the middle-tier API. This token must have an audience of the app making this OBO request.
 * - skipCache               - Skip token cache lookup and force request to authority to get a a new token. Defaults to false.
 */
type CommonOnBehalfOfRequest = BaseAuthRequest & {
    oboAssertion: string;
    skipCache?: boolean;
};
/**
 * CommonUsernamePassword parameters passed by the user to retrieve credentials
 * Note: The latest OAuth 2.0 Security Best Current Practice disallows the password grant entirely. This flow is added for internal testing.
 *
 * - scopes                 - Array of scopes the application is requesting access to.
 * - claims                 - A stringified claims request which will be added to all /authorize and /token calls. When included on a silent request, cache lookup will be skipped and token will be refreshed.
 * - authority              - Url of the authority which the application acquires tokens from.
 * - correlationId          - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - username               - username of the client
 * - password               - credentials
 */
type CommonUsernamePasswordRequest = BaseAuthRequest & {
    username: string;
    password: string;
};
/**
 * Error thrown when there is an error with the server code, for example, unavailability.
 */
declare class ServerError extends AuthError {
    constructor(errorCode?: string, errorMessage?: string, subError?: string);
}
/**
 * Error thrown when user interaction is required at the auth server.
 */
declare class InteractionRequiredAuthError extends ServerError {
    constructor(errorCode?: string, errorMessage?: string, subError?: string);
    static isInteractionRequiredError(errorCode?: string, errorString?: string, subError?: string): boolean;
}
/**
 * ClientAuthErrorMessage class containing string constants used by error codes and messages.
 */
declare const ClientAuthErrorMessage: {
    clientInfoDecodingError: {
        code: string;
        desc: string;
    };
    clientInfoEmptyError: {
        code: string;
        desc: string;
    };
    tokenParsingError: {
        code: string;
        desc: string;
    };
    nullOrEmptyToken: {
        code: string;
        desc: string;
    };
    endpointResolutionError: {
        code: string;
        desc: string;
    };
    networkError: {
        code: string;
        desc: string;
    };
    unableToGetOpenidConfigError: {
        code: string;
        desc: string;
    };
    hashNotDeserialized: {
        code: string;
        desc: string;
    };
    blankGuidGenerated: {
        code: string;
        desc: string;
    };
    invalidStateError: {
        code: string;
        desc: string;
    };
    stateMismatchError: {
        code: string;
        desc: string;
    };
    stateNotFoundError: {
        code: string;
        desc: string;
    };
    nonceMismatchError: {
        code: string;
        desc: string;
    };
    nonceNotFoundError: {
        code: string;
        desc: string;
    };
    noTokensFoundError: {
        code: string;
        desc: string;
    };
    multipleMatchingTokens: {
        code: string;
        desc: string;
    };
    multipleMatchingAccounts: {
        code: string;
        desc: string;
    };
    multipleMatchingAppMetadata: {
        code: string;
        desc: string;
    };
    tokenRequestCannotBeMade: {
        code: string;
        desc: string;
    };
    appendEmptyScopeError: {
        code: string;
        desc: string;
    };
    removeEmptyScopeError: {
        code: string;
        desc: string;
    };
    appendScopeSetError: {
        code: string;
        desc: string;
    };
    emptyInputScopeSetError: {
        code: string;
        desc: string;
    };
    DeviceCodePollingCancelled: {
        code: string;
        desc: string;
    };
    DeviceCodeExpired: {
        code: string;
        desc: string;
    };
    NoAccountInSilentRequest: {
        code: string;
        desc: string;
    };
    invalidCacheRecord: {
        code: string;
        desc: string;
    };
    invalidCacheEnvironment: {
        code: string;
        desc: string;
    };
    noAccountFound: {
        code: string;
        desc: string;
    };
    CachePluginError: {
        code: string;
        desc: string;
    };
    noCryptoObj: {
        code: string;
        desc: string;
    };
    invalidCacheType: {
        code: string;
        desc: string;
    };
    unexpectedAccountType: {
        code: string;
        desc: string;
    };
    unexpectedCredentialType: {
        code: string;
        desc: string;
    };
    invalidAssertion: {
        code: string;
        desc: string;
    };
    invalidClientCredential: {
        code: string;
        desc: string;
    };
    tokenRefreshRequired: {
        code: string;
        desc: string;
    };
    userTimeoutReached: {
        code: string;
        desc: string;
    };
    tokenClaimsRequired: {
        code: string;
        desc: string;
    };
    noAuthorizationCodeFromServer: {
        code: string;
        desc: string;
    };
    noAzureRegionDetected: {
        code: string;
        desc: string;
    };
    accessTokenEntityNullError: {
        code: string;
        desc: string;
    };
};
/**
 * Error thrown when there is an error in the client code running on the browser.
 */
declare class ClientAuthError extends AuthError {
    constructor(errorCode: string, errorMessage?: string);
    /**
     * Creates an error thrown when client info object doesn't decode correctly.
     * @param caughtError
     */
    static createClientInfoDecodingError(caughtError: string): ClientAuthError;
    /**
     * Creates an error thrown if the client info is empty.
     * @param rawClientInfo
     */
    static createClientInfoEmptyError(): ClientAuthError;
    /**
     * Creates an error thrown when the id token extraction errors out.
     * @param err
     */
    static createTokenParsingError(caughtExtractionError: string): ClientAuthError;
    /**
     * Creates an error thrown when the id token string is null or empty.
     * @param invalidRawTokenString
     */
    static createTokenNullOrEmptyError(invalidRawTokenString: string): ClientAuthError;
    /**
     * Creates an error thrown when the endpoint discovery doesn't complete correctly.
     */
    static createEndpointDiscoveryIncompleteError(errDetail: string): ClientAuthError;
    /**
     * Creates an error thrown when the fetch client throws
     */
    static createNetworkError(endpoint: string, errDetail: string): ClientAuthError;
    /**
     * Creates an error thrown when the openid-configuration endpoint cannot be reached or does not contain the required data
     */
    static createUnableToGetOpenidConfigError(errDetail: string): ClientAuthError;
    /**
     * Creates an error thrown when the hash cannot be deserialized.
     * @param hashParamObj
     */
    static createHashNotDeserializedError(hashParamObj: string): ClientAuthError;
    /**
     * Creates an error thrown when the state cannot be parsed.
     * @param invalidState
     */
    static createInvalidStateError(invalidState: string, errorString?: string): ClientAuthError;
    /**
     * Creates an error thrown when two states do not match.
     */
    static createStateMismatchError(): ClientAuthError;
    /**
     * Creates an error thrown when the state is not present
     * @param missingState
     */
    static createStateNotFoundError(missingState: string): ClientAuthError;
    /**
     * Creates an error thrown when the nonce does not match.
     */
    static createNonceMismatchError(): ClientAuthError;
    /**
     * Creates an error thrown when the mnonce is not present
     * @param missingNonce
     */
    static createNonceNotFoundError(missingNonce: string): ClientAuthError;
    /**
     * Creates an error thrown when the authorization code required for a token request is null or empty.
     */
    static createNoTokensFoundError(): ClientAuthError;
    /**
     * Throws error when multiple tokens are in cache.
     */
    static createMultipleMatchingTokensInCacheError(): ClientAuthError;
    /**
     * Throws error when multiple accounts are in cache for the given params
     */
    static createMultipleMatchingAccountsInCacheError(): ClientAuthError;
    /**
     * Throws error when multiple appMetada are in cache for the given clientId.
     */
    static createMultipleMatchingAppMetadataInCacheError(): ClientAuthError;
    /**
     * Throws error when no auth code or refresh token is given to ServerTokenRequestParameters.
     */
    static createTokenRequestCannotBeMadeError(): ClientAuthError;
    /**
     * Throws error when attempting to append a null, undefined or empty scope to a set
     * @param givenScope
     */
    static createAppendEmptyScopeToSetError(givenScope: string): ClientAuthError;
    /**
     * Throws error when attempting to append a null, undefined or empty scope to a set
     * @param givenScope
     */
    static createRemoveEmptyScopeFromSetError(givenScope: string): ClientAuthError;
    /**
     * Throws error when attempting to append null or empty ScopeSet.
     * @param appendError
     */
    static createAppendScopeSetError(appendError: string): ClientAuthError;
    /**
     * Throws error if ScopeSet is null or undefined.
     * @param givenScopeSet
     */
    static createEmptyInputScopeSetError(givenScopeSet: ScopeSet): ClientAuthError;
    /**
     * Throws error if user sets CancellationToken.cancel = true during polling of token endpoint during device code flow
     */
    static createDeviceCodeCancelledError(): ClientAuthError;
    /**
     * Throws error if device code is expired
     */
    static createDeviceCodeExpiredError(): ClientAuthError;
    /**
     * Throws error when silent requests are made without an account object
     */
    static createNoAccountInSilentRequestError(): ClientAuthError;
    /**
     * Throws error when cache record is null or undefined.
     */
    static createNullOrUndefinedCacheRecord(): ClientAuthError;
    /**
     * Throws error when provided environment is not part of the CloudDiscoveryMetadata object
     */
    static createInvalidCacheEnvironmentError(): ClientAuthError;
    /**
     * Throws error when account is not found in cache.
     */
    static createNoAccountFoundError(): ClientAuthError;
    /**
     * Throws error if ICachePlugin not set on CacheManager.
     */
    static createCachePluginError(): ClientAuthError;
    /**
     * Throws error if crypto object not found.
     * @param operationName
     */
    static createNoCryptoObjectError(operationName: string): ClientAuthError;
    /**
     * Throws error if cache type is invalid.
     */
    static createInvalidCacheTypeError(): ClientAuthError;
    /**
     * Throws error if unexpected account type.
     */
    static createUnexpectedAccountTypeError(): ClientAuthError;
    /**
     * Throws error if unexpected credential type.
     */
    static createUnexpectedCredentialTypeError(): ClientAuthError;
    /**
     * Throws error if client assertion is not valid.
     */
    static createInvalidAssertionError(): ClientAuthError;
    /**
     * Throws error if client assertion is not valid.
     */
    static createInvalidCredentialError(): ClientAuthError;
    /**
     * Throws error if token cannot be retrieved from cache due to refresh being required.
     */
    static createRefreshRequiredError(): ClientAuthError;
    /**
     * Throws error if the user defined timeout is reached.
     */
    static createUserTimeoutReachedError(): ClientAuthError;
    /*
    * Throws error if token claims are not populated for a signed jwt generation
    */
    static createTokenClaimsRequiredError(): ClientAuthError;
    /**
     * Throws error when the authorization code is missing from the server response
     */
    static createNoAuthCodeInServerResponseError(): ClientAuthError;
}
/**
 * ClientConfigurationErrorMessage class containing string constants used by error codes and messages.
 */
declare const ClientConfigurationErrorMessage: {
    redirectUriNotSet: {
        code: string;
        desc: string;
    };
    postLogoutUriNotSet: {
        code: string;
        desc: string;
    };
    claimsRequestParsingError: {
        code: string;
        desc: string;
    };
    authorityUriInsecure: {
        code: string;
        desc: string;
    };
    urlParseError: {
        code: string;
        desc: string;
    };
    urlEmptyError: {
        code: string;
        desc: string;
    };
    emptyScopesError: {
        code: string;
        desc: string;
    };
    nonArrayScopesError: {
        code: string;
        desc: string;
    };
    clientIdSingleScopeError: {
        code: string;
        desc: string;
    };
    invalidPrompt: {
        code: string;
        desc: string;
    };
    invalidClaimsRequest: {
        code: string;
        desc: string;
    };
    tokenRequestEmptyError: {
        code: string;
        desc: string;
    };
    logoutRequestEmptyError: {
        code: string;
        desc: string;
    };
    invalidCodeChallengeMethod: {
        code: string;
        desc: string;
    };
    invalidCodeChallengeParams: {
        code: string;
        desc: string;
    };
    invalidCloudDiscoveryMetadata: {
        code: string;
        desc: string;
    };
    invalidAuthorityMetadata: {
        code: string;
        desc: string;
    };
    untrustedAuthority: {
        code: string;
        desc: string;
    };
};
/**
 * Error thrown when there is an error in configuration of the MSAL.js library.
 */
declare class ClientConfigurationError extends ClientAuthError {
    constructor(errorCode: string, errorMessage?: string);
    /**
     * Creates an error thrown when the redirect uri is empty (not set by caller)
     */
    static createRedirectUriEmptyError(): ClientConfigurationError;
    /**
     * Creates an error thrown when the post-logout redirect uri is empty (not set by caller)
     */
    static createPostLogoutRedirectUriEmptyError(): ClientConfigurationError;
    /**
     * Creates an error thrown when the claims request could not be successfully parsed
     */
    static createClaimsRequestParsingError(claimsRequestParseError: string): ClientConfigurationError;
    /**
     * Creates an error thrown if authority uri is given an insecure protocol.
     * @param urlString
     */
    static createInsecureAuthorityUriError(urlString: string): ClientConfigurationError;
    /**
     * Creates an error thrown if URL string does not parse into separate segments.
     * @param urlString
     */
    static createUrlParseError(urlParseError: string): ClientConfigurationError;
    /**
     * Creates an error thrown if URL string is empty or null.
     * @param urlString
     */
    static createUrlEmptyError(): ClientConfigurationError;
    /**
     * Error thrown when scopes are not an array
     * @param inputScopes
     */
    static createScopesNonArrayError(inputScopes: Array<string>): ClientConfigurationError;
    /**
     * Error thrown when scopes are empty.
     * @param scopesValue
     */
    static createEmptyScopesArrayError(inputScopes: Array<string>): ClientConfigurationError;
    /**
     * Error thrown when client id scope is not provided as single scope.
     * @param inputScopes
     */
    static createClientIdSingleScopeError(inputScopes: Array<string>): ClientConfigurationError;
    /**
     * Error thrown when prompt is not an allowed type.
     * @param promptValue
     */
    static createInvalidPromptError(promptValue: string): ClientConfigurationError;
    /**
     * Creates error thrown when claims parameter is not a stringified JSON object
     */
    static createInvalidClaimsRequestError(): ClientConfigurationError;
    /**
     * Throws error when token request is empty and nothing cached in storage.
     */
    static createEmptyLogoutRequestError(): ClientConfigurationError;
    /**
     * Throws error when token request is empty and nothing cached in storage.
     */
    static createEmptyTokenRequestError(): ClientConfigurationError;
    /**
     * Throws error when an invalid code_challenge_method is passed by the user
     */
    static createInvalidCodeChallengeMethodError(): ClientConfigurationError;
    /**
     * Throws error when both params: code_challenge and code_challenge_method are not passed together
     */
    static createInvalidCodeChallengeParamsError(): ClientConfigurationError;
    /**
     * Throws an error when the user passes invalid cloudDiscoveryMetadata
     */
    static createInvalidCloudDiscoveryMetadataError(): ClientConfigurationError;
    /**
     * Throws an error when the user passes invalid cloudDiscoveryMetadata
     */
    static createInvalidAuthorityMetadataError(): ClientConfigurationError;
    /**
     * Throws error when provided authority is not a member of the trusted host list
     */
    static createUntrustedAuthorityError(): ClientConfigurationError;
}
/**
 * Request object passed by user to acquire a token from the server exchanging a valid authorization code (second leg of OAuth2.0 Authorization Code flow)
 *
 * - scopes                  - Array of scopes the application is requesting access to.
 * - claims                  - A stringified claims request which will be added to all /authorize and /token calls
 * - authority:              - URL of the authority, the security token service (STS) from which MSAL will acquire tokens. If authority is set on client application object, this will override that value. Overriding the value will cause for authority validation to happen each time. If the same authority will be used for all request, set on the application object instead of the requests.
 * - correlationId           - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - redirectUri             - The redirect URI of your app, where the authority will redirect to after the user inputs credentials and consents. It must exactly match one of the redirect URIs you registered in the portal.
 * - tokenQueryParameters       - String to string map of custom query parameters added to the /token call
 * - code                    - The authorization_code that the user acquired in the first leg of the flow.
 * - codeVerifier            - The same code_verifier that was used to obtain the authorization_code. Required if PKCE was used in the authorization code grant request.For more information, see the PKCE RFC: https://tools.ietf.org/html/rfc7636
 * @public
 */
type AuthorizationCodeRequest = Partial<Omit<CommonAuthorizationCodeRequest, "scopes" | "redirectUri" | "code" | "authenticationScheme" | "resourceRequestMethod" | "resourceRequestUri">> & {
    scopes: Array<string>;
    redirectUri: string;
    code: string;
};
/**
 * Request object passed by user to retrieve a Code from the server (first leg of authorization code grant flow)
 *
 * - scopes                     - Array of scopes the application is requesting access to.
 * - claims                     - A stringified claims request which will be added to all /authorize and /token calls
 * - authority                  - Url of the authority which the application acquires tokens from.
 * - correlationId              - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - redirectUri                - The redirect URI where authentication responses can be received by your application. It must exactly match one of the redirect URIs registered in the Azure portal.
 * - extraScopesToConsent       - Scopes for a different resource when the user needs consent upfront.
 * - responseMode               - Specifies the method that should be used to send the authentication result to your app. Can be query, form_post, or fragment. If no value is passed in, it defaults to query.
 * - codeChallenge              - Used to secure authorization code grant via Proof of Key for Code Exchange (PKCE). For more information, see the PKCE RCF:https://tools.ietf.org/html/rfc7636
 * - codeChallengeMethod        - The method used to encode the code verifier for the code challenge parameter. Can be "plain" or "S256". If excluded, code challenge is assumed to be plaintext. For more information, see the PKCE RCF: https://tools.ietf.org/html/rfc7636
 * - state                      - A value included in the request that is also returned in the token response. A randomly generated unique value is typically used for preventing cross site request forgery attacks. The state is also used to encode information about the user's state in the app before the authentication request occurred.
 * - prompt                     - Indicates the type of user interaction that is required.
 *          login: will force the user to enter their credentials on that request, negating single-sign on
 *          none:  will ensure that the user isn't presented with any interactive prompt. if request can't be completed via single-sign on, the endpoint will return an interaction_required error
 *          consent: will the trigger the OAuth consent dialog after the user signs in, asking the user to grant permissions to the app
 *          select_account: will interrupt single sign-=on providing account selection experience listing all the accounts in session or any remembered accounts or an option to choose to use a different account
 * - account                    - AccountInfo obtained from a getAccount API. Will be used in certain scenarios to generate login_hint if both loginHint and sid params are not provided.
 * - loginHint                  - Can be used to pre-fill the username/email address field of the sign-in page for the user, if you know the username/email address ahead of time. Often apps use this parameter during re-authentication, having already extracted the username from a previous sign-in using the preferred_username claim.
 * - sid                        - Session ID, unique identifier for the session. Available as an optional claim on ID tokens.
 * - domainHint                 - Provides a hint about the tenant or domain that the user should use to sign in. The value of the domain hint is a registered domain for the tenant.
 * - extraQueryParameters       - String to string map of custom query parameters added to the /authorize call
 * - tokenQueryParameters       - String to string map of custom query parameters added to the /token call
 * - nonce                      - A value included in the request that is returned in the id token. A randomly generated unique value is typically used to mitigate replay attacks.
 * @public
 */
type AuthorizationUrlRequest = Partial<Omit<CommonAuthorizationUrlRequest, "scopes" | "redirectUri" | "resourceRequestMethod" | "resourceRequestUri" | "authenticationScheme">> & {
    scopes: Array<string>;
    redirectUri: string;
};
/**
 * Parameters for Oauth2 device code flow.
 * - scopes                     - Array of scopes the application is requesting access to.
 * - authority:                 - URL of the authority, the security token service (STS) from which MSAL will acquire tokens. If authority is set on client application object, this will override that value. Overriding the value will cause for authority validation to happen each time. If the same authority will be used for all request, set on the application object instead of the requests.
 * - correlationId              - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - deviceCodeCallback         - Callback containing device code response. Message should be shown to end user. End user can then navigate to the verification_uri, input the user_code, and input credentials.
 * - cancel                     - Boolean to cancel polling of device code endpoint. While the user authenticates on a separate device, MSAL polls the the token endpoint of security token service for the interval specified in the device code response (usually 15 minutes). To stop polling and cancel the request, set cancel=true.
 * @public
 */
type DeviceCodeRequest = Partial<Omit<CommonDeviceCodeRequest, "scopes" | "deviceCodeCallback" | "resourceRequestMethod" | "resourceRequestUri">> & {
    scopes: Array<string>;
    deviceCodeCallback: (response: DeviceCodeResponse) => void;
};
/**
 * CommonRefreshTokenRequest
 * - scopes                  - Array of scopes the application is requesting access to.
 * - claims                  - A stringified claims request which will be added to all /authorize and /token calls
 * - authority               - URL of the authority, the security token service (STS) from which MSAL will acquire tokens.
 * - correlationId           - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - refreshToken            - A refresh token returned from a previous request to the Identity provider.
 * - tokenQueryParameters       - String to string map of custom query parameters added to the /token call
 * @public
 */
type RefreshTokenRequest = Partial<Omit<CommonRefreshTokenRequest, "scopes" | "refreshToken" | "authenticationScheme" | "resourceRequestMethod" | "resourceRequestUri">> & {
    scopes: Array<string>;
    refreshToken: string;
};
/**
 * SilentFlow parameters passed by the user to retrieve credentials silently
 * - scopes                 - Array of scopes the application is requesting access to.
 * - claims                 - A stringified claims request which will be added to all /authorize and /token calls. When included on a silent request, cache lookup will be skipped and token will be refreshed.
 * - authority              - Url of the authority which the application acquires tokens from.
 * - correlationId          - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - tokenQueryParameters       - String to string map of custom query parameters added to the /token call
 * - account                - Account entity to lookup the credentials.
 * - forceRefresh           - Forces silent requests to make network calls if true.
 * @public
 */
type SilentFlowRequest = Partial<Omit<CommonSilentFlowRequest, "account" | "scopes" | "resourceRequestMethod" | "resourceRequestUri">> & {
    account: AccountInfo;
    scopes: Array<string>;
};
/**
 * UsernamePassword parameters passed by the user to retrieve credentials
 * Note: The latest OAuth 2.0 Security Best Current Practice disallows the password grant entirely. This flow is added for internal testing.
 *
 * - scopes                 - Array of scopes the application is requesting access to.
 * - claims                 - A stringified claims request which will be added to all /authorize and /token calls. When included on a silent request, cache lookup will be skipped and token will be refreshed.
 * - authority              - Url of the authority which the application acquires tokens from.
 * - correlationId          - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - username               - username of the client
 * - password               - credentials
 * @public
 */
type UsernamePasswordRequest = Partial<Omit<CommonUsernamePasswordRequest, "scopes" | "resourceRequestMethod" | "resourceRequestUri" | "username" | "password">> & {
    scopes: Array<string>;
    username: string;
    password: string;
};
/**
 * Key value store for in-memory cache
 * @public
 */
type CacheKVStore = Record<string, ValidCacheType>;
/**
 * Cache format read from the cache blob provided to the configuration during app instantiation
 * @public
 */
type JsonCache = {
    Account: Record<string, SerializedAccountEntity>;
    IdToken: Record<string, SerializedIdTokenEntity>;
    AccessToken: Record<string, SerializedAccessTokenEntity>;
    RefreshToken: Record<string, SerializedRefreshTokenEntity>;
    AppMetadata: Record<string, SerializedAppMetadataEntity>;
};
/**
 * Intermittent type to handle in-memory data objects with defined types
 * @public
 */
type InMemoryCache = {
    accounts: AccountCache;
    idTokens: IdTokenCache;
    accessTokens: AccessTokenCache;
    refreshTokens: RefreshTokenCache;
    appMetadata: AppMetadataCache;
};
/**
 * Account type
 * @public
 */
type SerializedAccountEntity = {
    home_account_id: string;
    environment: string;
    realm: string;
    local_account_id: string;
    username: string;
    authority_type: string;
    name?: string;
    client_info?: string;
    last_modification_time?: string;
    last_modification_app?: string;
};
/**
 * Idtoken credential type
 * @public
 */
type SerializedIdTokenEntity = {
    home_account_id: string;
    environment: string;
    credential_type: string;
    client_id: string;
    secret: string;
    realm: string;
};
/**
 * Access token credential type
 * @public
 */
type SerializedAccessTokenEntity = {
    home_account_id: string;
    environment: string;
    credential_type: string;
    client_id: string;
    secret: string;
    realm: string;
    target: string;
    cached_at: string;
    expires_on: string;
    extended_expires_on?: string;
    refresh_on?: string;
    key_id?: string;
    token_type?: string;
};
/**
 * Refresh token credential type
 * @public
 */
type SerializedRefreshTokenEntity = {
    home_account_id: string;
    environment: string;
    credential_type: string;
    client_id: string;
    secret: string;
    family_id?: string;
    target?: string;
    realm?: string;
};
/**
 * AppMetadata type
 * @public
 */
type SerializedAppMetadataEntity = {
    client_id: string;
    environment: string;
    family_id?: string;
};
/**
 * This class implements Storage for node, reading cache from user specified storage location or an  extension library
 * @public
 */
declare class NodeStorage extends CacheManager {
    // Cache configuration, either set by user or default values.
    private logger;
    private cache;
    private changeEmitters;
    constructor(logger: Logger, clientId: string, cryptoImpl: ICrypto);
    /**
     * Queue up callbacks
     * @param func - a callback function for cache change indication
     */
    registerChangeEmitter(func: () => void): void;
    /**
     * Invoke the callback when cache changes
     */
    emitChange(): void;
    /**
     * Converts cacheKVStore to InMemoryCache
     * @param cache - key value store
     */
    cacheToInMemoryCache(cache: CacheKVStore): InMemoryCache;
    /**
     * converts inMemoryCache to CacheKVStore
     * @param inMemoryCache - kvstore map for inmemory
     */
    inMemoryCacheToCache(inMemoryCache: InMemoryCache): CacheKVStore;
    /**
     * gets the current in memory cache for the client
     */
    getInMemoryCache(): InMemoryCache;
    /**
     * sets the current in memory cache for the client
     * @param inMemoryCache - key value map in memory
     */
    setInMemoryCache(inMemoryCache: InMemoryCache): void;
    /**
     * get the current cache key-value store
     */
    getCache(): CacheKVStore;
    /**
     * sets the current cache (key value store)
     * @param cacheMap - key value map
     */
    setCache(cache: CacheKVStore): void;
    /**
     * Gets cache item with given key.
     * @param key - lookup key for the cache entry
     */
    getItem(key: string): ValidCacheType;
    /**
     * Gets cache item with given key-value
     * @param key - lookup key for the cache entry
     * @param value - value of the cache entry
     */
    setItem(key: string, value: ValidCacheType): void;
    /**
     * fetch the account entity
     * @param accountKey - lookup key to fetch cache type AccountEntity
     */
    getAccount(accountKey: string): AccountEntity | null;
    /**
     * set account entity
     * @param account - cache value to be set of type AccountEntity
     */
    setAccount(account: AccountEntity): void;
    /**
     * fetch the idToken credential
     * @param idTokenKey - lookup key to fetch cache type IdTokenEntity
     */
    getIdTokenCredential(idTokenKey: string): IdTokenEntity | null;
    /**
     * set idToken credential
     * @param idToken - cache value to be set of type IdTokenEntity
     */
    setIdTokenCredential(idToken: IdTokenEntity): void;
    /**
     * fetch the accessToken credential
     * @param accessTokenKey - lookup key to fetch cache type AccessTokenEntity
     */
    getAccessTokenCredential(accessTokenKey: string): AccessTokenEntity | null;
    /**
     * set accessToken credential
     * @param accessToken -  cache value to be set of type AccessTokenEntity
     */
    setAccessTokenCredential(accessToken: AccessTokenEntity): void;
    /**
     * fetch the refreshToken credential
     * @param refreshTokenKey - lookup key to fetch cache type RefreshTokenEntity
     */
    getRefreshTokenCredential(refreshTokenKey: string): RefreshTokenEntity | null;
    /**
     * set refreshToken credential
     * @param refreshToken - cache value to be set of type RefreshTokenEntity
     */
    setRefreshTokenCredential(refreshToken: RefreshTokenEntity): void;
    /**
     * fetch appMetadata entity from the platform cache
     * @param appMetadataKey - lookup key to fetch cache type AppMetadataEntity
     */
    getAppMetadata(appMetadataKey: string): AppMetadataEntity | null;
    /**
     * set appMetadata entity to the platform cache
     * @param appMetadata - cache value to be set of type AppMetadataEntity
     */
    setAppMetadata(appMetadata: AppMetadataEntity): void;
    /**
     * fetch server telemetry entity from the platform cache
     * @param serverTelemetrykey - lookup key to fetch cache type ServerTelemetryEntity
     */
    getServerTelemetry(serverTelemetrykey: string): ServerTelemetryEntity | null;
    /**
     * set server telemetry entity to the platform cache
     * @param serverTelemetryKey - lookup key to fetch cache type ServerTelemetryEntity
     * @param serverTelemetry - cache value to be set of type ServerTelemetryEntity
     */
    setServerTelemetry(serverTelemetryKey: string, serverTelemetry: ServerTelemetryEntity): void;
    /**
     * fetch authority metadata entity from the platform cache
     * @param key - lookup key to fetch cache type AuthorityMetadataEntity
     */
    getAuthorityMetadata(key: string): AuthorityMetadataEntity | null;
    /**
     * Get all authority metadata keys
     */
    getAuthorityMetadataKeys(): Array<string>;
    /**
     * set authority metadata entity to the platform cache
     * @param key - lookup key to fetch cache type AuthorityMetadataEntity
     * @param metadata - cache value to be set of type AuthorityMetadataEntity
     */
    setAuthorityMetadata(key: string, metadata: AuthorityMetadataEntity): void;
    /**
     * fetch throttling entity from the platform cache
     * @param throttlingCacheKey - lookup key to fetch cache type ThrottlingEntity
     */
    getThrottlingCache(throttlingCacheKey: string): ThrottlingEntity | null;
    /**
     * set throttling entity to the platform cache
     * @param throttlingCacheKey - lookup key to fetch cache type ThrottlingEntity
     * @param throttlingCache - cache value to be set of type ThrottlingEntity
     */
    setThrottlingCache(throttlingCacheKey: string, throttlingCache: ThrottlingEntity): void;
    /**
     * Removes the cache item from memory with the given key.
     * @param key - lookup key to remove a cache entity
     * @param inMemory - key value map of the cache
     */
    removeItem(key: string): boolean;
    /**
     * Checks whether key is in cache.
     * @param key - look up key for a cache entity
     */
    containsKey(key: string): boolean;
    /**
     * Gets all keys in window.
     */
    getKeys(): string[];
    /**
     * Clears all cache entries created by MSAL (except tokens).
     */
    clear(): void;
    /**
     * Initialize in memory cache from an exisiting cache vault
     * @param cache - blob formatted cache (JSON)
     */
    static generateInMemoryCache(cache: string): InMemoryCache;
    /**
     * retrieves the final JSON
     * @param inMemoryCache - itemised cache read from the JSON
     */
    static generateJsonCache(inMemoryCache: InMemoryCache): JsonCache;
}
/**
 * Token cache interface for the client, giving access to cache APIs
 * @public
 */
interface ITokenCache {
    /** API that retrieves all accounts currently in cache to the user */
    getAllAccounts(): Promise<AccountInfo[]>;
    /** Returns the signed in account matching homeAccountId */
    getAccountByHomeId(homeAccountId: string): Promise<AccountInfo | null>;
    /** Returns the signed in account matching localAccountId */
    getAccountByLocalId(localAccountId: string): Promise<AccountInfo | null>;
    /** API to remove a specific account and the relevant data from cache */
    removeAccount(account: AccountInfo): Promise<void>;
}
/**
 * In-memory token cache manager
 * @public
 */
declare class TokenCache implements ISerializableTokenCache, ITokenCache {
    private storage;
    private cacheHasChanged;
    private cacheSnapshot;
    private readonly persistence;
    private logger;
    constructor(storage: NodeStorage, logger: Logger, cachePlugin?: ICachePlugin);
    /**
     * Set to true if cache state has changed since last time serialize or writeToPersistence was called
     */
    hasChanged(): boolean;
    /**
     * Serializes in memory cache to JSON
     */
    serialize(): string;
    /**
     * Deserializes JSON to in-memory cache. JSON should be in MSAL cache schema format
     * @param cache - blob formatted cache
     */
    deserialize(cache: string): void;
    /**
     * Fetches the cache key-value map
     */
    getKVStore(): CacheKVStore;
    /**
     * API that retrieves all accounts currently in cache to the user
     */
    getAllAccounts(): Promise<AccountInfo[]>;
    /**
     * Returns the signed in account matching homeAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param homeAccountId - unique identifier for an account (uid.utid)
     */
    getAccountByHomeId(homeAccountId: string): Promise<AccountInfo | null>;
    /**
     * Returns the signed in account matching localAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param localAccountId - unique identifier of an account (sub/obj when homeAccountId cannot be populated)
     */
    getAccountByLocalId(localAccountId: string): Promise<AccountInfo | null>;
    /**
     * API to remove a specific account and the relevant data from cache
     * @param account - AccountInfo passed by the user
     */
    removeAccount(account: AccountInfo): Promise<void>;
    /**
     * Called when the cache has changed state.
     */
    private handleChangeEvent;
    /**
     * Merge in memory cache with the cache snapshot.
     * @param oldState - cache before changes
     * @param currentState - current cache state in the library
     */
    private mergeState;
    /**
     * Deep update of oldState based on newState values
     * @param oldState - cache before changes
     * @param newState - updated cache
     */
    private mergeUpdates;
    /**
     * Removes entities in oldState that the were removed from newState. If there are any unknown values in root of
     * oldState that are not recognized, they are left untouched.
     * @param oldState - cache before changes
     * @param newState - updated cache
     */
    private mergeRemovals;
    /**
     * Helper to merge new cache with the old one
     * @param oldState - cache before changes
     * @param newState - updated cache
     */
    private mergeRemovalsDict;
    /**
     * Helper to overlay as a part of cache merge
     * @param passedInCache - cache read from the blob
     */
    private overlayDefaults;
}
/**
 * Interface for the PublicClientApplication class defining the public API signatures
 * @public
 */
interface IPublicClientApplication {
    /** Creates the URL of the authorization request */
    getAuthCodeUrl(request: AuthorizationUrlRequest): Promise<string>;
    /** Acquires a token by exchanging the authorization code received from the first step of OAuth 2.0 Authorization Code Flow */
    acquireTokenByCode(request: AuthorizationCodeRequest): Promise<AuthenticationResult | null>;
    /** Acquires a token silently when a user specifies the account the token is requested for */
    acquireTokenSilent(request: SilentFlowRequest): Promise<AuthenticationResult | null>;
    /** Acquires a token by exchanging the refresh token provided for a new set of tokens */
    acquireTokenByRefreshToken(request: RefreshTokenRequest): Promise<AuthenticationResult | null>;
    /** Acquires a token from the authority using OAuth2.0 device code flow */
    acquireTokenByDeviceCode(request: DeviceCodeRequest): Promise<AuthenticationResult | null>;
    /** Acquires tokens with password grant by exchanging client applications username and password for credentials */
    acquireTokenByUsernamePassword(request: UsernamePasswordRequest): Promise<AuthenticationResult | null>;
    /** Gets the token cache for the application */
    getTokenCache(): TokenCache;
    /** Returns the logger instance */
    getLogger(): Logger;
    /** Replaces the default logger set in configurations with new Logger with new configurations */
    setLogger(logger: Logger): void;
}
/**
 * CommonClientCredentialRequest
 * - scopes                  - Array of scopes the application is requesting access to.
 * - authority               - URL of the authority, the security token service (STS) from which MSAL will acquire tokens.
 * - correlationId           - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - skipCache               - Skip token cache lookup and force request to authority to get a a new token. Defaults to false.
 * @public
 */
type ClientCredentialRequest = Partial<Omit<CommonClientCredentialRequest, "scopes" | "resourceRequestMethod" | "resourceRequestUri">> & {
    scopes: Array<string>;
};
/**
 * - scopes                  - Array of scopes the application is requesting access to.
 * - authority               - URL of the authority, the security token service (STS) from which MSAL will acquire tokens.
 * - correlationId           - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - oboAssertion            - The access token that was sent to the middle-tier API. This token must have an audience of the app making this OBO request.
 * - skipCache               - Skip token cache lookup and force request to authority to get a a new token. Defaults to false.
 * @public
 */
type OnBehalfOfRequest = Partial<Omit<CommonOnBehalfOfRequest, "oboAssertion" | "scopes" | "resourceRequestMethod" | "resourceRequestUri">> & {
    oboAssertion: string;
    scopes: Array<string>;
};
/**
 * Interface for the ConfidentialClientApplication class defining the public API signatures
 * @public
 */
interface IConfidentialClientApplication {
    /** Creates the URL of the authorization request */
    getAuthCodeUrl(request: AuthorizationUrlRequest): Promise<string>;
    /**  Acquires a token by exchanging the authorization code received from the first step of OAuth 2.0 Authorization Code Flow */
    acquireTokenByCode(request: AuthorizationCodeRequest): Promise<AuthenticationResult | null>;
    /**  Acquires a token silently when a user specifies the account the token is requested for */
    acquireTokenSilent(request: SilentFlowRequest): Promise<AuthenticationResult | null>;
    /** Acquires a token by exchanging the refresh token provided for a new set of tokens */
    acquireTokenByRefreshToken(request: RefreshTokenRequest): Promise<AuthenticationResult | null>;
    /** Acquires tokens from the authority for the application (not for an end user) */
    acquireTokenByClientCredential(request: ClientCredentialRequest): Promise<AuthenticationResult | null>;
    /** Acquires tokens from the authority for the application */
    acquireTokenOnBehalfOf(request: OnBehalfOfRequest): Promise<AuthenticationResult | null>;
    /** Gets the token cache for the application */
    getTokenCache(): TokenCache;
    /** Returns the logger instance */
    getLogger(): Logger;
    /** Replaces the default logger set in configurations with new Logger with new configurations */
    setLogger(logger: Logger): void;
}
/**
 * - clientId               - Client id of the application.
 * - authority              - Url of the authority. If no value is set, defaults to https://login.microsoftonline.com/common.
 * - knownAuthorities       - Needed for Azure B2C and ADFS. All authorities that will be used in the client application. Only the host of the authority should be passed in.
 * - clientSecret           - Secret string that the application uses when requesting a token. Only used in confidential client applications. Can be created in the Azure app registration portal.
 * - clientAssertion        - Assertion string that the application uses when requesting a token. Only used in confidential client applications. Assertion should be of type urn:ietf:params:oauth:client-assertion-type:jwt-bearer.
 * - clientCertificate      - Certificate that the application uses when requesting a token. Only used in confidential client applications. Requires hex encoded X.509 SHA-1 thumbprint of the certificiate, and the PEM encoded private key (string should contain -----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY----- )
 * - protocolMode           - Enum that represents the protocol that msal follows. Used for configuring proper endpoints.
 * @public
 */
type NodeAuthOptions = {
    clientId: string;
    authority?: string;
    clientSecret?: string;
    clientAssertion?: string;
    clientCertificate?: {
        thumbprint: string;
        privateKey: string;
        x5c?: string;
    };
    knownAuthorities?: Array<string>;
    cloudDiscoveryMetadata?: string;
    authorityMetadata?: string;
    clientCapabilities?: [
    ];
    protocolMode?: ProtocolMode;
};
/**
 * Use this to configure the below cache configuration options:
 *
 * - cachePlugin   - Plugin for reading and writing token cache to disk.
 * @public
 */
type CacheOptions = {
    cachePlugin?: ICachePlugin;
};
/**
 * Type for configuring logger and http client options
 *
 * - logger                       - Used to initialize the Logger object; TODO: Expand on logger details or link to the documentation on logger
 * - networkClient                - Http client used for all http get and post calls. Defaults to using MSAL's default http client.
 * @public
 */
type NodeSystemOptions = {
    loggerOptions?: LoggerOptions;
    networkClient?: INetworkModule;
};
/**
 * Use the configuration object to configure MSAL and initialize the client application object
 *
 * - auth: this is where you configure auth elements like clientID, authority used for authenticating against the Microsoft Identity Platform
 * - cache: this is where you configure cache location
 * - system: this is where you can configure the network client, logger
 * @public
 */
type Configuration = {
    auth: NodeAuthOptions;
    cache?: CacheOptions;
    system?: NodeSystemOptions;
};
/**
 * Sets the default options when not explicitly configured from app developer
 *
 * @param auth - Authentication options
 * @param cache - Cache options
 * @param system - System options
 *
 * @returns Configuration
 * @public
 */
declare function buildAppConfiguration({ auth, cache, system }: Configuration): Configuration;
/**
 * This class implements MSAL node's crypto interface, which allows it to perform base64 encoding and decoding, generating cryptographically random GUIDs and
 * implementing Proof Key for Code Exchange specs for the OAuth Authorization Code Flow using PKCE (rfc here: https://tools.ietf.org/html/rfc7636).
 * @public
 */
declare class CryptoProvider implements ICrypto {
    private pkceGenerator;
    constructor();
    /**
     * Creates a new random GUID - used to populate state and nonce.
     * @returns string (GUID)
     */
    createNewGuid(): string;
    /**
     * Encodes input string to base64.
     * @param input - string to be encoded
     */
    base64Encode(input: string): string;
    /**
     * Decodes input string from base64.
     * @param input - string to be decoded
     */
    base64Decode(input: string): string;
    /**
     * Generates PKCE codes used in Authorization Code Flow.
     */
    generatePkceCodes(): Promise<PkceCodes>;
    /**
     * Generates a keypair, stores it and returns a thumbprint - not yet implemented for node
     */
    getPublicKeyThumbprint(): Promise<string>;
    /**
     * Signs the given object as a jwt payload with private key retrieved by given kid - currently not implemented for node
     */
    signJwt(): Promise<string>;
}
/**
 * Client assertion of type jwt-bearer used in confidential client flows
 * @public
 */
declare class ClientAssertion {
    private jwt;
    private privateKey;
    private thumbprint;
    private expirationTime;
    private issuer;
    private jwtAudience;
    private publicCertificate;
    /**
     * Initialize the ClientAssertion class from the clientAssertion passed by the user
     * @param assertion - refer https://tools.ietf.org/html/rfc7521
     */
    static fromAssertion(assertion: string): ClientAssertion;
    /**
     * Initialize the ClientAssertion class from the certificate passed by the user
     * @param thumbprint - identifier of a certificate
     * @param privateKey - secret key
     * @param publicCertificate - electronic document provided to prove the ownership of the public key
     */
    static fromCertificate(thumbprint: string, privateKey: string, publicCertificate?: string): ClientAssertion;
    /**
     * Update JWT for certificate based clientAssertion, if passed by the user, uses it as is
     * @param cryptoProvider - library's crypto helper
     * @param issuer - iss claim
     * @param jwtAudience - aud claim
     */
    getJwt(cryptoProvider: CryptoProvider, issuer: string, jwtAudience: string): string;
    /**
     * JWT format and required claims specified: https://tools.ietf.org/html/rfc7523#section-3
     */
    private createJwt;
    /**
     * Utility API to check expiration
     */
    private isExpired;
    /**
     * Extracts the raw certs from a given certificate string and returns them in an array.
     * @param publicCertificate - electronic document provided to prove the ownership of the public key
     */
    static parseCertificate(publicCertificate: string): Array<string>;
}
/**
 * Base abstract class for all ClientApplications - public and confidential
 * @public
 */
declare abstract class ClientApplication {
    private readonly cryptoProvider;
    private tokenCache;
    /**
     * Platform storage object
     */
    protected storage: NodeStorage;
    /**
     * Logger object to log the application flow
     */
    protected logger: Logger;
    /**
     * Platform configuration initialized by the application
     */
    protected config: Configuration;
    /**
     * Client assertion passed by the user for confidential client flows
     */
    protected clientAssertion: ClientAssertion;
    /**
     * Client secret passed by the user for confidential client flows
     */
    protected clientSecret: string;
    /**
     * Constructor for the ClientApplication
     */
    protected constructor(configuration: Configuration);
    /**
     * Creates the URL of the authorization request, letting the user input credentials and consent to the
     * application. The URL targets the /authorize endpoint of the authority configured in the
     * application object.
     *
     * Once the user inputs their credentials and consents, the authority will send a response to the redirect URI
     * sent in the request and should contain an authorization code, which can then be used to acquire tokens via
     * `acquireTokenByCode(AuthorizationCodeRequest)`.
     */
    getAuthCodeUrl(request: AuthorizationUrlRequest): Promise<string>;
    /**
     * Acquires a token by exchanging the Authorization Code received from the first step of OAuth2.0
     * Authorization Code flow.
     *
     * `getAuthCodeUrl(AuthorizationCodeUrlRequest)` can be used to create the URL for the first step of OAuth2.0
     * Authorization Code flow. Ensure that values for redirectUri and scopes in AuthorizationCodeUrlRequest and
     * AuthorizationCodeRequest are the same.
     */
    acquireTokenByCode(request: AuthorizationCodeRequest): Promise<AuthenticationResult | null>;
    /**
     * Acquires a token by exchanging the refresh token provided for a new set of tokens.
     *
     * This API is provided only for scenarios where you would like to migrate from ADAL to MSAL. Otherwise, it is
     * recommended that you use `acquireTokenSilent()` for silent scenarios. When using `acquireTokenSilent()`, MSAL will
     * handle the caching and refreshing of tokens automatically.
     */
    acquireTokenByRefreshToken(request: RefreshTokenRequest): Promise<AuthenticationResult | null>;
    /**
     * Acquires a token silently when a user specifies the account the token is requested for.
     *
     * This API expects the user to provide an account object and looks into the cache to retrieve the token if present.
     * There is also an optional "forceRefresh" boolean the user can send to bypass the cache for access_token and id_token.
     * In case the refresh_token is expired or not found, an error is thrown
     * and the guidance is for the user to call any interactive token acquisition API (eg: `acquireTokenByCode()`).
     */
    acquireTokenSilent(request: SilentFlowRequest): Promise<AuthenticationResult | null>;
    /**
     * Gets the token cache for the application.
     */
    getTokenCache(): TokenCache;
    /**
     * Returns the logger instance
     */
    getLogger(): Logger;
    /**
     * Replaces the default logger set in configurations with new Logger with new configurations
     * @param logger - Logger instance
     */
    setLogger(logger: Logger): void;
    /**
     * Builds the common configuration to be passed to the common component based on the platform configurarion
     * @param authority - user passed authority in configuration
     * @param serverTelemetryManager - initializes servertelemetry if passed
     */
    protected buildOauthClientConfiguration(authority: string, serverTelemetryManager?: ServerTelemetryManager, azureRegionConfiguration?: AzureRegionConfiguration): Promise<ClientConfiguration>;
    private getClientAssertion;
    /**
     * Generates a request with the default scopes & generates a correlationId.
     * @param authRequest - BaseAuthRequest for initialization
     */
    protected initializeBaseRequest(authRequest: Partial<BaseAuthRequest>): BaseAuthRequest;
    /**
     * Initializes the server telemetry payload
     * @param apiId - Id for a specific request
     * @param correlationId - GUID
     * @param forceRefresh - boolean to indicate network call
     */
    protected initializeServerTelemetryManager(apiId: number, correlationId: string, forceRefresh?: boolean): ServerTelemetryManager;
    /**
     * Create authority instance. If authority not passed in request, default to authority set on the application
     * object. If no authority set in application object, then default to common authority.
     * @param authorityString - authority from user configuration
     */
    private createAuthority;
}
/**
 * This class is to be used to acquire tokens for public client applications (desktop, mobile). Public client applications
 * are not trusted to safely store application secrets, and therefore can only request tokens in the name of an user.
 * @public
 */
declare class PublicClientApplication extends ClientApplication implements IPublicClientApplication {
    /**
     * Important attributes in the Configuration object for auth are:
     * - clientID: the application ID of your application. You can obtain one by registering your application with our Application registration portal.
     * - authority: the authority URL for your application.
     *
     * AAD authorities are of the form https://login.microsoftonline.com/\{Enter_the_Tenant_Info_Here\}.
     * - If your application supports Accounts in one organizational directory, replace "Enter_the_Tenant_Info_Here" value with the Tenant Id or Tenant name (for example, contoso.microsoft.com).
     * - If your application supports Accounts in any organizational directory, replace "Enter_the_Tenant_Info_Here" value with organizations.
     * - If your application supports Accounts in any organizational directory and personal Microsoft accounts, replace "Enter_the_Tenant_Info_Here" value with common.
     * - To restrict support to Personal Microsoft accounts only, replace "Enter_the_Tenant_Info_Here" value with consumers.
     *
     * Azure B2C authorities are of the form https://\{instance\}/\{tenant\}/\{policy\}. Each policy is considered
     * its own authority. You will have to set the all of the knownAuthorities at the time of the client application
     * construction.
     *
     * ADFS authorities are of the form https://\{instance\}/adfs.
     */
    constructor(configuration: Configuration);
    /**
     * Acquires a token from the authority using OAuth2.0 device code flow.
     * This flow is designed for devices that do not have access to a browser or have input constraints.
     * The authorization server issues a DeviceCode object with a verification code, an end-user code,
     * and the end-user verification URI. The DeviceCode object is provided through a callback, and the end-user should be
     * instructed to use another device to navigate to the verification URI to input credentials.
     * Since the client cannot receive incoming requests, it polls the authorization server repeatedly
     * until the end-user completes input of credentials.
     */
    acquireTokenByDeviceCode(request: DeviceCodeRequest): Promise<AuthenticationResult | null>;
    /**
     * Acquires tokens with password grant by exchanging client applications username and password for credentials
     *
     * The latest OAuth 2.0 Security Best Current Practice disallows the password grant entirely.
     * More details on this recommendation at https://tools.ietf.org/html/draft-ietf-oauth-security-topics-13#section-3.4
     * Microsoft's documentation and recommendations are at:
     * https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-authentication-flows#usernamepassword
     *
     * @param request - UsenamePasswordRequest
     */
    acquireTokenByUsernamePassword(request: UsernamePasswordRequest): Promise<AuthenticationResult | null>;
}
/**
 *  This class is to be used to acquire tokens for confidential client applications (webApp, webAPI). Confidential client applications
 *  will configure application secrets, client certificates/assertions as applicable
 * @public
 */
declare class ConfidentialClientApplication extends ClientApplication implements IConfidentialClientApplication {
    /**
     * Constructor for the ConfidentialClientApplication
     *
     * Required attributes in the Configuration object are:
     * - clientID: the application ID of your application. You can obtain one by registering your application with our application registration portal
     * - authority: the authority URL for your application.
     * - client credential: Must set either client secret, certificate, or assertion for confidential clients. You can obtain a client secret from the application registration portal.
     *
     * In Azure AD, authority is a URL indicating of the form https://login.microsoftonline.com/\{Enter_the_Tenant_Info_Here\}.
     * If your application supports Accounts in one organizational directory, replace "Enter_the_Tenant_Info_Here" value with the Tenant Id or Tenant name (for example, contoso.microsoft.com).
     * If your application supports Accounts in any organizational directory, replace "Enter_the_Tenant_Info_Here" value with organizations.
     * If your application supports Accounts in any organizational directory and personal Microsoft accounts, replace "Enter_the_Tenant_Info_Here" value with common.
     * To restrict support to Personal Microsoft accounts only, replace "Enter_the_Tenant_Info_Here" value with consumers.
     *
     * In Azure B2C, authority is of the form https://\{instance\}/tfp/\{tenant\}/\{policyName\}/
     * Full B2C functionality will be available in this library in future versions.
     *
     * @param Configuration - configuration object for the MSAL ConfidentialClientApplication instance
     */
    constructor(configuration: Configuration);
    /**
     * Acquires tokens from the authority for the application (not for an end user).
     */
    acquireTokenByClientCredential(request: ClientCredentialRequest): Promise<AuthenticationResult | null>;
    /**
     * Acquires tokens from the authority for the application.
     *
     * Used in scenarios where the current app is a middle-tier service which was called with a token
     * representing an end user. The current app can use the token (oboAssertion) to request another
     * token to access downstream web API, on behalf of that user.
     *
     * The current middle-tier app has no user interaction to obtain consent.
     * See how to gain consent upfront for your middle-tier app from this article.
     * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-on-behalf-of-flow#gaining-consent-for-the-middle-tier-application
     */
    acquireTokenOnBehalfOf(request: OnBehalfOfRequest): Promise<AuthenticationResult | null>;
    private setClientCredential;
}
/**
 * @packageDocumentation
 * @module @azure/msal-node
 */
export { IPublicClientApplication, IConfidentialClientApplication, ITokenCache, PublicClientApplication, ConfidentialClientApplication, ClientApplication, Configuration, buildAppConfiguration, NodeAuthOptions, NodeSystemOptions, CacheOptions, ClientAssertion, TokenCache, NodeStorage, CacheKVStore, JsonCache, InMemoryCache, SerializedAccountEntity, SerializedIdTokenEntity, SerializedAccessTokenEntity, SerializedAppMetadataEntity, SerializedRefreshTokenEntity, CryptoProvider, AuthorizationCodeRequest, AuthorizationUrlRequest, ClientCredentialRequest, DeviceCodeRequest, OnBehalfOfRequest, UsernamePasswordRequest, RefreshTokenRequest, SilentFlowRequest, PromptValue, ResponseMode, AuthenticationResult, AccountInfo, ValidCacheType, AuthError, AuthErrorMessage, InteractionRequiredAuthError, ServerError, ClientAuthError, ClientAuthErrorMessage, ClientConfigurationError, ClientConfigurationErrorMessage, INetworkModule, NetworkRequestOptions, NetworkResponse, Logger, LogLevel, ProtocolMode, ICachePlugin, TokenCacheContext, ISerializableTokenCache };
