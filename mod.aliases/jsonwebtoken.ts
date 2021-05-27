import { create, Header, Payload } from "djwt";
export const sign = (
  payload: Payload,
  key: string,
  { header }: { header: Header },
) => create(header, payload, key);
