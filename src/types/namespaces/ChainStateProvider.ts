export type Response<S> = S | Promise<S>;

export interface IChainStateService {
  buildTransaction<Q, S>(req: Q): Response<S>;
  hashForSignature<Q, S>(req: Q): Response<S>;
  signTransaction<Q, S>(req: Q): Response<S>;
}
