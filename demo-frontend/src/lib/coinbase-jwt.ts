import sodium from 'libsodium-wrappers';
import base64url from 'base64url';
import crypto from 'crypto';

interface JwtPayload {
  iss: string;
  nbf: number;
  exp: number;
  sub: string;
  uri: string;
}

interface Encoded {
  headerAndPayloadBase64URL: string;
  keyBuf: Buffer;
}

function encode(payload: JwtPayload, key: string, alg: string, keyName: string): Encoded {
  const header = {
    typ: 'JWT',
    alg,
    kid: keyName,
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  const headerBase64URL = base64url(JSON.stringify(header));
  const payloadBase64URL = base64url(JSON.stringify(payload));
  const headerAndPayloadBase64URL = `${headerBase64URL}.${payloadBase64URL}`;
  const keyBuf = Buffer.from(key, 'base64');

  return { headerAndPayloadBase64URL, keyBuf };
}

export async function generateJWT(
  method: string,
  host: string,
  path: string,
  apiKeyName: string,
  privateKey: string
): Promise<string> {
  await sodium.ready;
  
  const payload: JwtPayload = {
    iss: 'cdp',
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 120,
    sub: apiKeyName,
    uri: `${method} ${host}${path}`,
  };

  const { headerAndPayloadBase64URL, keyBuf } = encode(payload, privateKey, 'EdDSA', apiKeyName);
  const signature = sodium.crypto_sign_detached(headerAndPayloadBase64URL, keyBuf);
  const signatureBase64url = base64url(Buffer.from(signature));

  return `${headerAndPayloadBase64URL}.${signatureBase64url}`;
}

export async function createAuthHeaders(
  method: string,
  host: string,
  path: string,
  apiKeyName: string,
  privateKey: string
): Promise<{ Authorization: string }> {
  const token = await generateJWT(method, host, path, apiKeyName, privateKey);
  return {
    Authorization: `Bearer ${token}`
  };
}