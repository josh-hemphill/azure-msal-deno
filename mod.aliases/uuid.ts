import { v4 as uuid4 } from "uuidStd";
type gen = () => string;
type val = (s: string) => boolean;
const _uuid4: ({ generate?: gen; validate?: val }) & gen = uuid4.generate;
_uuid4.generate = uuid4.generate;
_uuid4.validate = uuid4.validate;

export const v4 = _uuid4;
