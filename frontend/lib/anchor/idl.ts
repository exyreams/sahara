import { PublicKey } from "@solana/web3.js";
import idl from "./saharasol_core.json";

export const PROGRAM_ID = new PublicKey(idl.address);
export const IDL = idl;

export type SaharasolCore = typeof idl;
