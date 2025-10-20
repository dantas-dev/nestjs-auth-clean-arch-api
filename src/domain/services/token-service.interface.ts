export type TokenPayload = {
  sub: number;
  email: string;
  type: 'access' | 'refresh';
};

export interface ITokenService {
  sign(payload: TokenPayload): string;
  signRefresh(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}
