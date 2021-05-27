import { config as ENV } from "https://deno.land/x/dotenv/mod.ts";
import {
  Application,
  RouteParams,
  Router,
} from "https://deno.land/x/oak/mod.ts";

import * as msal from "../mod.ts";

const SETTINGS = ENV({ safe: true });

const SERVER_PORT = parseInt(SETTINGS["PORT"]) || 3000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const REDIRECT_URL = `${SERVER_URL}/redirect`;

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// Before running the sample, you will need to replace the values in the config,
// including the clientSecret
const config: msal.Configuration = {
  auth: {
    clientId: "e36a8099-5f5d-45ee-a453-f00ddf2c3e7a",
    authority:
      "https://login.microsoftonline.com/c9bd7e43-7aa8-4548-851d-745dc0f747f3",
    clientSecret: SETTINGS["TEST_MSAL_SECRET"],
  },
  system: {
    loggerOptions: {
      loggerCallback(
        _logLevel: unknown,
        message: string,
        _containsPii: unknown,
      ) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: msal.LogLevel.Verbose,
    },
  },
};

// Create msal application object
const pca = new msal.ConfidentialClientApplication(config);

const pkceCodes = {
  challengeMethod: "S256", // Use SHA256 Algorithm
  verifier: "", // Generate a code verifier for the Auth Code Request first
  challenge: "", // Generate a code challenge from the previously generated code verifier
};

const _app = new Application({
  state: {
    pkceCodes,
  },
});
const app = new Router<RouteParams, { pkceCodes: typeof pkceCodes }>();

/**
 * Proof Key for Code Exchange (PKCE) Setup
 *
 * MSAL enables PKCE in the Authorization Code Grant Flow by including the codeChallenge and codeChallengeMethod parameters
 * in the request passed into getAuthCodeUrl() API, as well as the codeVerifier parameter in the
 * second leg (acquireTokenByCode() API).
 *
 * MSAL Node provides PKCE Generation tools through the CryptoProvider class, which exposes
 * the generatePkceCodes() asynchronous API. As illustrated in the example below, the verifier
 * and challenge values should be generated previous to the authorization flow initiation.
 *
 * For details on PKCE code generation logic, consult the
 * PKCE specification https://tools.ietf.org/html/rfc7636#section-4
 */

app.get("/", async ({ response }) => {
  const authCodeUrlParameters = {
    scopes: ["user.read"],
    redirectUri: REDIRECT_URL,
  };
  // get url to sign user in and consent to scopes needed for application
  await pca.getAuthCodeUrl(authCodeUrlParameters).then((res) => {
    response.redirect(res);
  }).catch((error) => console.log(JSON.stringify(error)));

  /* // Initialize CryptoProvider instance
  const cryptoProvider = new msal.CryptoProvider();
  // Generate PKCE Codes before starting the authorization flow
  await cryptoProvider.generatePkceCodes().then(({ verifier, challenge }) => {
    // Set generated PKCE Codes as app variables
    pkceCodes.verifier = verifier;
    pkceCodes.challenge = challenge;

    console.dir(pkceCodes);

    // Add PKCE code challenge and challenge method to authCodeUrl request object
    const authCodeUrlParameters: msal.AuthorizationUrlRequest = {
      scopes: ["user.read"],
      redirectUri: REDIRECT_URL,
      codeChallenge: pkceCodes.challenge, // PKCE Code Challenge
      codeChallengeMethod: pkceCodes.challengeMethod, // PKCE Code Challenge Method
    };

    // Get url to sign user in and consent to scopes needed for application
    return pca.getAuthCodeUrl(authCodeUrlParameters).then((res) => {
      console.dir(res);
      response.redirect(res);
    }).catch((error) => console.log(JSON.stringify(error)));
  }); */
});

app.get("/redirect", async ({ request, response }) => {
  const tokenRequest = {
    code: request.url.searchParams.get("code") || "",
    scopes: ["user.read"],
    redirectUri: REDIRECT_URL,
  };

  await pca.acquireTokenByCode(tokenRequest).then((res) => {
    console.log("\nResponse: \n:", res);
    response.body = "sucess";
  }).catch((error) => {
    console.log(error);
    response.status = 500;
    response.body = error;
  });

  /* // Add PKCE code verifier to token request object
  const tokenRequest: msal.AuthorizationCodeRequest = {
    code: request.url.searchParams.get("code") || "",
    scopes: ["user.read"],
    redirectUri: REDIRECT_URL,
    codeVerifier: pkceCodes.verifier, // PKCE Code Verifier
  };
  console.dir(tokenRequest);
  await pca.acquireTokenByCode(tokenRequest).then((res) => {
    console.log("\nResponse: \n:", res);
    response.body = "Success";
  }).catch((error) => {
    console.log(error);
    response.status = 500;
  }); */
});
_app.use(app.routes());
_app.use(app.allowedMethods());
await _app.listen({ port: SERVER_PORT });
console.log(
  `Msal Node Auth Code Sample app listening on port ${SERVER_PORT}!`,
);
