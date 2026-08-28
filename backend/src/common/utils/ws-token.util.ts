/** Handshake Socket.IO : source du token (auth.token ou header Authorization) */
export interface WsHandshake {
  auth?: { token?: string };
  headers?: { authorization?: string };
}

/**
 * Extrait le JWT d'un handshake Socket.IO.
 * Sources supportées (dans l'ordre) :
 *  - handshake.auth.token  (socket.io-client : `auth: { token }`)
 *  - header Authorization: Bearer <token>
 */
export function extractWsToken(handshake: WsHandshake): string | undefined {
  return (
    handshake.auth?.token ??
    handshake.headers?.authorization?.replace('Bearer ', '')
  );
}
